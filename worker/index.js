/* ============================================================
   MeowMatch — Proxy LLM (Claude) pour Cloudflare Workers.
   ------------------------------------------------------------
   Détient la clé API côté serveur (secret Cloudflare) et relaie les tours de
   dialogue vers l'API Anthropic. Le front (js/engine/llm-adapter.js) pointe son
   `endpoint` vers l'URL du Worker (ex. https://meowmatch-llm.<toi>.workers.dev/).

   Déploiement : voir worker/README.md (npx wrangler deploy + secret).
   Modèle : claude-opus-4-8 par défaut ; le front peut envoyer
   claude-haiku-4-5 (plus rapide/moins cher) via les réglages « Moteur IA ».
   ============================================================ */

const API = "https://api.anthropic.com/v1/messages";
const BEATS = ["charm", "play", "tease", "food", "brag", "aloof", "sincere", "cheeky"];

// Origines autorisées (CORS). Ajoute la tienne si tu déploies ailleurs.
const ALLOWED_ORIGINS = [
  "https://ponyalexis.github.io",
  "http://localhost:8787",
  "http://localhost:3000",
  "http://localhost:5173"
];

// Schéma de sortie structurée -> JSON garanti exploitable par le moteur.
const CHOICE_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["ai", "topic", "choices"],
  properties: {
    ai:    { type: "string" },
    topic: { type: "string" },
    choices: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["beat", "int", "label", "line"],
        properties: {
          beat:  { type: "string", enum: BEATS },
          int:   { type: "integer", enum: [1, 2, 3] },
          label: { type: "string" },
          line:  { type: "string" }
        }
      }
    }
  }
};

function corsHeaders(origin){
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function json(obj, status, headers){
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}

function historyToText(history = []){
  return history.map(m => {
    const who = m.from === "me" ? "Chat du joueur" : (m.from === "cat" ? "Chat d'en face" : m.from);
    return `${who} : ${m.text}`;
  }).join("\n");
}

async function callClaude(body, key){
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

function textOf(data){
  return (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
}

async function choiceTurn(req, key){
  const data = await callClaude({
    model: req.model || "claude-opus-4-8",
    max_tokens: 900,
    system: req.system,
    output_config: { format: { type: "json_schema", schema: CHOICE_SCHEMA } },
    messages: [{
      role: "user",
      content: `Historique récent :\n${historyToText(req.history)}\n\nProduis le prochain tour : la relance du chat d'en face (qui RÉAGIT à la dernière réplique du joueur) + 3 à 4 choix pour le joueur.`
    }]
  }, key);
  return JSON.parse(textOf(data));
}

async function autoChat(req, key){
  const data = await callClaude({
    model: req.model || "claude-opus-4-8",
    max_tokens: 700,
    system: req.system,
    messages: [{
      role: "user",
      content: `Historique :\n${historyToText(req.history)}\n\nÉcris les ${req.count || 4} prochains messages (alternés), une ligne chacun préfixé par 'A:' ou 'B:'.`
    }]
  }, key);
  const messages = textOf(data).split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    const m = /^([AB])\s*:\s*(.*)$/.exec(l);
    return m ? { from: m[1], text: m[2] } : null;
  }).filter(Boolean);
  return { messages };
}

export default {
  async fetch(request, env){
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if(request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if(request.method !== "POST")    return json({ error: "POST only" }, 405, cors);
    if(!env.ANTHROPIC_API_KEY)       return json({ error: "ANTHROPIC_API_KEY non configuré (secret manquant)" }, 500, cors);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: "JSON invalide" }, 400, cors); }

    try {
      const out = body.mode === "choice-turn"
        ? await choiceTurn(body, env.ANTHROPIC_API_KEY)
        : await autoChat(body, env.ANTHROPIC_API_KEY);
      return json(out, 200, cors);
    } catch(e){
      return json({ error: e.message }, 502, cors);
    }
  }
};
