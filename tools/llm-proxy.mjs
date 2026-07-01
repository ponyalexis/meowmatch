#!/usr/bin/env node
/* ============================================================
   MeowMatch — Proxy LLM (Claude) minimal, ZÉRO dépendance.
   ------------------------------------------------------------
   Détient la clé API côté serveur (jamais côté front) et relaie les
   requêtes du dialogue vers l'API Anthropic. Le front (js/engine/llm-adapter.js)
   pointe son `endpoint` vers http://localhost:8787/ .

   Lancer :
     ANTHROPIC_API_KEY=sk-ant-... node tools/llm-proxy.mjs
     (ou : npm run proxy)   ·   port par défaut 8787, override via PORT=

   Modes :
     • { mode:"choice-turn", system, history, model } -> { ai, topic, choices:[{beat,int,label,line}] }
       (structured outputs : JSON garanti, prêt pour le moteur de dialogue)
     • { system, history, count }                     -> { messages:[{from,text}] }  (conversation auto chat↔chat)

   Modèle : claude-opus-4-8 par défaut (finesse). Pour réduire coût/latence,
   le front peut envoyer model:"claude-haiku-4-5" ou "claude-sonnet-5".
   Nécessite Node 18+ (fetch global). Testé en Node 20.
   ============================================================ */

import http from "node:http";

const KEY  = process.env.ANTHROPIC_API_KEY;
const PORT = parseInt(process.env.PORT || "8787", 10);
const API  = "https://api.anthropic.com/v1/messages";

const BEATS = ["charm","play","tease","food","brag","aloof","sincere","cheeky"];

// Schéma de sortie structurée du tour à choix — garantit un JSON exploitable.
const CHOICE_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["ai", "topic", "choices"],
  properties: {
    ai:     { type: "string" },
    topic:  { type: "string" },
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

function historyToText(history = []){
  return history.map(m => {
    const who = m.from === "me" ? "Chat du joueur" : (m.from === "cat" ? "Chat d'en face" : m.from);
    return `${who} : ${m.text}`;
  }).join("\n");
}

async function callClaude(body){
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "x-api-key": KEY,
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

async function choiceTurn(req){
  const model = req.model || "claude-opus-4-8";
  const data = await callClaude({
    model,
    max_tokens: 900,
    system: req.system,
    output_config: { format: { type: "json_schema", schema: CHOICE_SCHEMA } },
    messages: [{
      role: "user",
      content: `Historique récent :\n${historyToText(req.history)}\n\nProduis le prochain tour (relance du chat d'en face + 3 à 4 choix pour le joueur).`
    }]
  });
  // Avec structured outputs, le texte de sortie EST le JSON demandé.
  return JSON.parse(textOf(data));
}

async function autoChat(req){
  const model = req.model || "claude-opus-4-8";
  const data = await callClaude({
    model,
    max_tokens: 700,
    system: req.system,
    messages: [{
      role: "user",
      content: `Historique :\n${historyToText(req.history)}\n\nÉcris les ${req.count || 4} prochains messages (alternés), une ligne chacun préfixé par 'A:' ou 'B:'.`
    }]
  });
  const messages = textOf(data).split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    const m = /^([AB])\s*:\s*(.*)$/.exec(l);
    return m ? { from: m[1], text: m[2] } : null;
  }).filter(Boolean);
  return { messages };
}

const server = http.createServer(async (req, res) => {
  // CORS : le front est servi sur un autre port.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if(req.method === "OPTIONS"){ res.writeHead(204).end(); return; }
  if(req.method !== "POST"){ res.writeHead(405).end("POST only"); return; }
  if(!KEY){ res.writeHead(500).end(JSON.stringify({ error: "ANTHROPIC_API_KEY manquant côté serveur" })); return; }

  let raw = "";
  req.on("data", c => { raw += c; if(raw.length > 1e6) req.destroy(); });
  req.on("end", async () => {
    try {
      const body = JSON.parse(raw || "{}");
      const out = body.mode === "choice-turn" ? await choiceTurn(body) : await autoChat(body);
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(out));
    } catch(e){
      console.error("✗", e.message);
      res.writeHead(502, { "content-type": "application/json" }).end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🐾 MeowMatch LLM proxy sur http://localhost:${PORT}  (modèle défaut : claude-opus-4-8)`);
  if(!KEY) console.warn("⚠️  ANTHROPIC_API_KEY non défini — les requêtes renverront une erreur 500.");
});
