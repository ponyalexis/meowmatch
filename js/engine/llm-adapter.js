/* ============================================================
   Adaptateur LLM (optionnel) — pour un rendu de conversation encore
   plus riche via un vrai modèle (Claude). PAR DÉFAUT DÉSACTIVÉ.
   ------------------------------------------------------------
   ⚠️ Sécurité : ne JAMAIS mettre une clé API en clair dans une app
   front livrée. En prod, on passe par un petit backend proxy qui
   détient la clé et applique le rate-limiting. Ici on expose juste
   l'interface : si `endpoint` est configuré, le moteur l'appelle ;
   sinon il retombe sur le générateur procédural (100% offline).

   Deux usages :
     • generateViaLLM     -> conversation AUTO chat↔chat (mode "regarder")
     • generateDialogTurn -> tour du dialogue à CHOIX du joueur : le modèle
                             renvoie la relance du chat + 3 à 4 choix taggés
                             (beat + intensité) que le moteur applique ensuite.
   Modèle conseillé : claude-opus-4-8 (finesse). Pour réduire coût/latence :
   claude-haiku-4-5 ou claude-sonnet-5 (à régler côté proxy / config).
   ============================================================ */

const CONFIG_KEY = "meow.llm.config";

export function getLLMConfig(){
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || "null"); }
  catch { return null; }
}
export function setLLMConfig(cfg){ localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); }
export function llmEnabled(){ const c = getLLMConfig(); return !!(c && c.endpoint); }

/* Beats/intensités que le moteur sait interpréter (affinité). Le modèle DOIT
   s'y tenir pour que l'impact relationnel reste cohérent et nuancé. */
export const BEATS = ["charm","play","tease","food","brag","aloof","sincere","cheeky"];
export const TOPICS_HINT = ["food","nap","play","territory","humans","outside","flirt","fears","dreams"];

/* ---- Contexte "monde réel", calculé côté client (gratuit, hors-ligne) ----
   Permet au modèle de glisser des références actuelles (saison, moment de la
   journée, fête proche…). La météo réelle est un champ OPTIONNEL : si tu
   branches une source (ex. Open-Meteo + géoloc), passe-la dans `weather`. */
export function worldContext(now = new Date(), extra = {}){
  const m = now.getMonth(), h = now.getHours();
  const season = m<=1||m===11 ? "hiver" : m<=4 ? "printemps" : m<=7 ? "été" : "automne";
  const daypart = h<6 ? "nuit" : h<11 ? "matin" : h<14 ? "midi" : h<18 ? "après-midi" : h<22 ? "soirée" : "nuit";
  const fr = new Intl.DateTimeFormat("fr-FR", { weekday:"long", day:"numeric", month:"long" }).format(now);
  return {
    date: fr, season, daypart,
    weekday: new Intl.DateTimeFormat("fr-FR",{weekday:"long"}).format(now),
    weather: extra.weather || null,          // ex. "grand soleil, 28°C" si dispo
    city: extra.city || "Paris",
    ...extra
  };
}

function worldLine(ctx){
  if(!ctx) return "";
  const bits = [`On est ${ctx.date} (${ctx.season}), c'est le ${ctx.daypart}`];
  if(ctx.weather) bits.push(`météo à ${ctx.city} : ${ctx.weather}`);
  return `Contexte réel (à évoquer avec naturel, sans forcer) : ${bits.join(" · ")}.`;
}

/* Construit le prompt système : c'est ici que vit la "personnalité cute". */
export function buildSystemPrompt(catA, catB, affinity){
  return [
    "Tu écris une conversation adorable entre DEUX chats sur une app de rencontre.",
    "Les chats parlent en français, ton mignon mais jamais niais ni forcé.",
    "Style : miaous occasionnels, actions entre *astérisques*, emojis avec parcimonie,",
    "parfois une 'faute de patte' sur le clavier. Réponses courtes (1-2 phrases).",
    `Chat A = ${catA.name} (${catA.archetype.label}, ${catA.personality.join(', ')}).`,
    `Chat B = ${catB.name} (${catB.archetype.label}, ${catB.personality.join(', ')}).`,
    `Niveau de complicité actuel : ${affinity}/100 (plus c'est haut, plus c'est tendre).`,
    "Rends chaque message sur sa propre ligne, préfixé par 'A:' ou 'B:'."
  ].join(" ");
}

/* Prompt système du DIALOGUE À CHOIX : le chat B (celui d'en face) parle et
   propose au joueur (chat A) 3 à 4 réponses possibles, couvrant un SPECTRE
   d'intensités, chacune taggée d'un beat et d'une intensité 1..3. */
