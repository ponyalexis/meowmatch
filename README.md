# 🐾 MeowMatch — l'app de rencontre pour chats

Une webapp mobile (quasi-PWA) façon **Tinder / Hinge**, mais pour **chats parisiens**.
On crée le profil (riche) de son chat, on swipe, on matche — puis on **lit les conversations
que les IA des chats tiennent entre elles**. Tout est prêt à tester avec une **seed de 100 chats**.

## ✨ Ce qu'il y a dedans

- **Onboarding** en 5 étapes (identité, vibe, tempérament, recherche, géoloc) — ou profil express.
- **Swipe deck** : glisser/drag, boutons like/nope/coup-de-cœur/rewind, carrousel photo, tags « univers », **géolocalisation** + filtre par rayon.
- **Profils riches façon Hinge** : 5 photos par chat dans divers univers, bio, prompts, traits, barres de tempérament, favoris, quartier, note de l'humain.
- **Matchs + modale de match** avec confettis.
- **Moteur de conversation IA féline** (`js/engine/chat-engine.js`) : deux agents-chats discutent tour à tour via un système de *beats* (reniflage → curiosité → jeu → flirt → tendresse), personas pondérés par les stats, arc d'affinité, « parle chat » (ronrons, actions en *italique*, miaous, fautes de patte). Cute mais jamais forcé.
- **Apprentissage** : réagis aux messages (❤️ 😹 👎) → le moteur ajuste ses poids en local et devient plus drôle. Niveau visible sur l'écran « Mon chat ».
- **PWA** : `manifest.webmanifest` + `sw.js` (installable, cache offline de l'app shell).
- **Seed déterministe de 100 chats** (`js/data/seed.js`) : quartiers réels de Paris, races, archétypes, photos réalistes via [cataas.com](https://cataas.com) avec fallback SVG offline.
- **Prompt Google Stitch** prêt à coller → `STITCH_PROMPT.md`.

## ▶️ Lancer en local

L'app utilise des **modules ES** + un **service worker** → il faut un petit serveur (pas `file://`).

```bash
cd meowmatch

# au choix :
npx serve .            # puis ouvrir l'URL affichée
# ou
python3 -m http.server 8080   # puis http://localhost:8080
```

Ouvre ensuite sur mobile (ou en mode responsive du navigateur, ~390px de large).
Pour tester la géoloc et l'installation PWA, sers en HTTPS (ex. `npx serve` + un tunnel, ou déploie sur Netlify/Vercel/GitHub Pages).

> 📸 Les photos viennent de cataas.com (vraies photos de chats). Hors-ligne, un avatar SVG mignon prend le relais automatiquement.

## 🧠 Brancher un vrai LLM (optionnel)

Par défaut, tout est **généré localement** (aucune clé, aucun réseau requis pour les dialogues).
Pour un rendu encore plus riche, tu peux brancher **Claude** — mais **jamais** avec la clé côté navigateur.
Monte un petit **proxy backend** qui détient la clé et expose un endpoint `POST` :

**Requête** (envoyée par l'app) :
```json
{ "model": "claude-haiku-4-5-20251001", "system": "…prompt système cute…", "history": [{"from":"A","text":"…"}], "count": 2 }
```

**Réponse attendue** :
```json
{ "messages": [ { "from": "A", "text": "*ronronne* …" }, { "from": "B", "text": "…" } ] }
```

Le prompt système est déjà construit pour toi dans `js/engine/llm-adapter.js` (`buildSystemPrompt`).
Renseigne ensuite l'endpoint dans l'app : **Mon chat → ✨ Moteur IA avancé**.
Modèles conseillés : `claude-haiku-4-5-20251001` (rapide/éco) ou `claude-sonnet-5` (plus fin).

## 🗂️ Structure

```
meowmatch/
├─ index.html                 # shell + tab bar
├─ manifest.webmanifest       # PWA
├─ sw.js                      # service worker (cache offline)
├─ css/styles.css             # design system (thème Parisien)
├─ assets/icon.svg            # icône app
├─ js/
│  ├─ app.js                  # router + toutes les vues (swipe, chat, profil…)
│  ├─ store.js                # état + persistance localStorage
│  ├─ rng.js                  # PRNG déterministe
│  ├─ data/pools.js           # réservoirs de contenu FR (noms, races, quartiers…)
│  ├─ data/seed.js            # génération des 100 profils + géoloc + photos
│  └─ engine/
│     ├─ chat-engine.js       # moteur de conversation féline + apprentissage
│     └─ llm-adapter.js       # branchement LLM optionnel (proxy)
├─ STITCH_PROMPT.md           # prompt Google Stitch (thème)
└─ README.md
```

## 🔧 Réglages rapides

- **Nombre de chats** : `Store.CATS = generateSeed(100)` dans `js/store.js`.
- **Proportion de bots IA** : `isBot: rng.bool(0.35)` dans `js/data/seed.js`.
- **Rayon par défaut / filtre** : `settings` dans `js/store.js`.
- **Répliques du moteur** : objet `LINES` dans `js/engine/chat-engine.js` (ajoute des beats/templates, ça enrichit direct).

Fait avec 🐾 à Paris.
