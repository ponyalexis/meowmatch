# MeowMatch — Proxy LLM (Cloudflare Worker)

Donne à l'app un **vrai** moteur de conversation (Claude) qui prend en compte tes
réponses. Gratuit (plan Workers free), pas de serveur à gérer. La clé API reste
côté serveur, jamais dans le navigateur.

## Prérequis
- Un compte Cloudflare (gratuit) : https://dash.cloudflare.com/sign-up
- Une clé API Anthropic : https://console.anthropic.com/settings/keys
- Node installé (pour `npx`)

## Déploiement (2 minutes)

Depuis ce dossier `worker/` :

```bash
# 1. Connexion Cloudflare (ouvre le navigateur)
npx wrangler login

# 2. Déploie le Worker
npx wrangler deploy

# 3. Pose ta clé Anthropic en SECRET (elle ne sera jamais visible)
npx wrangler secret put ANTHROPIC_API_KEY
#   -> colle ta clé sk-ant-... quand c'est demandé
```

`wrangler deploy` affiche l'URL publique, du type :
`https://meowmatch-llm.<ton-sous-domaine>.workers.dev`

## Brancher l'app
1. Ouvre l'app → réglages **« ✨ Moteur IA avancé »**.
2. **Endpoint** : colle l'URL du Worker (avec le `/` final).
3. **Modèle** : `claude-opus-4-8` (finesse) ou `claude-haiku-4-5` (plus rapide/moins cher).
4. Enregistre. Les dialogues passent maintenant par Claude — vraie conversation,
   relances qui rebondissent sur ce que tu dis, spectre infini.

Pour revenir au moteur local (hors-ligne), vide le champ Endpoint.

## Notes
- **CORS** : `index.js` autorise `https://ponyalexis.github.io` et `localhost`.
  Si tu héberges l'app ailleurs, ajoute ton origine dans `ALLOWED_ORIGINS`.
- **Coût** : chaque tour = 1 appel Claude. Haiku est ~5× moins cher qu'Opus et
  largement suffisant pour le jeu. Surveille l'usage dans la console Anthropic.
- **Sécurité** : le Worker est public. Pour un usage perso c'est ok ; si tu veux
  éviter tout abus de ta clé, tu peux plus tard ajouter un petit token partagé.
