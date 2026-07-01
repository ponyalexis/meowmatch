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
  provider: process.env.IMG_PROVIDER || "gemini",   // "gemini" (Nano Banana), "openai", "generic"
  url: process.env.IMG_API_URL || "",
  key: process.env.IMG_API_KEY || process.env.GEMINI_API_KEY || "",
  model: process.env.IMG_MODEL || "gemini-2.5-flash-image",  // Nano Banana par défaut
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

/* ---- Dispatch provider ---- */
async function callImageModel(a){
  if(CFG.provider === "gemini") return callGemini(a);
  if(CFG.provider === "openai") return callOpenAI(a);
  return callGeneric(a);
}

/* Nano Banana — Google Gemini 2.5 Flash Image (image + réf -> image éditée).
   Le mieux pour garder LE MÊME chat d'une scène à l'autre. */
async function callGemini({ model, prompt, initImageB64 }){
  if(!CFG.key) throw new Error("GEMINI_API_KEY manquant");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${CFG.key}`;
  const parts = [{ text: prompt }];
  if(initImageB64) parts.push({ inline_data: { mime_type: "image/jpeg", data: initImageB64 } });
  const res = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] })
  });
  if(!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0,200)}`);
  const data = await res.json();
  const out = data?.candidates?.[0]?.content?.parts?.find(p => p.inline_data || p.inlineData);
  const b64 = out?.inline_data?.data || out?.inlineData?.data;
  if(!b64) throw new Error("Gemini : pas d'image dans la réponse");
  return Buffer.from(b64, "base64");
}

/* OpenAI gpt-image-1 (édition à partir d'une image de référence). */
async function callOpenAI({ model, prompt, initImageB64 }){
  if(!CFG.key) throw new Error("IMG_API_KEY (OpenAI) manquant");
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${CFG.key}` },
    body: JSON.stringify({ model: model.startsWith("gpt-image")?model:"gpt-image-1", prompt, size: "1024x1024" })
  });
  if(!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0,200)}`);
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if(!b64) throw new Error("OpenAI : pas d'image dans la réponse");
  return Buffer.from(b64, "base64");
}

/* Générique : adapte à ton provider (fal, Replicate, proxy maison…). */
async function callGeneric({ model, prompt, negativePrompt, initImageB64, strength }){
  if(!CFG.url) throw new Error("IMG_API_URL non défini");
  const res = await fetch(CFG.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${CFG.key}` },
    body: JSON.stringify({ model, prompt, negative_prompt: negativePrompt, image: initImageB64, image_strength: strength, width: 720, height: 900, output_format: "jpeg" })
  });
  if(!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0,200)}`);
  const data = await res.json();
  if(data.image_b64) return Buffer.from(data.image_b64, "base64");
  if(data.url){ const img = await fetch(data.url); return Buffer.from(await img.arrayBuffer()); }
  if(Array.isArray(data.images) && data.images[0]?.b64_json) return Buffer.from(data.images[0].b64_json, "base64");
  throw new Error("Réponse provider non reconnue — adapte callGeneric()");
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
  console.log(`${DRY ? "DRY-RUN" : "Génération"} · ${cats.length} chats × 5 photos · provider ${CFG.provider} · modèle ${CFG.model}`);
  const needsKey = (CFG.provider === "gemini" || CFG.provider === "openai") && !CFG.key;
  const needsUrl = CFG.provider === "generic" && !CFG.url;
  if(!DRY && (needsKey || needsUrl)){
    console.error("\n❌ Config manquante. Ex : GEMINI_API_KEY=… node tools/generate-cat-photos.mjs   (ou --dry-run pour voir les prompts).");
    process.exit(1);
  }

  const manifest = {};
  // pool de concurrence simple
  let idx = 0;
  async function worker(){ while(idx < cats.length){ const c = cats[idx++]; try { await processCat(c, manifest); } catch(e){ console.error(`  ✗ ${c.id}: ${e.message}`); } } }
  await Promise.all(Array.from({length: Math.max(1, CONCURRENCY)}, worker));

  if(!DRY){ await writeManifest(manifest); console.log(`\n✅ Manifeste écrit : js/data/generated-photos.js (${Object.keys(manifest).length} chats)`); }
  else console.log("\n(dry-run : aucune image générée, aucun fichier écrit)");
}

main().catch(e => { console.error(e); process.exit(1); });
