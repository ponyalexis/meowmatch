/* ============================================================
   MeowMatch — Moteur de conversation féline (le "gen AI cute")
   ------------------------------------------------------------
   Principe :
   - Deux agents-chats discutent tour à tour.
   - Chaque chat a un "persona" (stats + humeur) qui pondère ce qu'il dit.
   - Le dialogue avance par "beats" (intentions) enchaînés selon un arc
     narratif : reniflage → curiosité → jeu/flirt → complicité → tendresse.
   - Le rendu "parle chat" : ronrons, actions en *italique*, miaous, typos
     de chat qui marche sur le clavier, emojis — mignon mais jamais forcé.
   - Apprentissage : chaque message est étiqueté (beat + template). Les
     réactions de l'utilisateur (❤️ 😹 👎) ajustent des poids stockés en
     local. À la longue, le moteur privilégie ce qui fait rire / attendrit.
   - Un adaptateur LLM optionnel (llm-adapter.js) peut prendre le relais
     pour un rendu encore plus riche ; sinon le moteur procédural suffit.
   ============================================================ */

import { RNG, hashStr } from "../rng.js";

/* ---- Bibliothèque de répliques, organisée par beat ----
   Chaque template peut contenir :
   {name}=nom du partenaire, {self}=son propre nom, {food},{toy},{spot} tirés
   de ses favoris. Les *…* deviennent des actions stylisées.               */
const LINES = {
  greet: [
    "*renifle prudemment* Miaou. Tu sens le {food}, ça me plaît déjà.",
    "Oh. Un nouveau museau. *cligne des yeux lentement* Salut {name}.",
    "*queue en point d'interrogation* T'es réel·le ou t'es un reflet sur le mur ?",
    "Bonjouuur 🐾 J'étais en pleine sieste, mais pour toi je me réveille (un peu).",
    "*s'approche puis fait genre de rien* ... tiens, {name}. Ça va tes coussins ?"
  ],
  sniff: [
    "*tourne autour de toi trois fois* Bon. Verdict : tu me plais bien.",
    "Attends, je te sniffe le temps de décider si on est amis. ...ok on est amis.",
    "*museau contre museau* Tu as le nez froid, c'est bon signe.",
    "Je peux sentir ta patte gauche ? Question de sécurité, tu comprends."
  ],
  curious: [
    "Dis, c'est vrai que chez toi le radiateur reste allumé tout l'hiver ? 🥺",
    "T'es plutôt team {spot} ou team dessus-du-frigo ?",
    "Raconte : t'as déjà réussi à ouvrir un placard tout·e seul·e ?",
    "Question importante : les pigeons de {name}, ils sont dodus chez toi ?",
    "*penche la tête* Tu ronronnes fort toi ? Moi c'est niveau tondeuse."
  ],
  brag: [
    "Hier j'ai fait tomber un verre PILE quand l'humain regardait. Chef-d'œuvre.",
    "Je tiens 22 secondes dans un carton trop petit. Record de l'immeuble.",
    "*fier·e* J'ai attrapé une mouche. En vol. Ne me remercie pas.",
    "Mon humain croit que c'est SON lit. *rire de chat* Adorable.",
    "J'ai un genou attitré. Personne ne s'y assoit à part moi."
  ],
  flirt: [
    "*cligne des yeux tout doucement* ... tu sais ce que ça veut dire chez nous ?",
    "Je te partagerais bien la moitié de mon rayon de soleil, moi.",
    "Ta fourrure a l'air super douce sur cette 3e photo, j'avoue.",
    "On pourrait faire la sieste dos à dos un jour. Enfin, si tu ronronnes juste.",
    "*pose délicatement une patte sur la tienne* ... on est bien là, non ?"
  ],
  play: [
    "*sort la canne à plumes des yeux* On se fait une chasse au {toy} ?!",
    "PSCHIT. J'ai vu un point rouge. C'était pas toi ? *court en rond*",
    "Je te parie que je grimpe au rideau plus vite que toi. 🐾💨",
    "*se met en position de chasse* Bouge pas... BOUGE PAS... *bondit* raté.",
    "3h du matin, toi, moi, un couloir. Rodéo ?"
  ],
  food: [
    "Bon on va être honnêtes : tu manges quoi le matin ? C'est important pour nous.",
    "Moi c'est {food}, sinon je boude. *regard dramatique vers la gamelle*",
    "T'as déjà volé un truc sur le plan de travail ? Confesse.",
    "*entend un sachet au loin* ...attends deux secondes je reviens. FAUSSE ALERTE.",
    "Si tu partages tes croquettes, je crois que je t'aime déjà. 😽"
  ],
  nap: [
    "*bâille énooormément* Pardon. Tu disais ? Je me réveillais d'une sieste de 4h.",
    "On devrait faire une sieste ensemble. Je prends le côté chaud, ok ?",
    "Je connais un rebord de fenêtre parfait à {spot}. Soleil garanti de 14h à 16h.",
    "*se roule en croissant* Réveille-moi si y'a du {food}.",
    "16h de sommeil c'est le minimum syndical, on est d'accord ?"
  ],
  jealous: [
    "*queue qui bat* ...t'as parlé à qui d'autre aujourd'hui exactement ?",
    "Le chat roux du 2e t'a liké ? *feulement discret* Mmh.",
    "Je suis pas jaloux·se. *renverse ta gamelle imaginaire* C'était le vent.",
    "Juste pour info : le canapé, c'est mon territoire. On partagera. Peut-être."
  ],
  tease: [
    "*te pique ton coussin puis fait l'innocent·e* Quel coussin ? 😼",
    "T'as vraiment peur de l'aspirateur ? ...moi aussi. On dira rien.",
    "*te met un petit coup de patte sur le nez* Boop. Voilà, c'était nécessaire.",
    "Je t'ai vu·e rater ton saut tout à l'heure. C'était magnifique. 😹"
  ],
  tender: [
    "*se blottit contre toi et ronronne* ...on reste comme ça un moment ?",
    "Tu sais quoi ? T'es mon humain préféré. Enfin, mon chat préféré. Tu vois l'idée.",
    "*lèche délicatement le haut de ta tête* Voilà. T'es à moi maintenant.",
    "Je crois que mon ronronnement s'est calé sur le tien. C'est bizarre et c'est doux.",
    "Reste. Le radiateur est assez grand pour deux. 💛"
  ],
  bored: [
    "*fixe le mur* ...il se passe rien mais je fais semblant d'être fascné·e.",
    "Bon. J'ai fait le tour de l'appart 12 fois. Tu proposes quoi ?",
    "*pousse un stylo dans le vide très lentement en te regardant* ...oups.",
    "Zzz. Oh pardon. Tu as encore de l'énergie toi ?"
  ],
  keysmash: [
    "*marche sur le clavier* mkljsdfaoiu MIAOU pardon c'était ma patte",
    "asdkljh ... *repousse le téléphone* laisse, je gère la conversation.",
    "88888888 *s'assoit sur l'écran* voilà mon avis sur la question."
  ]
};

