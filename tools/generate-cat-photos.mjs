#!/usr/bin/env node
/* ============================================================
   MeowMatch — Génération des photos de chats par IA
   ------------------------------------------------------------
   Pour CHAQUE chat de la seed :
     1) SOURCE la vraie photo cataas déjà utilisée (référence d'identité).
     2) Construit un prompt "scène de vie courante" selon son ARCHÉTYPE.
     3) Génère 5 images via IMAGE-TO-IMAGE (le meilleur modèle réaliste que
        TU configures), conditionnées sur la référence -> même chat, 5 scènes.
     4) Sauve dans assets/cats/<catId>/<k>.jpg et écrit le manifeste
        js/data/generated-photos.js (que l'app lit automatiquement).

   ⚠️ La génération d'images nécessite une clé d'API (aucun modèle d'image
   n'est embarqué). Le provider est PLUGGABLE : renseigne les variables
   d'environnement puis lance le script. Sans clé, utilise --dry-run pour
   inspecter les prompts.

   Prérequis : Node >= 18 (fetch global).

   Usage :
     IMG_API_URL=... IMG_API_KEY=... IMG_MODEL=... node tools/generate-cat-photos.mjs
     node tools/generate-cat-photos.mjs --dry-run          # affiche les prompts
     node tools/generate-cat-photos.mjs --limit 5          # ne traite que 5 chats
     node tools/generate-cat-photos.mjs --strength 0.55    # force de l'img2img

   Contrat provider (adapte callImageModel ci-dessous à ton API) :
     entrée  : { model, prompt, negativePrompt, initImageB64, strength }
     sortie  : Buffer JPEG (l'image générée)
   ============================================================ */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSeed } from "../js/data/seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i+1] : def; };
const DRY = args.includes("--dry-run");
const LIMIT = parseInt(opt("--limit", "0"), 10) || 0;
const STRENGTH = parseFloat(opt("--strength", "0.55"));   // 0=copie la réf, 1=ignore la réf
const CONCURRENCY = parseInt(opt("--concurrency", "3"), 10);

const CFG = {
  url: process.env.IMG_API_URL || "",
  key: process.env.IMG_API_KEY || "",
  model: process.env.IMG_MODEL || "flux-1.1-pro",   // ex: "flux-1.1-pro", "imagen-3", "gpt-image-1", "sd3.5-large"
};

// Couleur FR -> anglais (les modèles rendent mieux en anglais)
const COAT_EN = {
  noir:"sleek black", roux:"ginger orange", blanc:"pure white", gris:"blue-grey",
  "tigré":"brown tabby", calico:"calico tortoiseshell", "crème":"cream-colored",
  bicolore:"black-and-white tuxedo", divers:""
};

function buildPrompt(cat, scene){
  const coat = COAT_EN[cat.color] || "";
  return [
    `Editorial, photorealistic photograph of a ${coat} domestic cat`,
    `${scene}.`,
    `Cozy Parisian apartment, warm natural window light, shallow depth of field,`,
    `premium lifestyle magazine aesthetic, 4:5 portrait, highly detailed fur, candid, no text.`,
    `Keep the SAME cat as the reference image: identical coat color, pattern and morphology.`
  ].join(" ");
}
const NEGATIVE = "deformed, extra limbs, extra tails, two cats, human faces, watermark, text, logo, cartoon, illustration, blurry, low quality";

/* ---- Adapte CETTE fonction à ton fournisseur d'images ----
   Doit renvoyer un Buffer JPEG. Exemple de forme générique ci-dessous. */
async function callImageModel({ model, prompt, negativePrompt, initImageB64, strength }){
  if(!CFG.url) throw new Error("IMG_API_URL non défini");
  const res = await fetch(CFG.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${CFG.key}` },
    body: JSON.stringify({
      model,
      prompt,
      negative_prompt: negativePrompt,
      image: initImageB64,           // image de référence (base64) pour l'img2img
      image_strength: strength,      // conditionnement identité
      width: 720, height: 900, output_format: "jpeg"
    })
  });
  if(!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0,200)}`);
  const data = await res.json();
  // Adapte selon ta réponse : { image_b64 } ou { url } ...
  if(data.image_b64) return Buffer.from(data.image_b64, "base64");
  if(data.url){ const img = await fetch(data.url); return Buffer.from(await img.arrayBuffer()); }
  if(Array.isArray(data.images) && data.images[0]?.b64_json) return Buffer.from(data.images[0].b64_json, "base64");
  throw new Error("Réponse provider non reconnue — adapte callImageModel()");
}

async function fetchReference(imageId){
  const url = `https://cataas.com/cat/${imageId}?width=720&height=900&type=square&position=center`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`cataas ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function processCat(cat, manifest){
  const refBuf = DRY ? null : await fetchReference(cat.imageId);
  const refB64 = refBuf ? refBuf.toString("base64") : null;
  const dir = path.join(ROOT, "assets", "cats", cat.id);
  if(!DRY) await fs.mkdir(dir, { recursive: true });
  const urls = [];
  for(let k=0; k<cat.photos.length; k++){
    const scene = cat.photos[k].scene || cat.photos[k].caption;
    const prompt = buildPrompt(cat, scene);
    const outRel = `assets/cats/${cat.id}/${k}.jpg`;
    if(DRY){ console.log(`  [${cat.id}#${k}] ${prompt}`); urls.push(outRel); continue; }
    const outAbs = path.join(ROOT, outRel);
    try { await fs.access(outAbs); urls.push(outRel); continue; } catch {}   // resume : skip si déjà généré
    const jpg = await callImageModel({ model: CFG.model, prompt, negativePrompt: NEGATIVE, initImageB64: refB64, strength: STRENGTH });
    await fs.writeFile(outAbs, jpg);
    urls.push(outRel);
    console.log(`  ✓ ${outRel}`);
  }
  manifest[cat.id] = urls;
}

async function writeManifest(manifest){
  const body = `/* Généré par tools/generate-cat-photos.mjs — ne pas éditer à la main. */
export const GENERATED = ${JSON.stringify(manifest, null, 0)};
`;
  await fs.writeFile(path.join(ROOT, "js", "data", "generated-photos.js"), body);
}

async function main(){
  let cats = generateSeed(100);
  if(LIMIT) cats = cats.slice(0, LIMIT);
  console.log(`${DRY ? "DRY-RUN" : "Génération"} · ${cats.length} chats × 5 photos · modèle ${CFG.model} · strength ${STRENGTH}`);
  if(!DRY && !CFG.url){ console.error("\n❌ IMG_API_URL / IMG_API_KEY manquants. Utilise --dry-run pour voir les prompts, ou configure ton provider."); process.exit(1); }

  const manifest = {};
  // pool de concurrence simple
  let idx = 0;
  async function worker(){ while(idx < cats.length){ const c = cats[idx++]; try { await processCat(c, manifest); } catch(e){ console.error(`  ✗ ${c.id}: ${e.message}`); } } }
  await Promise.all(Array.from({length: Math.max(1, CONCURRENCY)}, worker));

  if(!DRY){ await writeManifest(manifest); console.log(`\n✅ Manifeste écrit : js/data/generated-photos.js (${Object.keys(manifest).length} chats)`); }
  else console.log("\n(dry-run : aucune image générée, aucun fichier écrit)");
}

main().catch(e => { console.error(e); process.exit(1); });
