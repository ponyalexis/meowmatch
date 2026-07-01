/* ============================================================
   MeowMatch — Moteur de dialogue à CHOIX, threadé par SUJETS
   ------------------------------------------------------------
   Chaque message du chat d'en face porte sur un SUJET (croquettes, sieste,
   territoire, humains, dehors, flirt, peurs, rêves…). Les choix proposés
   (TOUJOURS 3, parfois 4) sont des réponses CONTEXTUELLES à ce sujet, choisies
   pour COUVRIR UN SPECTRE d'intensités (posé → audacieux) : chacun a donc un
   impact NUANCÉ et PROGRESSIF sur la relation (petit pas sûr vs. gros pari).
   La relance de l'IA réagit à ta réponse PUIS enchaîne sur un sujet lié.
   Les tempéraments (dont "durs de la feuille") pilotent l'affinité/patience,
   et l'arbre peut mener à 💛 âme sœur ou 🙈 blocage.

   Si un ADAPTATEUR LLM est branché (proxy configuré), le tour peut être piloté
   par un vrai modèle pour un spectre de conversations bien plus large + des
   références actuelles (saison, météo…). Sinon, tout ce fichier tourne 100%
   hors-ligne et sert de fallback.
   ============================================================ */

import { RNG, hashStr } from "../rng.js";
import { stylizeUserLine } from "./persona.js";

const BEAT_EMOJI = { charm:"😽", play:"🎾", tease:"😼", food:"🍤", brag:"💅", aloof:"🥱", sincere:"🥺", cheeky:"😾" };

/* Intensité d'un choix : 1 = posé/sûr, 2 = medium, 3 = audacieux/risqué.
   Sert d'étiquette UI ("l'audace du choix") ET de multiplicateur d'impact. */
export const INTENSITY_LABEL = { 1:"Tout en douceur", 2:"Franc", 3:"Audacieux" };
export const INTENSITY_DOT   = { 1:"•", 2:"••", 3:"•••" };

const GREETINGS = [
  "*s'approche, renifle prudemment* Miaou. Alors c'est toi, {me} ?",
  "Oh. Un nouveau museau. *cligne des yeux* Salut. Impressionne-moi.",
  "*queue en point d'interrogation* Bon. Tu vaux quoi, toi ?",
  "Tiens tiens. On m'a dit que tu ronronnais bien. Prouve-le. 😼"
];

/* Réactions à ta réponse, par valence — servent d'accroche AVANT la relance. */
const REACT = {
  pos: ["*ronronne* J'adore ta façon de voir les choses.", "Haha, on est sur la même longueur d'onde 😻", "*se rapproche* Tu me plais, toi.", "Mmh, très bonne réponse."],
  posPicky: ["...pas mal. Tu remontes dans mon estime.", "Tiens, tu m'étonnes agréablement.", "Ok, j'avoue, c'était bien joué."],
  neg: ["Hm, on n'est pas d'accord là-dessus.", "*fronce les moustaches* Pas convaincu·e.", "Ouille, mauvaise pioche.", "Mouais, bof."],
  negPicky: ["*soupir* Décevant.", "Non mais franchement… 🙄", "Tu peux mieux faire, crois-moi.", "*se détourne à demi* Bon."],
  neutral: ["Intéressant.", "Ok, je note.", "Mmh, on verra.", "Si tu le dis…"]
};

const BLOCK_LINES = [
  "*se lève, s'étire longuement, et disparaît sous le lit sans un dernier regard* 🙀",
  "« C'est un non définitif. » *quitte le rebord de la fenêtre, queue haute*",
  "*souffle une dernière fois, puis part bouder pour de bon dans l'autre pièce*"
];
const SOULMATE_LINES = [
  "*se love tout contre toi et cale son ronron sur le tien* …reste. 💛",
  "*pose délicatement une patte sur la tienne* Ok. Tu es mon chat préféré. Officiellement.",
  "Je crois que c'est ça, l'amour de chat. *ferme les yeux, comblé·e* 😻"
];

/* Petit rappel qui RÉAGIT à ton dernier geste (beat) -> le chat a l'air d'écouter,
   au lieu d'enchaîner une question générique. Placé ~1 fois sur 2. */