// Arc de conversation : suites de beats probables selon l'affinité.
// À faible affinité on reste dans la découverte ; à forte affinité on va vers la tendresse.
const BEAT_FLOW = {
  cold:  ["sniff","curious","brag","food","tease","bored","play"],
  warm:  ["curious","play","food","flirt","brag","tease","nap","keysmash"],
  hot:   ["flirt","play","tender","nap","tease","jealous","food"]
};

// Étiquette d'humeur affichée en tête de conv.
export function moodTag(affinity){
  if(affinity < 30) return "Ils se reniflent encore… 👀";
  if(affinity < 55) return "Ça ronronne doucement 🐾";
  if(affinity < 78) return "Sérieusement mignon 😽";
  return "Amour de chat confirmé 💛";
}

/* ---- Compatibilité entre deux chats (0-100) ----
   On combine complémentarité (jeu/paresse) et similarité (affection, bavardage). */
export function compatibility(a, b){
  const s = k => 100 - Math.abs(a.stats[k] - b.stats[k]);      // similarité
  const affection = s('affection');
  const chat = s('chattiness');
  const play = 100 - Math.abs((a.stats.playfulness) - (b.stats.playfulness))*0.6;
  const curio = s('curiosity');
  // bonus même quartier
  const same = a.neighborhood === b.neighborhood ? 8 : 0;
  const score = Math.round((affection*0.35 + chat*0.2 + play*0.25 + curio*0.2) + same);
  return Math.max(8, Math.min(100, score));
}

function tierFor(affinity){
  if(affinity < 38) return "cold";
  if(affinity < 68) return "warm";
  return "hot";
}

function styliseActions(text){
  // *action* -> span action (traité côté rendu). Ici on garde le markup *…*.
  return text.trim();
}

function fillTemplate(tpl, self, other){
  const fav = self.favorites || {};
  return tpl
    .replace(/\{name\}/g, other.name)
    .replace(/\{self\}/g, self.name)
    .replace(/\{food\}/g, fav.food || "thon")
    .replace(/\{toy\}/g, fav.toy || "la balle en alu")
    .replace(/\{spot\}/g, fav.spot || "le radiateur");
}

// Clé d'apprentissage stable pour un template donné.
function tplKey(beat, tpl){ return beat + ":" + (hashStr(tpl) % 100000); }

/* ---- Sélection pondérée d'un template ----
   poids = base(1) * biais_persona(beat) * poids_appris(mémoire).            */
function pickLine(beat, self, rng, memory){
  const pool = LINES[beat] || LINES.curious;
  const weights = pool.map(tpl => {
    const key = tplKey(beat, tpl);
    const learned = (memory.templateScores && memory.templateScores[key]) || 1;
    const personaBias = personaBiasForBeat(beat, self);
    return Math.max(0.05, learned * personaBias);
  });
  const total = weights.reduce((a,b)=>a+b,0);
  let r = rng.float() * total;
  for(let i=0;i<pool.length;i++){ r -= weights[i]; if(r<=0) return { tpl: pool[i], key: tplKey(beat, pool[i]) }; }
  return { tpl: pool[0], key: tplKey(beat, pool[0]) };
}

