/* ============================================================
   MeowMatch — Moteur de dialogue à CHOIX (arborescence)
   ------------------------------------------------------------
   L'utilisateur "coache" l'IA de son chat : à chaque tour on lui
   propose des choix variés (charme, jeu, taquinerie, frime, sincérité,
   insolence…). Le chat d'en face (IA) réagit selon sa personnalité et
   sa "pickiness" (les chats durs de la feuille). L'affinité et la
   patience évoluent -> l'arbre peut mener à :
     • ❤️ ÂME SŒUR (fin heureuse débloquée)
     • 🙈 BLOCAGE (le chat te snobe et part)
     • ou continuer, plus chaud ou plus froid.
   Rendu "parle chat" : ronrons, actions en *italique*, emojis mesurés.
   ============================================================ */

import { RNG, hashStr } from "../rng.js";
import { stylizeUserLine } from "./persona.js";

/* ---- Répliques de TON chat, selon l'intention choisie ---- */
const USER_LINES = {
  charm: [
    "*cligne des yeux tout doucement vers {name}* ...salut toi. 😽",
    "T'as un de ces pelages, {name}... j'ai le droit de te renifler ?",
    "Je te garderais bien une place sur mon radiateur, moi. 💛"
  ],
  play: [
    "*frétille de la queue* On se fait une course jusqu'au rideau ?! 🎾",
    "PSCHIT, j'ai vu un point rouge — ah non, c'était toi. Tu joues ?",
    "*fait rouler une balle en alu vers toi* À toi de jouer, {name}."
  ],
  tease: [
    "*te pique ton coussin et fait l'innocent·e* Quel coussin ? 😼",
    "T'as vraiment peur de l'aspirateur ? ...c'est mignon en fait.",
    "*petit coup de patte sur ton nez* Boop. Voilà, fallait le faire."
  ],
  food: [
    "Bon, question sérieuse : thon ou poulet ? 🍤 C'est décisif.",
    "J'ai planqué une croquette premium. Je partage si tu es sympa.",
    "Tu manges quoi le matin, toi ? On juge une relation là-dessus."
  ],
  brag: [
    "Hier j'ai fait tomber un verre PILE au bon moment. Un art. 💅",
    "Je tiens 22 secondes dans un carton trop petit. Record de l'immeuble.",
    "Mon humain croit que c'est SON lit. *petit rire de chat suffisant*"
  ],
  aloof: [
    "*se lèche la patte sans te regarder* ...ah, tu es encore là ? 🥱",
    "Mmh. On verra si je te case entre deux siestes.",
    "*bâille longuement* Continue, je t'écoute d'une demi-oreille."
  ],
  sincere: [
    "Franchement... je te trouve apaisant·e. C'est rare, chez moi. 🥺",
    "*baisse la garde et se blottit un peu* Là je m'ouvre. Sois doux·ce.",
    "J'ai pas l'habitude de dire ça, mais tu me plais vraiment, {name}."
  ],
  cheeky: [
    "*renverse ta gamelle imaginaire en te fixant droit dans les yeux* Oups. 😾",
    "Le canapé, c'est MON territoire. Tu peux rêver, {name}.",
    "T'es mignon·ne. Moins que moi, mais mignon·ne. Voilà, c'est dit."
  ]
};

/* ---- Réactions du chat d'en face, par valence ---- */
const AI_REACT = {
  pos: [
    "*ronronne à plein régime* Ok, là tu marques des points. 😻",
    "*se rapproche d'un pas feutré* J'aime bien ton énergie, continue.",
    "Hihi. Bon... tu me plais. Je l'avoue à moitié.",
    "*cligne des yeux lentement en retour* ...oui. Je ressens un petit truc."
  ],
  posPicky: [
    "*fait mine de rien mais sa queue frétille* ...pas mal. Pour une fois.",
    "Mmh. Tu as FAILLI m'impressionner. Refais-le pour voir.",
    "Ok. J'enlève 2% de mon mépris légendaire. Profites-en."
  ],
  neg: [
    "*recule d'un pas* ...ouais, non.",
    "*queue qui bat sèchement* Alors ça, c'était pas terrible.",
    "Hm. Tu perds des points, là, franchement.",
    "*détourne le regard vers la fenêtre* Je m'ennuie déjà."
  ],
  negPicky: [
    "*feulement discret* Non mais tu te crois où, exactement ?",
    "*te snobe royalement et s'assoit dos à toi* ...au suivant.",
    "Sérieux ? C'est tout ce que tu as en stock ? 🙄",
    "*lève le menton* J'ai connu des croquettes plus intéressantes."
  ],
  neutral: [
    "*penche la tête* ...continue, je te jauge.",
    "Mmh, d'accord. Et sinon, tu proposes quoi ?",
    "*t'observe sans bouger une moustache* J'attends de voir.",
    "Intéressant. Peut-être. On verra bien."
  ]
};

