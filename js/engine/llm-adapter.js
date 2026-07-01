/* ============================================================
   Adaptateur LLM (optionnel) — pour un rendu de conversation encore
   plus riche via un vrai modèle (Claude). PAR DÉFAUT DÉSACTIVÉ.
   ------------------------------------------------------------
   ⚠️ Sécurité : ne JAMAIS mettre une clé API en clair dans une app
   front livrée. En prod, on passe par un petit backend proxy qui
   détient la clé et applique le rate-limiting. Ici on expose juste
   l'interface : si `endpoint` est configuré, le moteur l'appelle ;
   sinon il retombe sur le générateur procédural (100% offline).
   ============================================================ */

const CONFIG_KEY = "meow.llm.config";

export function getLLMConfig(){
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || "null"); }
  catch { return null; }
}
export function setLLMConfig(cfg){ localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); }
export function llmEnabled(){ const c = getLLMConfig(); return !!(c && c.endpoint); }

/* Construit le prompt système : c'est ici que vit la "personnalité cute".
   Le backend proxy peut l'envoyer tel quel à Claude (modèle conseillé :
   claude-haiku-4-5 pour la vitesse/coût, claude-sonnet-5 pour la finesse). */
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
        model: cfg.model || "claude-haiku-4-5-20251001",
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