const CALLBACK = {
  charm:   ["*fait le gros dos, ravi·e*", "*ronronne un peu plus fort*"],
  play:    ["*bondit, tout excité·e*", "*fait mine de chasser ta queue*"],
  tease:   ["*rit sous ses moustaches*", "*te lance un regard en coin*"],
  food:    ["*se lèche déjà les babines*", "*l'estomac gargouille en écho*"],
  brag:    ["*lève un sourcil, impressionné·e malgré lui·elle*", "*fait semblant de ne pas être épaté·e*"],
  aloof:   ["*feint l'indifférence… mal*", "*détourne le regard, l'air de rien*"],
  sincere: ["*touché·e par ta franchise*", "*s'adoucit d'un coup*"],
  cheeky:  ["*plisse les yeux, amusé·e*", "*prend le défi très au sérieux*"]
};

/* ---- Les SUJETS de conversation ----
   openers  : ce que dit l'IA pour lancer/relancer le sujet
   responses: réponses contextuelles ; beat = angle/personnalité, int = intensité,
              line = réplique. Chaque sujet a AU MOINS un choix posé (int 1) et un
              audacieux (int 3) pour garantir un vrai contraste à chaque tour.
   links    : sujets vers lesquels enchaîner (le fil)                          */
const TOPICS = {
  food: {
    openers: [
      "Bon, LA vraie question : croquettes ou pâtée ? J'ai besoin de savoir. 🍤",
      "Je viens de finir ma gamelle et j'ai déjà faim. Toi aussi tu es un ventre sur pattes ?",
      "On m'a dit que tu volais parfois sur le plan de travail… c'est vrai ? 😼"
    ],
    responses: [
      { beat:"food",    int:1, label:"Partage la gourmandise", line:"Team pâtée en gelée, évidemment. Et je partagerais bien ma gamelle avec toi. 🍤" },
      { beat:"tease",   int:2, label:"Taquine son appétit",    line:"Toi, un ventre sur pattes ? Ça se voit un peu, non ? 😼" },
      { beat:"sincere", int:2, label:"Avoue ta faille",        line:"Honnêtement, je ferais n'importe quoi pour une crevette. C'est mon point faible. 🥺" },
      { beat:"brag",    int:3, label:"Frime tes exploits",     line:"Voler sur le plan de travail ? Amateur. Moi j'ouvre le placard tout·e seul·e. 💅" }
    ],
    links: ["nap","humans","territory"]
  },
  nap: {
    openers: [
      "J'hésite à faire ma 3e sieste de la journée. Tu dors combien d'heures, toi ?",
      "Le meilleur spot de l'appart pour dormir, c'est le radiateur. Débat clos. Tu contestes ?",
      "Une sieste à deux, un jour, ça te tenterait ? 😴"
    ],
    responses: [
      { beat:"charm",   int:1, label:"Propose un câlin-sieste", line:"Une sieste à deux, dos à dos sur le radiateur… j'en rêve déjà. 😻" },
      { beat:"play",    int:2, label:"Préfère l'action",        line:"Dormir ? Avec toute cette énergie ?! Viens plutôt courir dans le couloir ! 🎾" },
      { beat:"brag",    int:2, label:"Vante ton record",        line:"18h de sommeil par jour. Champion·ne de l'immeuble, sans forcer. 💅" },
      { beat:"aloof",   int:3, label:"Joue la solitaire",       line:"Je dors seul·e. Mon coussin, mes règles. On verra si tu mérites une exception. 🥱" }
    ],
    links: ["food","humans","dreams"]
  },
  play: {
    openers: [
      "Je viens de massacrer une balle en alu. Tu joues à quoi, toi ?",
      "Le laser rouge : chasse de l'année ou pire ennemi ? Position tranchée demandée. 🔴",
      "J'ai trop d'énergie là. Tu tiens le rythme ou tu abandonnes ? 😼"
    ],
    responses: [
      { beat:"charm",   int:1, label:"Joue la tendresse", line:"J'adorerais jouer, surtout si c'est avec toi. 😽" },
      { beat:"play",    int:2, label:"Relève le défi",    line:"Le laser, c'est ma Némésis ET mon grand amour. On chasse ensemble ? 🎾" },
      { beat:"tease",   int:2, label:"Nargue-le",         line:"Tenir le rythme ? Je vais te laisser sur place, mon grand. 😼" },
      { beat:"cheeky",  int:3, label:"Provoque-le",       line:"L'énergie c'est bien, mais moi je gagne toujours. Désolé·e pas désolé·e. 😾" }
    ],
    links: ["nap","outside","territory"]
  },
  territory: {
    openers: [
      "Le canapé côté gauche, c'est chez moi. Tu respectes les frontières, j'espère ? 😼",
      "Il paraît qu'un chat roux traîne dans ton immeuble. Je devrais être jaloux·se ?",
      "Mon humain a osé déplacer mon arbre à chat. Scandale. Chez toi, on te respecte ?"
    ],
    responses: [
      { beat:"sincere", int:1, label:"Rassure-le",              line:"Chez moi, il n'y aurait de place que pour toi, promis. 🥺" },
      { beat:"tease",   int:2, label:"Taquine sa jalousie",     line:"Le chat roux ? Aucune chance face à toi… enfin je crois. 😼" },
      { beat:"cheeky",  int:2, label:"Joue la provoc",          line:"Jaloux·se ? De moi ? Tu as bien raison, je suis irrésistible. 😾" },
      { beat:"aloof",   int:3, label:"Marque ton indépendance", line:"Les frontières ? Je vais où je veux. Même sur ton canapé. 🥱" }
    ],
    links: ["humans","play","flirt"]
  },
  humans: {
    openers: [
      "Mon humain télétravaille et je m'assois sur son clavier. Sabotage réussi. Et toi ?",
      "Les humains croient qu'ils nous dressent. Adorable, non ? 😹",
      "Tu obéis quand on t'appelle, toi ? Sois honnête."
    ],
    responses: [
      { beat:"sincere", int:1, label:"Montre ton cœur",   line:"Le mien croit que c'est son lit, mais en vrai… je l'aime fort. 🥺" },
      { beat:"tease",   int:2, label:"Ris des humains",   line:"Obéir ? Je viens quand ça M'arrange. Comme tout chat qui se respecte. 😼" },
      { beat:"play",    int:2, label:"Surenchère joueuse", line:"Le clavier c'est rien, essaie de marcher sur la souris en pleine visio ! 😹" },
      { beat:"brag",    int:3, label:"Frime ton dressage", line:"J'ai dressé le mien : il ouvre les boîtes dès que je miaule. 💅" }
    ],
    links: ["food","territory","dreams"]
  },
  outside: {
    openers: [
      "Je passe des heures à la fenêtre à surveiller les pigeons. Toi aussi, espion·ne ?",
      "Le balcon : l'aventure ou trop dangereux à ton goût ?",
      "J'ai vu un écureuil aujourd'hui. Ma vie a basculé. Tu sors, toi ?"
    ],
    responses: [
      { beat:"charm",   int:1, label:"Romantique",          line:"Un coucher de soleil à la fenêtre, avec toi… voilà mon idée du bonheur. 😽" },
      { beat:"play",    int:2, label:"Complice d'aventure", line:"Espion·ne de fenêtre professionnel·le ! On surveille la rue à deux ? 🐦" },
      { beat:"aloof",   int:2, label:"Blasé du dehors",     line:"Le dehors ? Trop de bruit. Je préfère mon confort, franchement. 🥱" },
      { beat:"brag",    int:3, label:"Frime tes guets",     line:"Un écureuil ? J'ai fixé un corbeau 4h sans cligner. Record absolu. 💅" }
    ],
    links: ["play","dreams","nap"]
  },
  flirt: {
    openers: [
      "Je vais être direct·e : ta 3e photo m'a fait tourner la tête. 😽",
      "On me dit charmeur·se… mais toi, tu fais craquer combien de chats ?",
      "Tu crois au coup de foudre félin, toi ?"
    ],
    responses: [
      { beat:"sincere", int:1, label:"Sois vulnérable",    line:"Je ne fais craquer personne d'habitude… mais avec toi, j'ai envie d'essayer. 🥺" },
      { beat:"charm",   int:2, label:"Réponds au charme",  line:"Le coup de foudre ? Je crois que je suis en train de le vivre, là. 😻" },
      { beat:"tease",   int:2, label:"Fais-le mériter",    line:"Charmeur·se, toi ? On verra si tu tiens tes promesses. 😼" },
      { beat:"aloof",   int:3, label:"Joue la distance",   line:"Le coup de foudre ? Je suis plutôt du genre à faire attendre. 🥱" }
    ],
    links: ["nap","territory","dreams"]
  },
  fears: {
    openers: [
      "Confession : l'aspirateur me terrifie. Et toi, ta plus grande peur ?",
      "On m'a posé un concombre derrière le dos une fois. Traumatisme. Tu crains quoi ?",
      "L'ouvre-boîte me fait bondir de joie. Le reste ? Méfiance. Et toi ?"
    ],
    responses: [
      { beat:"sincere", int:1, label:"Partage la peur",   line:"L'aspirateur aussi me hante. On se cachera sous le lit ensemble. 🙈" },
      { beat:"tease",   int:2, label:"Taquine gentiment", line:"Peur d'un concombre ? 😹 Trop mignon. Je te protégerai, va." },
      { beat:"charm",   int:2, label:"Rassurant",         line:"Avec toi à mes côtés, je crois que je n'aurais plus peur de rien. 😽" },
      { beat:"brag",    int:3, label:"Fais le·la brave",  line:"Moi ? Peur de rien. J'ai déjà affronté l'aspirateur en duel. 💅" }
    ],
    links: ["humans","nap","flirt"]
  },
  dreams: {
    openers: [
      "Si on pouvait s'échapper une journée, tu irais où ?",
      "Je rêve d'un appart avec une véranda pleine de soleil. Et toi, ton rêve ?",
      "Franchement… tu te verrais partager un radiateur avec moi cet hiver ? 💛"
    ],
    responses: [
      { beat:"sincere", int:1, label:"Ouvre ton cœur",  line:"Partager ton radiateur tout l'hiver ? C'est exactement ce dont je rêve. 💛" },
      { beat:"charm",   int:2, label:"Fais rêver",      line:"Je t'emmènerais sur le plus beau rebord de fenêtre de Paris. 😽" },
      { beat:"play",    int:2, label:"Aventure à deux", line:"Une évasion ? Direction les toits, on sème les pigeons ! 🎾" },
      { beat:"aloof",   int:3, label:"Freine un peu",   line:"M'engager pour un hiver entier ? Doucement, on se connaît à peine. 🥱" }
    ],
    links: ["outside","nap","flirt"]
  }
};