export function buildChoiceSystemPrompt(myCat, cat, state, ctx){
  return [
    "Tu es le moteur d'un jeu de drague féline. Le joueur incarne un chat et discute avec un autre chat sur une app de rencontre.",
    `LE CHAT D'EN FACE : ${cat.name} — ${cat.archetype?.label || ""}, tempérament : ${(cat.personality||[]).join(", ")}. Exigeant : ${cat.pickiness}/100.`,
    `LE CHAT DU JOUEUR : ${myCat.name} — ${myCat.archetype?.label || ""}.`,
    `Complicité actuelle : ${state.affinity}/100.`,
    worldLine(ctx),
    "À CHAQUE tour, produis :",
    "  1) `ai` : ce que dit le chat d'en face — 1 à 2 phrases, ton mignon, actions entre *astérisques*, emojis avec parcimonie, français. Il RÉAGIT à la dernière réplique du joueur puis relance sur un sujet lié (croquettes, sieste, jeu, territoire, humains, dehors, flirt, peurs, rêves… ou une vraie référence d'actualité).",
    "  2) `choices` : 3 ou 4 réponses possibles pour le JOUEUR, CONTEXTUELLES au message. Elles doivent COUVRIR un spectre d'intensités : au moins une posée (int 1) et une audacieuse (int 3).",
    "Chaque choix = { beat, int, label, line } où :",
    `  - beat ∈ [${BEATS.join(", ")}] (angle relationnel),`,
    "  - int ∈ 1 (tout en douceur, pas sûr), 2 (franc), 3 (audacieux, gros pari),",
    "  - label : 2-4 mots pour le bouton,",
    "  - line : la réplique complète que dira le chat du joueur.",
    "Varie les beats entre les choix. Réponds UNIQUEMENT en JSON strict : { \"ai\": string, \"topic\": string, \"choices\": [{beat,int,label,line}, ...] }."
  ].filter(Boolean).join("\n");
}

/* Appel réseau vers TON proxy. Format de réponse attendu :
   { messages: [{ from: 'A'|'B', text: string }, ...] }
   Retourne null en cas d'échec -> le moteur procédural prend le relais. */
export async function generateViaLLM(catA, catB, affinity, history, count){
  const cfg = getLLMConfig();
  if(!cfg || !cfg.endpoint) return null;
  try {
    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.model || "claude-opus-4-8",
        system: buildSystemPrompt(catA, catB, affinity),
        history, count
      })
    });
    if(!res.ok) return null;
    const data = await res.json();
    if(!Array.isArray(data.messages)) return null;
    return data.messages.map(m => ({
      fromId: m.from === 'A' ? catA.id : catB.id,
      text: m.text, beat: "llm", tplKey: null, ts: null
    }));
  } catch { return null; }
}

/* Génère UN tour de dialogue à choix via le proxy.
   `history` : [{ from:'me'|'cat', text }]. `ctx` : worldContext().
   Retour : { aiText, topic, choices:[{beat,int,label,line}] } ou null (fallback). */
export async function generateDialogTurn(myCat, cat, state, history, ctx){
  const cfg = getLLMConfig();
  if(!cfg || !cfg.endpoint) return null;
  try {
    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "choice-turn",
        model: cfg.model || "claude-opus-4-8",
        system: buildChoiceSystemPrompt(myCat, cat, state, ctx),
        history,
        context: ctx
      })
    });
    if(!res.ok) return null;
    const data = await res.json();
    const turn = normalizeTurn(data);
    return turn && turn.choices.length >= 3 ? turn : null;
  } catch { return null; }
}

/* Robustesse : accepte { ai, choices } ou { message, choices }, filtre/assainit
   les beats et intensités hors périmètre pour ne jamais casser le moteur. */
function normalizeTurn(data){
  if(!data) return null;
  const aiText = data.ai || data.message || data.text;
  const raw = Array.isArray(data.choices) ? data.choices : null;
  if(!aiText || !raw) return null;
  const choices = raw.map(c => ({
    beat: BEATS.includes(c.beat) ? c.beat : "sincere",
    int: [1,2,3].includes(c.int) ? c.int : 2,
    label: String(c.label || "Répondre").slice(0, 40),
    line: String(c.line || c.label || "…").slice(0, 240)
  })).filter(c => c.line).slice(0, 4);
  const topic = TOPICS_HINT.includes(data.topic) ? data.topic : null;
  return { aiText: String(aiText).slice(0, 400), topic, choices };
}