const GREETINGS = [
  "*s'approche, renifle prudemment* Miaou. Alors c'est toi, {me} ?",
  "Oh. Un nouveau museau. *cligne des yeux* Salut. Impressionne-moi.",
  "*queue en point d'interrogation* Bon. Tu vaux quoi, toi ?",
  "Tiens tiens. On m'a dit que tu ronronnais bien. Prouve-le. 😼"
];

const BLOCK_LINES = [
  "*se lève, s'étire longuement, et disparaît sous le lit sans un dernier regard* 🙀",
  "« C'est un non définitif. » *quitte le rebord de la fenêtre, queue haute*",
  "*souffle une dernière fois, puis part bouder pour de bon dans l'autre pièce*"
];
const SOULMATE_LINES = [
  "*se love tout contre toi et cale son ronron sur le tien* ...reste. 💛",
  "*pose délicatement une patte sur la tienne* Ok. Tu es mon chat préféré. Officiellement.",
  "Je crois que c'est ça, l'amour de chat. *ferme les yeux, comblé·e* 😻"
];

/* ---- Catalogue des intentions proposables ---- */
const CHOICE_POOL = [
  { beat:"play",    label:"Propose de jouer",        emoji:"🎾", risk:"safe" },
  { beat:"food",    label:"Parle croquettes",        emoji:"🍤", risk:"safe" },
  { beat:"charm",   label:"Fais du charme",          emoji:"😽", risk:"medium" },
  { beat:"tease",   label:"Taquine-le·elle",         emoji:"😼", risk:"medium" },
  { beat:"brag",    label:"Frime un peu",            emoji:"💅", risk:"bold" },
  { beat:"aloof",   label:"Joue l'indifférence",     emoji:"🥱", risk:"bold" },
  { beat:"sincere", label:"Ouvre ton cœur",          emoji:"🥺", risk:"bold" },
  { beat:"cheeky",  label:"Sois carrément insolent·e", emoji:"😾", risk:"spicy" }
];

function fillTpl(tpl, self, other){
  return tpl.replace(/\{name\}/g, other?.name || "toi").replace(/\{me\}/g, self?.name || "toi");
}
function tplKey(beat, tpl){ return "d:"+beat+":"+(hashStr(tpl)%100000); }
function pickFrom(arr, rng){ return arr[Math.floor(rng.float()*arr.length)]; }

/* ---- À quel point CE chat aime CETTE intention, MAINTENANT (−100..100) ---- */
function beatPreference(beat, cat, affinity){
  const s = cat.stats, timid = cat.archetype?.key === "timid" || cat.archetype?.key === "timide";
  let p;
  switch(beat){
    case "charm":   p = (s.affection-40) + (affinity>55? 15:0); break;
    case "sincere": p = (s.affection-30) + (affinity-55); break;               // sublime tard, gênant tôt
    case "play":    p = (s.playfulness-38); break;
    case "tease":   p = (s.playfulness-45) - (timid?25:0); break;
    case "food":    p = 16 + (100-s.independence)/8; break;                     // valeur sûre
    case "brag":    p = (s.independence-52) - (affinity<30?12:0); break;        // les divas aiment l'assurance
    case "aloof":   p = (s.independence-50) - (s.affection-50); break;          // les pots de colle détestent
    case "cheeky":  p = -30 + (cat.pickiness>60?22:0) + (s.playfulness-60); break; // surtout mauvais, sauf "bad boy"
    default:        p = 0;
  }
  return Math.max(-100, Math.min(100, p));
}