const START_TOPICS = ["humans","food","play","outside","flirt"];

function fillTpl(tpl, self, other){
  return tpl.replace(/\{name\}/g, other?.name || "toi").replace(/\{me\}/g, self?.name || "toi");
}
function tplKey(beat, tpl){ return "d:"+beat+":"+(hashStr(tpl)%100000); }
function pickFrom(arr, rng){ return arr[Math.floor(rng.float()*arr.length)]; }

function beatPreference(beat, cat, affinity){
  const s = cat.stats, timid = cat.archetype?.key === "timide";
  let p;
  switch(beat){
    case "charm":   p = (s.affection-40) + (affinity>55? 15:0); break;
    case "sincere": p = (s.affection-30) + (affinity-55); break;
    case "play":    p = (s.playfulness-38); break;
    case "tease":   p = (s.playfulness-45) - (timid?25:0); break;
    case "food":    p = 16 + (100-s.independence)/8; break;
    case "brag":    p = (s.independence-52) - (affinity<30?12:0); break;
    case "aloof":   p = (s.independence-50) - (s.affection-50); break;
    case "cheeky":  p = -30 + (cat.pickiness>60?22:0) + (s.playfulness-60); break;
    default:        p = 0;
  }
  return Math.max(-100, Math.min(100, p));
}

