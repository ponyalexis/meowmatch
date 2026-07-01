# Prompt Google Stitch — thème MeowMatch

Colle le bloc ci-dessous dans **Google Stitch** (mode *Text → Design*, plateforme **Mobile**).
Un prompt court en anglais donne souvent de meilleurs résultats sur Stitch ; une version FR est fournie ensuite.

---

## ▶︎ Version à coller (EN, recommandée pour Stitch)

```
Design a mobile dating app called "MeowMatch" — a Tinder/Hinge-style app but for CATS,
made for Parisians aged 20–50 (the classic dating-app crowd). Warm, cozy, a little chic
and editorial — think a Parisian café meets a design-forward pet brand. Cute but NEVER
childish or babyish; tasteful and premium.

ART DIRECTION
- Mood: warm, tender, sophisticated, playful. Cream paper background, soft shadows,
  generous rounded corners (18–26px), lots of breathing room.
- Color palette:
    Background cream  #FBF7F0
    Ink / text        #2A2432
    Primary coral     #FF7A6B  (CTAs, active states, warm gradient start)
    Peach             #FFB6A3
    Gold accent       #E8B04B
    Plum (secondary)  #6B4E71
    Sage / success    #8FB09A
  Signature gradient: 135° from coral #FF7A6B → peach #FFB6A3 → gold #E8B04B.
- Typography: elegant high-contrast serif for headings (Fraunces / Playfair vibe),
  clean geometric sans for body (Inter). French UI copy.
- Iconography: rounded, friendly line icons + a subtle paw-print motif. A few tasteful
  cat emojis (🐾 😻 🐱) as accents, used sparingly.
- Imagery: real photographic cat portraits in Parisian apartment settings (sofas,
  windowsills, radiators, golden hour), shown in tall 4:5 rounded cards.

SCREENS TO GENERATE
1. Onboarding / splash: big serif headline "Trouvez l'âme sœur de votre chat", warm
   gradient accents, floating cat & paw motifs, primary CTA "Créer le profil de mon chat".
2. Discover / swipe: full-bleed cat photo card with rounded corners, photo progress
   dots at top, a small "universe" tag chip (e.g. "Golden hour"), name + age + distance
   overlay at bottom over a dark gradient scrim, and a row of circular action buttons
   (rewind, nope ✖️, super-like ⭐, like ❤️) floating below.
3. Profile detail (Hinge-style): vertical scroll of stacked photo cards interleaved with
   prompt cards on plum gradient ("Mon dimanche idéal…"), personality trait chips, and a
   temperament section with little progress bars (Joueur, Câlin, Marmotte…).
4. Matches list: horizontal row of round "new match" avatars with coral rings, then a
   list of conversation rows with avatar, name, snippet, timestamp, unread dot.
5. Chat: two cats' AI talking — chat bubbles (incoming = white, outgoing = coral gradient),
   small round avatars beside bubbles, a typing indicator, an "affinity" heart progress
   bar at top, and a bottom bar with "▶︎ Auto" toggle + "Générer la suite" button.
6. Bottom tab bar (frosted white, blurred): Découvrir 🔥 · Matchs 💬 · Mon chat 🐱.

COMPONENTS / STYLE TOKENS
- Buttons: pill/rounded 14px, primary uses the coral→gold gradient with soft drop shadow.
- Cards: white, 1px warm border, soft shadow (0 10px 30px rgba(42,36,50,.12)).
- Chips: rounded-full, filled plum or coral when active.
- Match celebration modal: dark plum radial background, gradient headline "C'est un match !",
  two overlapping circular cat photos, confetti of 🐾💛✨.

Make it feel like a real, shippable French dating app — premium, warm, and full of feline charm.
```

---

## ▶︎ Variante FR (si tu préfères prompter en français)

```
Conçois une app mobile de rencontre nommée « MeowMatch » : un Tinder/Hinge mais pour CHATS,
pensée pour des Parisien·ne·s de 20 à 50 ans. Ambiance chaleureuse, tendre, un brin chic et
éditoriale — un café parisien qui rencontrerait une marque premium pour animaux. Mignon mais
jamais enfantin. Fond crème #FBF7F0, texte encre #2A2432, corail #FF7A6B en couleur primaire,
pêche #FFB6A3, or #E8B04B, prune #6B4E71 en secondaire. Dégradé signature corail→pêche→or.
Titres en serif élégant (type Fraunces), texte en sans (Inter), interface en français, motif
patte discret, coins arrondis 18–26px, ombres douces. Écrans : onboarding, swipe (carte photo
plein cadre + boutons ronds), profil détaillé façon Hinge (photos + cartes « prompt » sur
dégradé prune + barres de tempérament), liste de matchs, chat entre deux IA (bulles blanches /
bulles dégradé corail, barre d'affinité en cœur), et une tab bar givrée en bas. Rends-le premium
et prêt à shipper.
```

---

### Astuces Stitch
- Génère **écran par écran** si tu veux plus de contrôle : lance d'abord *Discover*, puis demande « same style, now the Chat screen ».
- Après génération, tu peux exporter le **code / Figma** et récupérer les **tokens de couleur** — ils correspondent déjà à `css/styles.css` de cette app, donc l'intégration est directe.
- Pour rester raccord avec la démo : garde le corail `#FF7A6B` comme couleur d'action et le dégradé corail→or sur les CTA principaux.
