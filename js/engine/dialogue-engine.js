/* ============================================================
   MeowMatch — Moteur de dialogue à CHOIX, threadé par SUJETS
   ------------------------------------------------------------
   Chaque message du chat d'en face porte sur un SUJET (croquettes, sieste,
   territoire, humains, dehors, flirt, peurs, rêves…). Les 3 choix proposés
   sont des réponses CONTEXTUELLES à ce sujet (des angles variés). La relance
   de l'IA réagit à ta réponse PUIS enchaîne sur un sujet lié -> un vrai fil.
   Les tempéraments (dont "durs de la feuille") pilotent l'affinité/patience,
   et l'arbre peut mener à 💛 âme sœur ou 🙈 blocage.
   ============================================================ */

import { RNG, hashStr } from "../rng.js";
import { stylizeUserLine } from "./persona.js";

const BEAT_EMOJI = { charm:"😽", play:"🎾", tease:"😼", food:"🍤", brag:"💅", aloof:"🥱", sincere:"🥺", cheeky:"😾" };

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

/* ---- Les SUJETS de conversation ----
   openers  : ce que dit l'IA pour lancer/relancer le sujet
   responses: réponses contextuelles (beat = angle/personnalité, line = réplique)
   links    : sujets vers lesquels enchaîner (le fil)                          */