export function initDialog(myCat, cat){
  return { affinity: 34, patience: 100, turn: 0, topic: null, lastValence: "neutral", ended: null, opened: false, llmChoices: null, seen: [], usedOpeners: {} };
}

/* Renvoie un opener du sujet SANS le répéter tant que le sujet n'a pas été
   épuisé (mémorisé dans st.usedOpeners) -> plus jamais "deux fois la même question". */
function freshOpener(topicKey, st, rng){
  const openers = TOPICS[topicKey].openers;
  if(!st.usedOpeners) st.usedOpeners = {};
  let used = st.usedOpeners[topicKey] || [];
  let pool = openers.map((_, i) => i).filter(i => !used.includes(i));
  if(!pool.length){ pool = openers.map((_, i) => i); used = []; }
  const idx = pool[rng.int(0, pool.length - 1)];
  st.usedOpeners[topicKey] = [...used, idx];
  return openers[idx];
}

export function moodLabel(state){
  if(state.ended === "blocked") return "🙈 Bloqué·e";
  if(state.ended === "soulmate") return "💛 Âmes sœurs";
  const a = state.affinity;
  if(a < 25) return "Sur la défensive… 🙀";
  if(a < 45) return "Se jauge encore 👀";
  if(a < 65) return "Ça ronronne doucement 🐾";
  if(a < 85) return "Sérieusement mignon 😽";
  return "À deux doigts du grand amour 💞";
}