export function initDialog(myCat, cat){
  return {
    affinity: 34,
    patience: 100,
    turn: 0,
    lastValence: "neutral",
    ended: null,          // null | 'blocked' | 'soulmate'
    opened: false
  };
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

/* Ligne d'ouverture du chat d'en face. */
export function openingMessage(myCat, cat){
  const rng = new RNG(hashStr(cat.id + "open"));
  const tpl = pickFrom(GREETINGS, rng);
  return { fromId: cat.id, text: fillTpl(tpl, myCat, cat), beat:"greet", valence:"neutral", tplKey:null };
}

/* 3 choix variés (1 sûr, 1 medium, 1 audacieux/épicé), déterministes par tour. */
export function getChoices(state, myCat, cat){
  const rng = new RNG(hashStr(myCat.id + cat.id) + state.turn*131 + 7);
  const byRisk = r => CHOICE_POOL.filter(c => c.risk === r);
  const safe = pickFrom(byRisk("safe"), rng);
  const medium = pickFrom(byRisk("medium"), rng);
  // audacieux : au fil de la relation on ouvre "sincere" ; l'insolence reste rare
  const boldPool = byRisk("bold").concat(rng.bool(0.28) ? byRisk("spicy") : []);
  let bold = pickFrom(boldPool, rng);
  // évite un doublon improbable
  const out = [safe, medium, bold].filter((c,i,arr) => arr.findIndex(x=>x.beat===c.beat)===i);
  while(out.length < 3){ const c = pickFrom(CHOICE_POOL, rng); if(!out.find(x=>x.beat===c.beat)) out.push(c); }
  return out.map(c => ({ ...c }));
}

/* Choisit "intelligemment" un choix (mode auto/regarder) : penche vers ce que
   le chat apprécie, avec un grain de hasard pour garder du suspense. */
export function autoPick(choices, cat, state){
  const rng = new RNG(hashStr(cat.id + "auto") + state.turn*17);
  let best = choices[0], bestScore = -Infinity;
  for(const c of choices){
    const score = beatPreference(c.beat, cat, state.affinity) + (rng.float()*40 - 12);
    if(score > bestScore){ bestScore = score; best = c; }
  }
  return best;
}

/* Applique le choix : calcule deltas, génère les 2 répliques, détecte les fins. */
export function applyChoice(choice, myCat, cat, state){
  const rng = new RNG(hashStr(myCat.id + cat.id + choice.beat) + state.turn*997);
  const pref = beatPreference(choice.beat, cat, state.affinity);
  const pickFactor = 1 + cat.pickiness/100;

  // delta d'affinité : préférence -> ~[-18,+14], amplifié en négatif chez les difficiles
  let delta = (pref/6) * (0.65 + rng.float()*0.7);
  if(delta < 0) delta *= pickFactor;
  delta = Math.max(-20, Math.min(15, Math.round(delta)));

  let affinity = Math.max(0, Math.min(100, state.affinity + delta));

  // patience : les mauvais coups l'entament (plus vite chez les susceptibles) ; les bons la restaurent un peu
  let patience = state.patience + (delta < 0 ? delta * 1.3 * pickFactor : 3 + delta*0.2);
  patience = Math.max(0, Math.min(100, Math.round(patience)));

  const valence = delta >= 4 ? "pos" : delta <= -4 ? "neg" : "neutral";

  // Réplique de ton chat
  const uPool = USER_LINES[choice.beat] || USER_LINES.charm;
  const uTpl = pickFrom(uPool, rng);
  // Restyle selon le persona synthétisé du chat de l'utilisateur (célébrité/archétype).
  const userText = stylizeUserLine(fillTpl(uTpl, myCat, cat), myCat.persona, rng);
  const userMsg = { fromId: myCat.id, text: userText, beat: choice.beat, valence, tplKey: tplKey(choice.beat, uTpl) };

  const nextState = { ...state, affinity, patience, turn: state.turn+1, lastValence: valence, opened: true };

  // Détection des fins
  let ending = null;
  if(affinity <= 6 || patience <= 0){ ending = "blocked"; nextState.ended = "blocked"; }
  else if(affinity >= 90 && state.turn >= 4){ ending = "soulmate"; nextState.ended = "soulmate"; }

  // Réaction du chat d'en face
  let aiMsg;
  if(ending === "blocked"){
    aiMsg = { fromId: cat.id, text: fillTpl(pickFrom(BLOCK_LINES, rng), myCat, cat), beat:"block", valence:"neg", tplKey:null };
  } else if(ending === "soulmate"){
    aiMsg = { fromId: cat.id, text: fillTpl(pickFrom(SOULMATE_LINES, rng), myCat, cat), beat:"soulmate", valence:"pos", tplKey:null };
  } else {
    const picky = cat.pickiness > 55;
    const pool = valence === "pos" ? (picky ? AI_REACT.posPicky : AI_REACT.pos)
              : valence === "neg" ? (picky ? AI_REACT.negPicky : AI_REACT.neg)
              : AI_REACT.neutral;
    aiMsg = { fromId: cat.id, text: fillTpl(pickFrom(pool, rng), myCat, cat), beat:"react", valence, tplKey:null };
  }

  return { userMsg, aiMsg, state: nextState, ending, delta };
}

export function endBanner(state, cat){
  if(state.ended === "blocked") return `🙈 ${cat.name} t'a bloqué·e. Certains chats sont durs de la feuille… retente ta chance ailleurs !`;
  if(state.ended === "soulmate") return `💛 Âme sœur féline débloquée avec ${cat.name} ! Leurs ronrons sont désormais synchronisés.`;
  return "";
}