const TOPICS = {
  food: {
    openers: [
      "Bon, LA vraie question : croquettes ou pâtée ? J'ai besoin de savoir. 🍤",
      "Je viens de finir ma gamelle et j'ai déjà faim. Toi aussi tu es un ventre sur pattes ?",
      "On m'a dit que tu volais parfois sur le plan de travail… c'est vrai ? 😼"
    ],
    responses: [
      { beat:"food",    label:"Partage la gourmandise", line:"Team pâtée en gelée, évidemment. Et je partagerais bien ma gamelle avec toi. 🍤" },
      { beat:"tease",   label:"Taquine son appétit",    line:"Toi, un ventre sur pattes ? Ça se voit un peu, non ? 😼" },
      { beat:"brag",    label:"Frime tes exploits",     line:"Voler sur le plan de travail ? Amateur. Moi j'ouvre le placard tout·e seul·e. 💅" },
      { beat:"sincere", label:"Avoue ta faille",        line:"Honnêtement, je ferais n'importe quoi pour une crevette. C'est mon point faible. 🥺" }
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
      { beat:"charm",   label:"Propose un câlin-sieste", line:"Une sieste à deux, dos à dos sur le radiateur… j'en rêve déjà. 😻" },
      { beat:"aloof",   label:"Joue la solitaire",       line:"Je dors seul·e. Mon coussin, mes règles. On verra si tu mérites une exception. 🥱" },
      { beat:"play",    label:"Préfère l'action",        line:"Dormir ? Avec toute cette énergie ?! Viens plutôt courir dans le couloir ! 🎾" },
      { beat:"brag",    label:"Vante ton record",        line:"18h de sommeil par jour. Champion·ne de l'immeuble, sans forcer. 💅" }
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
      { beat:"play",    label:"Relève le défi",  line:"Le laser, c'est ma Némésis ET mon grand amour. On chasse ensemble ? 🎾" },
      { beat:"tease",   label:"Nargue-le",       line:"Tenir le rythme ? Je vais te laisser sur place, mon grand. 😼" },
      { beat:"cheeky",  label:"Provoque-le",     line:"L'énergie c'est bien, mais moi je gagne toujours. Désolé·e pas désolé·e. 😾" },
      { beat:"charm",   label:"Joue la tendresse", line:"J'adorerais jouer, surtout si c'est avec toi. 😽" }
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
      { beat:"aloof",   label:"Marque ton indépendance", line:"Les frontières ? Je vais où je veux. Même sur ton canapé. 🥱" },
      { beat:"sincere", label:"Rassure-le",              line:"Chez moi, il n'y aurait de place que pour toi, promis. 🥺" },
      { beat:"cheeky",  label:"Joue la provoc",          line:"Jaloux·se ? De moi ? Tu as bien raison, je suis irrésistible. 😾" },
      { beat:"tease",   label:"Taquine sa jalousie",     line:"Le chat roux ? Aucune chance face à toi… enfin je crois. 😼" }
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
      { beat:"tease",   label:"Ris des humains",   line:"Obéir ? Je viens quand ça M'arrange. Comme tout chat qui se respecte. 😼" },
      { beat:"sincere", label:"Montre ton cœur",   line:"Le mien croit que c'est son lit, mais en vrai… je l'aime fort. 🥺" },
      { beat:"brag",    label:"Frime ton dressage", line:"J'ai dressé le mien : il ouvre les boîtes dès que je miaule. 💅" },
      { beat:"play",    label:"Surenchère joueuse", line:"Le clavier c'est rien, essaie de marcher sur la souris en pleine visio ! 😹" }
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
      { beat:"play",    label:"Complice d'aventure", line:"Espion·ne de fenêtre professionnel·le ! On surveille la rue à deux ? 🐦" },
      { beat:"aloof",   label:"Blasé du dehors",     line:"Le dehors ? Trop de bruit. Je préfère mon confort, franchement. 🥱" },
      { beat:"charm",   label:"Romantique",          line:"Un coucher de soleil à la fenêtre, avec toi… voilà mon idée du bonheur. 😽" },
      { beat:"brag",    label:"Frime tes guets",     line:"Un écureuil ? J'ai fixé un corbeau 4h sans cligner. Record absolu. 💅" }
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
      { beat:"charm",   label:"Réponds au charme",  line:"Le coup de foudre ? Je crois que je suis en train de le vivre, là. 😻" },
      { beat:"tease",   label:"Fais-le mériter",    line:"Charmeur·se, toi ? On verra si tu tiens tes promesses. 😼" },
      { beat:"sincere", label:"Sois vulnérable",    line:"Je ne fais craquer personne d'habitude… mais avec toi, j'ai envie d'essayer. 🥺" },
      { beat:"aloof",   label:"Joue la distance",   line:"Le coup de foudre ? Je suis plutôt du genre à faire attendre. 🥱" }
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
      { beat:"sincere", label:"Partage la peur",   line:"L'aspirateur aussi me hante. On se cachera sous le lit ensemble. 🙈" },
      { beat:"tease",   label:"Taquine gentiment", line:"Peur d'un concombre ? 😹 Trop mignon. Je te protégerai, va." },
      { beat:"brag",    label:"Fais le·la brave",  line:"Moi ? Peur de rien. J'ai déjà affronté l'aspirateur en duel. 💅" },
      { beat:"charm",   label:"Rassurant",         line:"Avec toi à mes côtés, je crois que je n'aurais plus peur de rien. 😽" }
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
      { beat:"sincere", label:"Ouvre ton cœur",  line:"Partager ton radiateur tout l'hiver ? C'est exactement ce dont je rêve. 💛" },
      { beat:"charm",   label:"Fais rêver",      line:"Je t'emmènerais sur le plus beau rebord de fenêtre de Paris. 😽" },
      { beat:"play",    label:"Aventure à deux", line:"Une évasion ? Direction les toits, on sème les pigeons ! 🎾" },
      { beat:"aloof",   label:"Freine un peu",   line:"M'engager pour un hiver entier ? Doucement, on se connaît à peine. 🥱" }
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
  return { affinity: 34, patience: 100, turn: 0, topic: null, lastValence: "neutral", ended: null, opened: false };
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

/* 3 réponses CONTEXTUELLES au sujet courant (angles variés, tournantes). */
export function getChoices(state, myCat, cat){
  const topicKey = state.topic && TOPICS[state.topic] ? state.topic : START_TOPICS[0];
  const resp = TOPICS[topicKey].responses;
  const rng = new RNG(hashStr(myCat.id + cat.id + topicKey) + state.turn*131);
  const start = rng.int(0, resp.length - 1);
  const picked = [];
  for(let i=0; i<resp.length && picked.length<3; i++){ picked.push(resp[(start+i)%resp.length]); }
  return picked.map(r => ({ beat:r.beat, label:r.label, line:r.line, emoji: BEAT_EMOJI[r.beat] || "💬" }));
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

/* Applique le choix : delta, réplique contextuelle, réaction + relance (le fil). */
export function applyChoice(choice, myCat, cat, state){
  const rng = new RNG(hashStr(myCat.id + cat.id + choice.beat + (state.topic||"")) + state.turn*997);
  const pref = beatPreference(choice.beat, cat, state.affinity);
  const pickFactor = 1 + cat.pickiness/100;

  let delta = (pref/6) * (0.65 + rng.float()*0.7);
  if(delta < 0) delta *= pickFactor;
  delta = Math.max(-20, Math.min(15, Math.round(delta)));

  let affinity = Math.max(0, Math.min(100, state.affinity + delta));
  let patience = state.patience + (delta < 0 ? delta * 1.3 * pickFactor : 3 + delta*0.2);
  patience = Math.max(0, Math.min(100, Math.round(patience)));
  const valence = delta >= 4 ? "pos" : delta <= -4 ? "neg" : "neutral";

  // Réplique de TON chat : la ligne contextuelle du choix, restylée par le persona.
  const userText = stylizeUserLine(fillTpl(choice.line, myCat, cat), myCat.persona, rng);
  const userMsg = { fromId: myCat.id, text: userText, beat: choice.beat, valence, tplKey: tplKey(choice.beat, choice.line) };

  const nextState = { ...state, affinity, patience, turn: state.turn+1, lastValence: valence, opened: true };

  let ending = null;
  if(affinity <= 6 || patience <= 0){ ending = "blocked"; nextState.ended = "blocked"; }
  else if(affinity >= 90 && state.turn >= 4){ ending = "soulmate"; nextState.ended = "soulmate"; }

  let aiMsg;
  if(ending === "blocked"){
    aiMsg = { fromId: cat.id, text: fillTpl(pickFrom(BLOCK_LINES, rng), myCat, cat), beat:"block", valence:"neg", tplKey:null };
  } else if(ending === "soulmate"){
    aiMsg = { fromId: cat.id, text: fillTpl(pickFrom(SOULMATE_LINES, rng), myCat, cat), beat:"soulmate", valence:"pos", tplKey:null };
  } else {
    // réaction à ta réponse + relance sur un sujet LIÉ (le fil continue)
    const picky = cat.pickiness > 55;
    const pool = valence === "pos" ? (picky ? REACT.posPicky : REACT.pos)
              : valence === "neg" ? (picky ? REACT.negPicky : REACT.neg)
              : REACT.neutral;
    const cur = TOPICS[state.topic] ? state.topic : START_TOPICS[0];
    const links = TOPICS[cur].links.filter(t => t !== cur);
    const nextTopic = pickFrom(links.length ? links : Object.keys(TOPICS), rng);
    const opener = pickFrom(TOPICS[nextTopic].openers, rng);
    nextState.topic = nextTopic;
    aiMsg = { fromId: cat.id, text: fillTpl(pickFrom(pool, rng) + " " + opener, myCat, cat), beat:"react", valence, tplKey:null };
  }

  return { userMsg, aiMsg, state: nextState, ending, delta };
}

export function endBanner(state, cat){
  if(state.ended === "blocked") return `🙈 ${cat.name} t'a bloqué·e. Certains chats sont durs de la feuille… retente ta chance ailleurs !`;
  if(state.ended === "soulmate") return `💛 Âme sœur féline débloquée avec ${cat.name} ! Leurs ronrons sont désormais synchronisés.`;
  return "";
}