/* Ouverture : salutation + lancement d'un premier sujet. */
export function openingExchange(myCat, cat){
  const rng = new RNG(hashStr(cat.id + "open"));
  const topic = pickFrom(START_TOPICS, rng);
  const greet = pickFrom(GREETINGS, rng);
  const opener = pickFrom(TOPICS[topic].openers, rng);
  return { message: { fromId: cat.id, text: fillTpl(greet + " " + opener, myCat, cat), beat:"greet", valence:"neutral", tplKey:null }, topic };
}

function decorate(r){
  return { beat:r.beat, int:r.int || 2, label:r.label, line:r.line, emoji: BEAT_EMOJI[r.beat] || "💬" };
}

/* 3 à 4 réponses CONTEXTUELLES, choisies pour COUVRIR le spectre d'intensités
   (toujours un posé + un audacieux + un/deux medium) et TOURNER d'un tour à
   l'autre pour la variété. Si un tour LLM a fourni des choix, on les sert. */
export function getChoices(state, myCat, cat){
  if(Array.isArray(state.llmChoices) && state.llmChoices.length >= 3){
    return state.llmChoices.map(decorate);
  }
  const topicKey = state.topic && TOPICS[state.topic] ? state.topic : START_TOPICS[0];
  const resp = TOPICS[topicKey].responses;
  const rng = new RNG(hashStr(myCat.id + cat.id + topicKey) + state.turn*131);

  const byInt = i => resp.filter(r => (r.int||2) === i);
  const takeOne = pool => pool.length ? pool[rng.int(0, pool.length-1)] : null;

  const picked = [];
  const pushUnique = r => { if(r && !picked.includes(r)) picked.push(r); };

  // Socle : un posé, un audacieux, un medium -> contraste garanti.
  pushUnique(takeOne(byInt(1)));
  pushUnique(takeOne(byInt(3)));
  pushUnique(takeOne(byInt(2)));

  // Complète le reste (tournant selon le tour) jusqu'à 3, et un 4e 1 fois sur 2.
  const rest = resp.filter(r => !picked.includes(r));
  rest.sort(() => rng.float() - 0.5);
  const target = 3 + (rng.float() < 0.5 ? 1 : 0);
  for(const r of rest){ if(picked.length >= target) break; pushUnique(r); }
  // Garantie absolue de 3 minimum.
  for(const r of resp){ if(picked.length >= 3) break; pushUnique(r); }

  return picked.map(decorate);
}

/* Mode auto/regarder : penche vers ce que le chat apprécie. */
export function autoPick(choices, cat, state){
  const rng = new RNG(hashStr(cat.id + "auto") + state.turn*17);
  let best = choices[0], bestScore = -Infinity;
  for(const c of choices){
    const score = beatPreference(c.beat, cat, state.affinity) + (rng.float()*40 - 12);
    if(score > bestScore){ bestScore = score; best = c; }
  }
  return best;
}

/* Calcule l'impact NUANCÉ d'un choix sur l'affinité.
   - alignement beat/tempérament (comme avant),
   - AMPLIFIÉ par l'intensité (posé = petit pas sûr ; audacieux = gros pari),
   - PROGRESSIF : sincérité/charme paient de plus en plus à mesure que le lien
     grandit ; une audace prématurée (lien faible) est pénalisée. */
export function choiceDelta(choice, cat, state, rng){
  const pref = beatPreference(choice.beat, cat, state.affinity);   // -100..100
  const intensity = choice.int || 2;
  const amp = intensity === 1 ? 0.6 : intensity === 3 ? 1.5 : 1.0;

  let delta = (pref/6) * amp * (0.7 + rng.float()*0.6);

  // Progression du lien : la tendresse récompense davantage quand l'affinité monte.
  if(choice.beat === "sincere" || choice.beat === "charm"){
    delta += (state.affinity - 45) / 25;
  }
  // Audace prématurée : risque accru tant que la confiance n'est pas installée.
  if(intensity === 3 && state.affinity < 30) delta -= 3;

  const pickFactor = 1 + cat.pickiness/100;
  if(delta < 0) delta *= pickFactor;                               // les difficiles punissent plus

  // Plafond selon l'intensité : posé = petits pas, audacieux = grands écarts (± risque).
  const cap = intensity === 1 ? 8 : intensity === 3 ? 18 : 13;
  return Math.max(-cap - 4, Math.min(cap, Math.round(delta)));
}

/* Applique le choix : delta, réplique contextuelle, réaction + relance (le fil).
   `llmTurn` (optionnel) = { aiText, choices, topic } fourni par l'adaptateur LLM
   pour la relance ; sinon la relance est synthétisée à partir des SUJETS. */
