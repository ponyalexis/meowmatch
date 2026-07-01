/* ============================================================
   MeowMatch — Synthèse de PERSONA du chat de l'utilisateur
   ------------------------------------------------------------
   À partir des inputs d'onboarding (archétype, curseurs de tempérament,
   traits, bio), on déduit :
     • un ARCHÉTYPE HUMAIN ("s'il était humain, ce serait…")
     • une CÉLÉBRITÉ de référence ("un peu comme …")
     • un STYLE DE PAROLE (emoji signature, tics, transformations)
   -> l'IA de son chat parle alors exactement comme l'utilisateur l'imagine.
   Déterministe et hors-ligne. Un LLM branché peut affiner ensuite.
   ============================================================ */

import { RNG, hashStr } from "../rng.js";

// Un persona par archétype de chat. Célébrités connues (public parisien 20-50),
// en simple clin d'œil ludique ("un peu comme…").
const PERSONAS = {
  potdecolle: {
    human: "L'attachant·e fusionnel·le", emoji: "🫶",
    F: ["Adèle Exarchopoulos", "Ana de Armas"], M: ["Omar Sy", "Paul Mescal"],
    words: ["mon cœur", "reste là", "je t'adore"], action: "*se colle contre toi et ronronne*"
  },
  aventurier: {
    human: "L'aventurier·e solaire", emoji: "🧭",
    F: ["Zendaya", "Marion Cotillard"], M: ["Tom Holland", "Teddy Riner"],
    words: ["on tente ?", "à l'aventure", "viens voir ça"], action: "*oreilles dressées, prêt·e à bondir*"
  },
  diva: {
    human: "La diva magnétique", emoji: "👑",
    F: ["Rihanna", "Catherine Deneuve"], M: ["Harry Styles", "Lenny Kravitz"],
    words: ["chéri·e", "évidemment", "on m'admire"], action: "*rejette sa fourrure en arrière avec grâce*"
  },
  chasseur: {
    human: "Le·la prédateur·rice charmeur·se", emoji: "🌙",
    F: ["Léa Seydoux", "Eva Green"], M: ["Idris Elba", "Tahar Rahim"],
    words: ["je t'ai repéré·e", "trop tard", "à la chasse"], action: "*pupilles dilatées, immobile puis vif·ve*"
  },
  philosophe: {
    human: "Le·la sage tranquille", emoji: "🧘",
    F: ["Juliette Binoche"], M: ["Keanu Reeves", "Gaël Faye"],
    words: ["au fond…", "tout est éphémère", "respire"], action: "*inspire lentement, regard lointain*"
  },
  clown: {
    human: "Le clown attachant", emoji: "🤹",
    F: ["Florence Foresti"], M: ["Jamel Debbouze", "Jim Carrey"],
    words: ["héhé", "attends la chute", "j'déconne"], action: "*tombe du canapé exprès et se relève fier·e*"
  },
  gourmand: {
    human: "L'épicurien·ne", emoji: "🍤",
    F: ["Sophie Marceau"], M: ["Cyril Lignac"],
    words: ["c'est l'heure de manger ?", "miam", "on partage ?"], action: "*renifle l'air à la recherche de nourriture*"
  },
  athlete: {
    human: "L'athlète survolté·e", emoji: "🏃",
    F: ["Serena Williams"], M: ["Kylian Mbappé", "Antoine Griezmann"],
    words: ["let's go", "encore un tour !", "trop facile"], action: "*sprint sur place, plein d'énergie*"
  },
  timide: {
    human: "Le·la doux·ce réservé·e", emoji: "🙈",
    F: ["Emma Watson"], M: ["Timothée Chalamet"],
    words: ["euh…", "*chuchote*", "si tu veux"], action: "*se cache à moitié derrière sa patte*"
  },
  seducteur: {
    human: "Le·la séducteur·rice romantique", emoji: "😻",
    F: ["Monica Bellucci", "Marion Cotillard"], M: ["Ryan Gosling", "Timothée Chalamet"],
    words: ["rien que toi", "approche…", "*regard de braise*"], action: "*regard de braise et ronron grave*"
  },
  bavard: {
    human: "Le·la pétillant·e intarissable", emoji: "🗣️",
    F: ["Florence Foresti", "Camille Cottin"], M: ["Kev Adams"],
    words: ["bref", "attends je te raconte", "et aussi—"], action: "*miaule sans reprendre son souffle*"
  },
  zen: {
    human: "Le·la cool imperturbable", emoji: "☕",
    F: ["Zoë Kravitz"], M: ["Pharrell Williams"],
    words: ["tranquille", "no stress", "peace"], action: "*s'étire nonchalamment, zéro pression*"
  }
};

const DOMINANT_ADJ = {
  playfulness: "très joueur·se", laziness: "profondément marmotte", affection: "ultra câlin·e",
  independence: "farouchement indépendant·e", chattiness: "vraiment bavard·e", curiosity: "insatiablement curieux·se"
};

// Construit le persona à partir du profil (draft ou myCat).
export function synthesizePersona(cat){
  const key = cat.archetype?.key && PERSONAS[cat.archetype.key] ? cat.archetype.key : "potdecolle";
  const base = PERSONAS[key];
  const rng = new RNG(hashStr((cat.name||"chat") + key + JSON.stringify(cat.stats||{})));

  // Célébrité selon le genre (repli sur la liste combinée)
  const list = (cat.gender === "male" ? base.M : base.F);
  const pool = (list && list.length) ? list : [...(base.F||[]), ...(base.M||[])];
  const celeb = pool[Math.floor(rng.float()*pool.length)] || "une star discrète";

  // Nuance issue des curseurs : stat dominante
  const stats = cat.stats || {};
  let domKey = null, domVal = -1;
  for(const k of Object.keys(stats)){ if(stats[k] > domVal){ domVal = stats[k]; domKey = k; } }
  const nuance = domKey ? DOMINANT_ADJ[domKey] : "attachant·e";

  const blurb = `${base.human}, version ${nuance} — un peu comme ${celeb}.`;

  return {
    key, human: base.human, celeb, emoji: base.emoji,
    nuance, blurb,
    // on garde les tics pour le stylizer (sérialisable)
    words: base.words, action: base.action
  };
}

// Restyle une réplique du chat de l'utilisateur selon son persona (léger, probabiliste).
export function stylizeUserLine(text, persona, rng){
  if(!persona) return text;
  const base = PERSONAS[persona.key];
  if(!base) return text;
  let out = text;

  // 1) glisse parfois une action signature si la ligne n'en a pas déjà
  if(!/\*/.test(out) && rng.float() < 0.5){
    out = `${base.action} ${out}`;
  }
  // 2) glisse parfois un tic de langage en fin de phrase
  if(rng.float() < 0.4){
    const w = base.words[Math.floor(rng.float()*base.words.length)];
    out = out.replace(/\s*$/, "") + ` — ${w}.`;
  }
  // 3) emoji signature en fin, si pas déjà surchargé d'emojis
  if(rng.float() < 0.5 && !out.includes(base.emoji)){
    out = out + " " + base.emoji;
  }
  return out;
}

export function personaLabel(persona){
  if(!persona) return "";
  return `${persona.emoji} ${persona.human} · un peu comme ${persona.celeb}`;
}
