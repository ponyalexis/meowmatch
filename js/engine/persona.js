/* ============================================================
   MeowMatch — Synthèse de PERSONA du chat de l'utilisateur
   ------------------------------------------------------------
   À partir des inputs d'onboarding (archétype, curseurs, traits), on déduit :
     • un ARCHÉTYPE HUMAIN noble ("s'il était humain à travers les âges…")
     • une GRANDE FIGURE HISTORIQUE de référence ("dans la lignée de…")
     • un STYLE DE PAROLE (emoji, tics, transformations)
   -> l'IA de son chat parle alors exactement comme l'utilisateur l'imagine.
   Déterministe et hors-ligne.
   ============================================================ */

import { RNG, hashStr } from "../rng.js";

// Un persona par archétype de chat, incarné par de grandes figures historiques.
const PERSONAS = {
  potdecolle: {
    human: "L'âme dévouée", emoji: "🫶",
    F: ["Pénélope d'Ithaque", "Joséphine de Beauharnais", "Héloïse d'Argenteuil"],
    M: ["Roméo Montaigu", "Orphée", "Abélard"],
    words: ["mon cœur", "reste près de moi", "à jamais tien·ne"], action: "*se love contre toi et ronronne fidèlement*"
  },
  aventurier: {
    human: "L'explorateur·rice intrépide", emoji: "🧭",
    F: ["Amelia Earhart", "Alexandra David-Néel", "Jeanne Baret"],
    M: ["Marco Polo", "Ernest Shackleton", "Ibn Battûta"],
    words: ["cap sur l'inconnu", "à l'aventure", "viens explorer"], action: "*oreilles dressées, prêt·e à partir en expédition*"
  },
  diva: {
    human: "L'âme souveraine", emoji: "👑",
    F: ["Cléopâtre", "Marie-Antoinette", "Catherine II de Russie"],
    M: ["Louis XIV, le Roi-Soleil", "Ramsès II", "Le Prince de Machiavel"],
    words: ["évidemment", "on m'admire", "je règne ici"], action: "*rejette sa fourrure en arrière avec une majesté royale*"
  },
  chasseur: {
    human: "Le·la stratège conquérant·e", emoji: "🌙",
    F: ["Boudicca", "Artémise Ire de Carie", "Jeanne d'Arc"],
    M: ["Alexandre le Grand", "Napoléon Bonaparte", "Gengis Khan"],
    words: ["je t'ai repéré·e", "aucune retraite", "à la conquête"], action: "*pupilles dilatées, tel·le un fauve à l'affût*"
  },
  philosophe: {
    human: "L'esprit contemplatif", emoji: "🧘",
    F: ["Hypatie d'Alexandrie", "Simone Weil"],
    M: ["Socrate", "Marc Aurèle", "Confucius"],
    words: ["au fond des choses…", "tout est éphémère", "médite avec moi"], action: "*inspire lentement, le regard perdu dans l'infini*"
  },
  clown: {
    human: "L'esprit facétieux", emoji: "🤹",
    F: ["Sarah Bernhardt"],
    M: ["Molière", "Rabelais", "Charlie Chaplin"],
    words: ["attends la chute", "hé hé", "quelle comédie"], action: "*tombe du canapé exprès puis salue son public imaginaire*"
  },
  gourmand: {
    human: "L'épicurien·ne raffiné·e", emoji: "🍤",
    F: ["Catherine de Médicis"],
    M: ["Auguste Escoffier", "Brillat-Savarin", "Épicure"],
    words: ["à table !", "un délice", "on partage le festin ?"], action: "*hume l'air en fin·e gastronome*"
  },
  athlete: {
    human: "L'athlète héroïque", emoji: "🏃",
    F: ["Atalante", "Kynisca de Sparte"],
    M: ["Milon de Crotone", "Léonidas de Sparte", "Jesse Owens"],
    words: ["en avant", "encore un exploit", "aucune limite"], action: "*bondit avec la grâce d'un·e champion·ne olympique*"
  },
  timide: {
    human: "L'âme sensible et secrète", emoji: "🙈",
    F: ["Emily Dickinson", "Jane Austen"],
    M: ["Franz Kafka", "Frédéric Chopin", "Vermeer"],
    words: ["*chuchote*", "euh…", "si tu veux bien"], action: "*se dissimule à demi, timide comme un poète*"
  },
  seducteur: {
    human: "Le·la séducteur·rice légendaire", emoji: "😻",
    F: ["Cléopâtre", "Lou Andreas-Salomé"],
    M: ["Casanova", "Lord Byron"],
    words: ["rien que toi", "approche…", "laisse-toi charmer"], action: "*regard envoûtant, digne d'un·e séducteur·rice d'antan*"
  },
  bavard: {
    human: "Le·la grand·e orateur·rice", emoji: "🗣️",
    F: ["Madame de Sévigné", "Simone de Beauvoir"],
    M: ["Cicéron", "Oscar Wilde"],
    words: ["laisse-moi te dire", "et par ailleurs—", "bref, magnifique"], action: "*miaule avec l'éloquence d'un·e tribun·e*"
  },
  zen: {
    human: "Le·la sage serein·e", emoji: "☕",
    F: ["Hildegarde de Bingen"],
    M: ["Lao Tseu", "Bouddha", "Diogène"],
    words: ["tout va bien", "sans hâte", "en paix"], action: "*s'étire avec la sérénité d'un·e maître zen*"
  }
};

const DOMINANT_ADJ = {
  playfulness: "espiègle", laziness: "d'une nonchalance royale", affection: "profondément tendre",
  independence: "farouchement libre", chattiness: "à l'éloquence intarissable", curiosity: "insatiablement curieuse"
};

// Construit le persona à partir du profil (draft ou myCat).
export function synthesizePersona(cat){
  const key = cat.archetype?.key && PERSONAS[cat.archetype.key] ? cat.archetype.key : "potdecolle";
  const base = PERSONAS[key];
  const rng = new RNG(hashStr((cat.name||"chat") + key + JSON.stringify(cat.stats||{})));

  const list = (cat.gender === "male" ? base.M : base.F);
  const pool = (list && list.length) ? list : [...(base.F||[]), ...(base.M||[])];
  const celeb = pool[Math.floor(rng.float()*pool.length)] || "une grande âme oubliée";

  const stats = cat.stats || {};
  let domKey = null, domVal = -1;
  for(const k of Object.keys(stats)){ if(stats[k] > domVal){ domVal = stats[k]; domKey = k; } }
  const nuance = domKey ? DOMINANT_ADJ[domKey] : "attachante";

  const blurb = `${base.human}, une âme ${nuance} — dans la lignée de ${celeb}.`;

  return { key, human: base.human, celeb, emoji: base.emoji, nuance, blurb, words: base.words, action: base.action };
}

// Restyle une réplique du chat de l'utilisateur selon son persona (léger, probabiliste).
export function stylizeUserLine(text, persona, rng){
  if(!persona) return text;
  const base = PERSONAS[persona.key];
  if(!base) return text;
  let out = text;
  if(!/\*/.test(out) && rng.float() < 0.5) out = `${base.action} ${out}`;
  if(rng.float() < 0.4){ const w = base.words[Math.floor(rng.float()*base.words.length)]; out = out.replace(/\s*$/, "") + ` — ${w}.`; }
  if(rng.float() < 0.5 && !out.includes(base.emoji)) out = out + " " + base.emoji;
  return out;
}

export function personaLabel(persona){
  if(!persona) return "";
  return `${persona.emoji} ${persona.human} · dans la lignée de ${persona.celeb}`;
}