export function applyChoice(choice, myCat, cat, state, llmTurn){
  const rng = new RNG(hashStr(myCat.id + cat.id + choice.beat + (state.topic||"")) + state.turn*997);

  const delta = choiceDelta(choice, cat, state, rng);
  let affinity = Math.max(0, Math.min(100, state.affinity + delta));
  const pickFactor = 1 + cat.pickiness/100;
  let patience = state.patience + (delta < 0 ? delta * 1.3 * pickFactor : 3 + delta*0.2);
  patience = Math.max(0, Math.min(100, Math.round(patience)));
  const valence = delta >= 4 ? "pos" : delta <= -4 ? "neg" : "neutral";

  // Réplique de TON chat : la ligne contextuelle du choix, restylée par le persona.
  const userText = stylizeUserLine(fillTpl(choice.line, myCat, cat), myCat.persona, rng);
  const userMsg = { fromId: myCat.id, text: userText, beat: choice.beat, valence, tplKey: tplKey(choice.beat, choice.line) };

  const nextState = { ...state, affinity, patience, turn: state.turn+1, lastValence: valence, opened: true, llmChoices: null,
    seen: Array.isArray(state.seen) ? [...state.seen] : [], usedOpeners: { ...(state.usedOpeners || {}) } };

  let ending = null;
  if(affinity <= 6 || patience <= 0){ ending = "blocked"; nextState.ended = "blocked"; }
  else if(affinity >= 90 && state.turn >= 4){ ending = "soulmate"; nextState.ended = "soulmate"; }

  let aiMsg;
  if(ending === "blocked"){
    aiMsg = { fromId: cat.id, text: fillTpl(pickFrom(BLOCK_LINES, rng), myCat, cat), beat:"block", valence:"neg", tplKey:null };
  } else if(ending === "soulmate"){
    aiMsg = { fromId: cat.id, text: fillTpl(pickFrom(SOULMATE_LINES, rng), myCat, cat), beat:"soulmate", valence:"pos", tplKey:null };
  } else if(llmTurn && llmTurn.aiText){
    // Relance pilotée par le LLM : texte libre + choix libres pour le tour suivant.
    aiMsg = { fromId: cat.id, text: fillTpl(llmTurn.aiText, myCat, cat), beat:"react", valence, tplKey:null };
    if(llmTurn.topic) nextState.topic = llmTurn.topic;
    if(Array.isArray(llmTurn.choices) && llmTurn.choices.length >= 3) nextState.llmChoices = llmTurn.choices;
  } else {
    // réaction à ta réponse + relance sur un sujet FRAIS (le fil continue sans tourner en rond)
    const picky = cat.pickiness > 55;
    const pool = valence === "pos" ? (picky ? REACT.posPicky : REACT.pos)
              : valence === "neg" ? (picky ? REACT.negPicky : REACT.neg)
              : REACT.neutral;
    const cur = TOPICS[state.topic] ? state.topic : START_TOPICS[0];

    // Sujet suivant : on évite tout sujet vu récemment (mémoire ~5 sujets).
    const usedSet = new Set([...nextState.seen, cur]);
    let cands = TOPICS[cur].links.filter(t => !usedSet.has(t));
    if(!cands.length) cands = Object.keys(TOPICS).filter(t => !usedSet.has(t));
    if(!cands.length) cands = TOPICS[cur].links.filter(t => t !== cur);   // dernier recours
    const nextTopic = pickFrom(cands, rng);
    nextState.topic = nextTopic;
    nextState.seen = [...nextState.seen, cur].slice(-5);

    const opener = freshOpener(nextTopic, nextState, rng);          // opener jamais répété
    const cbPool = CALLBACK[choice.beat];
    const cb = (cbPool && rng.float() < 0.55) ? pickFrom(cbPool, rng) + " " : "";  // rappel réactif ~1/2
    aiMsg = { fromId: cat.id, text: fillTpl(cb + pickFrom(pool, rng) + " " + opener, myCat, cat), beat:"react", valence, tplKey:null };
  }

  return { userMsg, aiMsg, state: nextState, ending, delta };
}

export function endBanner(state, cat){
  if(state.ended === "blocked") return `🙈 ${cat.name} t'a bloqué·e. Certains chats sont durs de la feuille… retente ta chance ailleurs !`;
  if(state.ended === "soulmate") return `💛 Âme sœur féline débloquée avec ${cat.name} ! Leurs ronrons sont désormais synchronisés.`;
  return "";
}