function personaBiasForBeat(beat, cat){
  const s = cat.stats;
  const map = {
    play: 0.5 + s.playfulness/120,
    nap: 0.5 + s.laziness/120,
    tender: 0.5 + s.affection/120,
    flirt: 0.5 + s.affection/130,
    curious: 0.5 + s.curiosity/120,
    food: 0.6 + (100-s.independence)/200,
    brag: 0.5 + s.independence/140,
    keysmash: 0.4 + s.chattiness/150,
    bored: 0.5 + s.laziness/160,
    jealous: 0.4 + s.affection/200
  };
  return map[beat] || 1;
}

/* ---- Choix du prochain beat selon l'arc + un peu de hasard ---- */
function nextBeat(prevBeat, affinity, rng, turnIndex){
  const flow = BEAT_FLOW[tierFor(affinity)];
  // Ouverture toujours douce
  if(turnIndex === 0) return "greet";
  if(turnIndex === 1) return "sniff";
  // Éviter de répéter deux fois le même beat d'affilée
  let beat;
  let guard = 0;
  do { beat = rng.pick(flow); guard++; } while(beat === prevBeat && guard < 5);
  // pincée de chaos mignon
  if(rng.bool(0.08)) beat = "keysmash";
  return beat;
}

/* ============================================================
   API publique
   ============================================================ */

// Construit un message unique (objet). Ne touche pas au store.
export function buildMessage({ speaker, listener, beat, seed, memory }){
  const rng = new RNG(seed);
  const { tpl, key } = pickLine(beat, speaker, rng, memory);
  const text = styliseActions(fillTemplate(tpl, speaker, listener));
  return { fromId: speaker.id, beat, tplKey: key, text, ts: null };
}

// Génère `count` prochains messages pour une conversation (arc auto).
// `state` = { affinity, turnIndex, lastBeat, lastSpeakerId }
export function generateTurns({ catA, catB, count, state, memory }){
  const out = [];
  let { affinity = compatibility(catA, catB), turnIndex = 0, lastBeat = null, lastSpeakerId = null } = state || {};
  for(let i=0;i<count;i++){
    // Alternance des locuteurs, avec petite chance qu'un chat "enchaîne".
    const rngPick = new RNG(hashStr(catA.id + catB.id) + turnIndex * 101 + i);
    let speaker, listener;
    if(lastSpeakerId == null){ speaker = turnIndex % 2 === 0 ? catA : catB; }
    else if(rngPick.bool(0.18)){ speaker = lastSpeakerId === catA.id ? catA : catB; } // double message
    else { speaker = lastSpeakerId === catA.id ? catB : catA; }
    listener = speaker.id === catA.id ? catB : catA;

    const beat = nextBeat(lastBeat, affinity, rngPick, turnIndex);
    const seed = hashStr(catA.id + catB.id + speaker.id) + turnIndex * 7 + i * 13;
    const msg = buildMessage({ speaker, listener, beat, seed, memory });

    // L'affinité évolue : les beats tendres/joueurs la font monter, la jalousie la freine un peu.
    const delta = ({ tender:5, flirt:4, play:3, nap:2, food:2, tease:1, curious:1, brag:0, sniff:1, greet:1, bored:-1, jealous:-2, keysmash:1 })[beat] ?? 0;
    affinity = Math.max(5, Math.min(100, affinity + delta * (0.6 + rngPick.float()*0.8)));

    out.push(msg);
    lastBeat = beat; lastSpeakerId = speaker.id; turnIndex++;
  }
  return { messages: out, state: { affinity: Math.round(affinity), turnIndex, lastBeat, lastSpeakerId } };
}

/* ---- Apprentissage : mise à jour des poids depuis une réaction ----
   reaction ∈ { love:+, funny:+, meh:- }. On borne pour éviter l'emballement. */
export function learnFromReaction(memory, tplKey, reaction){
  memory.templateScores = memory.templateScores || {};
  const cur = memory.templateScores[tplKey] || 1;
  const factor = reaction === 'love' ? 1.35 : reaction === 'funny' ? 1.25 : 0.7;
  memory.templateScores[tplKey] = Math.max(0.15, Math.min(6, cur * factor));
  memory.reactionsCount = (memory.reactionsCount || 0) + 1;
  return memory;
}

// Résumé "ce que le moteur a appris" (pour l'écran profil — montre que ça évolue).
export function learningSummary(memory){
  const scores = memory.templateScores || {};
  const entries = Object.entries(scores);
  const liked = entries.filter(([,v]) => v > 1.2).length;
  const total = entries.length || 0;
  return {
    reactions: memory.reactionsCount || 0,
    tunedLines: liked,
    tracked: total,
    // niveau ludique qui augmente avec les interactions
    level: Math.floor(Math.sqrt((memory.reactionsCount||0)) ) + 1
  };
}
