/* ============================================================
   MeowMatch — Probabilité de match
   ------------------------------------------------------------
   Chaque chat proposé reçoit un score de compatibilité (0-100) avec le
   chat de l'utilisateur. Deux dynamiques :
     • « qui se ressemble s'assemble » -> similarité des tempéraments
     • « les contraires s'attirent »   -> complémentarité (l'un comble l'autre)
   Chaque chat penche vers l'une des deux via son `attractMode`, ce qui
   donne des profils variés et des raisons lisibles.
   ============================================================ */

import { hashStr } from "../rng.js";

const STATS = ["playfulness","laziness","affection","independence","chattiness","curiosity"];

// Similarité : proche = compatible (qui se ressemble s'assemble).
function similarity(a, b){
  let sum = 0;
  for(const k of STATS) sum += 100 - Math.abs((a.stats[k]||50) - (b.stats[k]||50));
  return sum / STATS.length;
}

// Complémentarité : les curseurs qui s'équilibrent (somme ~100) = les contraires s'attirent.
function complementarity(a, b){
  let sum = 0;
  for(const k of STATS) sum += 100 - Math.abs((a.stats[k]||50) + (b.stats[k]||50) - 100);
  return sum / STATS.length;
}

// Score + raison. myCat = chat de l'utilisateur, cat = chat proposé.
export function matchProbability(myCat, cat){
  if(!myCat || !cat || !myCat.stats || !cat.stats){
    return { score: 60, mode: "similar", label: "Compatibilité à découvrir", reason: "" };
  }
  const sim = similarity(myCat, cat);
  const comp = complementarity(myCat, cat);
  const mode = cat.attractMode || "similar";

  let base = mode === "similar" ? (0.72*sim + 0.28*comp) : (0.72*comp + 0.28*sim);

  // Bonus doux : même quartier, affection réciproque élevée
  if(myCat.neighborhood === cat.neighborhood) base += 5;
  const mutualWarmth = ((myCat.stats.affection||50) + (cat.stats.affection||50)) / 2;
  base += (mutualWarmth - 50) * 0.06;

  // Petit grain déterministe par paire (pour ne pas avoir des scores trop lisses)
  const jitter = ((hashStr(myCat.name + cat.id) % 1000) / 1000 - 0.5) * 8;
  let score = Math.round(base + jitter);
  score = Math.max(28, Math.min(99, score));

  let label, reason;
  if(mode === "similar"){
    if(score >= 82){ label = "Deux âmes sœurs"; reason = "Vous vous ressemblez énormément."; }
    else if(score >= 62){ label = "Belle alchimie"; reason = "Des tempéraments qui se comprennent."; }
    else { label = "À apprivoiser"; reason = "Vous êtes différent·es, mais qui sait…"; }
  } else {
    if(score >= 82){ label = "Les opposés s'attirent"; reason = "Ce que l'un a, l'autre le complète."; }
    else if(score >= 62){ label = "Étincelle des contraires"; reason = "Vos différences créent la magie."; }
    else { label = "Choc des caractères"; reason = "Ça pourrait faire des étincelles… ou du grabuge."; }
  }
  return { score, mode, label, reason };
}
