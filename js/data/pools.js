// Réservoirs de contenu pour générer des profils de chats réalistes et parisiens.
// Tout est en français, ton tendre et un peu chic (cible : 20-50 ans, Paris).

export const NAMES = [
  "Minou","Félix","Pixel","Mochi","Nougat","Caramel","Suki","Loki","Gribouille","Réglisse",
  "Pompon","Biscotte","Oreo","Sushi","Praline","Gingembre","Moustache","Filou","Chaussette","Croquette",
  "Tigrou","Nala","Simba","Cléo","Isis","Ramsès","Newton","Voltaire","Dali","Frida",
  "Miles","Django","Billie","Ziggy","Bowie","Waffle","Pancake","Brioche","Muffin","Cannelle",
  "Noisette","Prune","Myrtille","Câline","Duchesse","Marquise","Bijou","Perle","Onyx","Ombre",
  "Nuage","Neige","Flocon","Plume","Comète","Luna","Melo","Yuki","Haku","Kiki",
  "Momo","Taco","Pesto","Olive","Basilic","Romarin","Gigi","Coco","Choupette","Minette",
  "Grisou","Charbon","Vanille","Sorbet","Macaron","Éclair","Truffe","Chocolat","Chipie","Fripon",
  "Zébulon","Titi","Milou","Roux","Iris","Jasmin","Saphir","Ambre","Réglisse II","Poivre",
  "Sel","Gaufrette","Merlin","Salem","Bagheera","Garfield","Pixel II","Domino","Panda","Boubou"
];

export const BREEDS = [
  {name:"Européen (chat de gouttière)", tag:"gouttière fier·e"},
  {name:"Maine Coon", tag:"géant·e doux"},
  {name:"Ragdoll", tag:"poupée de chiffon"},
  {name:"British Shorthair", tag:"peluche râleuse"},
  {name:"Bengal", tag:"petit léopard"},
  {name:"Siamois", tag:"bavard·e chic"},
  {name:"Chartreux", tag:"philosophe bleu"},
  {name:"Sphynx", tag:"nu·e et fier·e"},
  {name:"Persan", tag:"diva aplatie"},
  {name:"Norvégien", tag:"viking des forêts"},
  {name:"Sacré de Birmanie", tag:"gants blancs"},
  {name:"Abyssin", tag:"athlète roux"},
  {name:"Scottish Fold", tag:"oreilles pliées"},
  {name:"Angora turc", tag:"soie vivante"},
  {name:"Bombay", tag:"mini-panthère"},
  {name:"Écaille de tortue", tag:"caractère explosif"},
  {name:"Roux tigré", tag:"un seul neurone, partagé"},
  {name:"Tuxedo (noir & blanc)", tag:"toujours en costard"}
];

// Quartiers de Paris avec coordonnées approximatives (lat, lng)
export const NEIGHBORHOODS = [
  {name:"Le Marais (3e)", lat:48.8590, lng:2.3610},
  {name:"Le Marais (4e)", lat:48.8559, lng:2.3588},
  {name:"Canal Saint-Martin (10e)", lat:48.8710, lng:2.3660},
  {name:"Belleville (20e)", lat:48.8722, lng:2.3767},
  {name:"Ménilmontant (20e)", lat:48.8665, lng:2.3870},
  {name:"Bastille (11e)", lat:48.8532, lng:2.3690},
  {name:"Oberkampf (11e)", lat:48.8656, lng:2.3770},
  {name:"Montmartre (18e)", lat:48.8867, lng:2.3431},
  {name:"Abbesses (18e)", lat:48.8845, lng:2.3380},
  {name:"Pigalle (9e)", lat:48.8820, lng:2.3370},
  {name:"Saint-Germain-des-Prés (6e)", lat:48.8540, lng:2.3340},
  {name:"Latin (5e)", lat:48.8462, lng:2.3470},
  {name:"Butte-aux-Cailles (13e)", lat:48.8270, lng:2.3510},
  {name:"Batignolles (17e)", lat:48.8870, lng:2.3190},
  {name:"Montorgueil (2e)", lat:48.8650, lng:2.3480},
  {name:"République (11e)", lat:48.8676, lng:2.3630},
  {name:"Nation (12e)", lat:48.8482, lng:2.3958},
  {name:"Bercy (12e)", lat:48.8330, lng:2.3830},
  {name:"Passy (16e)", lat:48.8570, lng:2.2790},
  {name:"Convention (15e)", lat:48.8380, lng:2.2960},
  {name:"Alésia (14e)", lat:48.8280, lng:2.3270},
  {name:"Gambetta (20e)", lat:48.8650, lng:2.3990},
  {name:"Jourdain (19e)", lat:48.8790, lng:2.3890},
  {name:"Buttes-Chaumont (19e)", lat:48.8800, lng:2.3820}
];

export const GENDERS = [
  {key:"male", label:"Mâle", emoji:"♂️"},
  {key:"female", label:"Femelle", emoji:"♀️"}
];

// Archétypes / "vibes" — le cœur de la personnalité
export const ARCHETYPES = [
  {key:"potdecolle", label:"Le pot de colle", emoji:"🫂", desc:"Vit collé·e à son humain, ronronne pour deux."},
  {key:"aventurier", label:"L'aventurier du balcon", emoji:"🧗", desc:"Rêve de grand air, chasse les pigeons du 6e étage."},
  {key:"diva", label:"La diva du canapé", emoji:"👑", desc:"Exige le meilleur coussin et un public."},
  {key:"chasseur", label:"Le chasseur nocturne", emoji:"🌙", desc:"3h du matin = rodéo dans le couloir."},
  {key:"philosophe", label:"Le philosophe endormi", emoji:"🧘", desc:"18h de sieste, 6h de réflexion profonde."},
  {key:"clown", label:"Le clown", emoji:"🤹", desc:"Tombe du canapé exprès, adore ça."},
  {key:"gourmand", label:"Le·la gourmand·e", emoji:"🍤", desc:"Connaît l'heure du repas à la minute près."},
  {key:"athlete", label:"L'athlète", emoji:"🏃", desc:"Parkour intérieur niveau expert."},
  {key:"timide", label:"Le·la timide", emoji:"🙈", desc:"Vit sous le lit, sort quand vous dormez."},
  {key:"seducteur", label:"Le·la séducteur·rice", emoji:"😻", desc:"Un regard, et vous êtes à son service."},
  {key:"bavard", label:"Le·la bavard·e", emoji:"🗣️", desc:"Commente absolument tout, à voix haute."},
  {key:"zen", label:"Le·la zen", emoji:"☕", desc:"Rien ne l'atteint. Sauf l'ouvre-boîte."}
];

export const PERSONALITY_TAGS = [
  "câlin·e","indépendant·e","joueur·se","bavard·e","gourmand·e","paresseux·se","curieux·se",
  "malicieux·se","affectueux·se","territorial·e","aventurier·e","froussard·e","dominant·e",
  "pot de colle","nocturne","matinal·e","dodo pro","chasseur·se","ronronneur·se","boudeur·se",
  "acrobate","peace & love","diva","observateur·rice"
];

export const LOOKING_FOR = [
  "Un·e binôme de sieste sérieux·se 😴",
  "De l'aventure (et peut-être des chatons)",
  "Juste jouer, on verra bien 🎾",
  "Une relation exclusive sur le même radiateur",
  "Des copains de fenêtre pour espionner la rue",
  "Un·e partenaire de crime (le sapin de Noël)",
  "Rien de sérieux, je ronronne et je pars",
  "Le grand amour, façon dessin animé 💘",
  "Quelqu'un qui partage ses croquettes premium"
];

export const DEALBREAKERS = [
  "Ne supporte pas les chiens 🐕‍🦺",
  "Aspirateur = c'est mort",
  "Doit aimer les cartons",
  "Pas de bruit après 22h (ou alors avec moi)",
  "Anti-concombre convaincu·e",
  "Refuse les croquettes bas de gamme",
  "Jalouse le laser rouge",
  "Veto sur les bains, non négociable"
];

export const FOODS = ["thon","poulet vapeur","pâtée en gelée","croquettes au saumon","crevettes","fromage (en cachette)","herbe à chat","lait sans lactose","dinde","emmental volé sur le plan de travail"];
export const TOYS = ["la balle en alu","le laser rouge","la canne à plumes","une chaussette orpheline","le bouchon de bouteille","un carton (tous les cartons)","une souris qui couine","le rideau du salon"];
export const SPOTS = ["le radiateur","le rebord de fenêtre","le panier à linge propre","le clavier de l'ordi","le sac Monoprix","le canapé (côté gauche)","la caisse de transport (par choix)","le lavabo de la salle de bain","sur la box internet (c'est chaud)"];
export const ACTIVITIES = ["observer les pigeons","faire tomber des objets","chasser des poussières invisibles","dormir en croissant","surveiller le frigo","escalader les rideaux","ronronner sur commande","bouder pour le principe"];

export const ZODIAC = ["♈ Bélier","♉ Taureau","♊ Gémeaux","♋ Cancer","♌ Lion","♍ Vierge","♎ Balance","♏ Scorpion","♐ Sagittaire","♑ Capricorne","♒ Verseau","♓ Poissons"];

// Univers photo — le "5 photos dans divers univers"
export const UNIVERSES = [
  "Golden hour sur le rebord ✨","Nap time","Chasseur·se du salon","Aventure sur le balcon",
  "Séance canapé","Portrait de star","Sous la couette","Le regard du frigo",
  "Escapade cartons","Zen sur le radiateur","Fenêtre sur cour","Après le laser (épuisé·e)"
];

// Bios — assemblées à partir de fragments pour varier
export const BIO_OPENERS = [
  "Chat de {hood}, {age} et déjà blasé·e des pigeons.",
  "Petit·e {breedtag} en quête de coussins et d'attention.",
  "On me dit {trait} mais franchement je préfère \"incompris·e\".",
  "Basé·e à {hood}, disponible pour siestes synchronisées.",
  "Expert·e en {activity}. Références sur demande.",
  "{age}, {breedtag}, et un avis très tranché sur les croquettes."
];
export const BIO_MIDS = [
  "Mon humain croit que c'est son appart. C'est mignon.",
  "Je réponds à mon nom quand ça m'arrange (rarement).",
  "Champion·ne officieux·se de {activity}.",
  "Je cherche quelqu'un qui respecte mes 16h de sommeil.",
  "Grand amour de {food}, ne le prenez pas mal.",
  "Ma langue d'amour, c'est de m'asseoir sur vous sans prévenir."
];
export const BIO_CLOSERS = [
  "Swipe à droite si tu ronronnes fort. 🐾",
  "Cherche co-chat pour surveiller la rue. Sérieux·ses uniquement.",
  "Pas de laser au 1er rendez-vous, je ne suis pas ce genre de chat.",
  "Promis, je ne fais tomber que 2-3 verres par jour.",
  "Si tu aimes les cartons, on va bien s'entendre.",
  "Team radiateur jusqu'à la fin."
];

// Prompts façon Hinge (question -> réponses possibles, écrites du point de vue du chat)
export const PROMPTS = [
  {q:"Mon talent le plus inutile…", a:[
    "Ouvrir les placards à 3h du matin.",
    "Faire semblant de mourir de faim devant une gamelle pleine.",
    "M'endormir dans exactement 4 secondes.",
    "Trouver le seul rayon de soleil de l'appart."
  ]},
  {q:"On matche si tu…", a:[
    "défends l'accès au radiateur avec moi.",
    "ne juges pas mes 19h de sieste.",
    "aimes les cartons autant que moi.",
    "partages ta pâtée sans faire d'histoires."
  ]},
  {q:"Mon dimanche idéal…", a:[
    "Fenêtre ouverte, pigeons TV, zéro effort.",
    "Sieste, croquettes, sieste, câlin, sieste.",
    "Chasse au reflet sur le mur puis coma.",
    "Sur le clavier pendant que l'humain télétravaille."
  ]},
  {q:"Ma plus grande peur…", a:[
    "L'aspirateur. C'est un dragon.",
    "Le fond de la gamelle.",
    "Le concombre (ne me demande pas).",
    "La porte de la salle de bain fermée."
  ]},
  {q:"Ce que je cherche vraiment…", a:[
    "Quelqu'un qui cligne des yeux lentement quand il me voit.",
    "Un·e complice pour les bêtises nocturnes.",
    "De la tendresse mais à MES conditions.",
    "Un genou chaud et disponible 24/7."
  ]},
  {q:"Un fait surprenant sur moi…", a:[
    "Je viens quand on m'appelle. Parfois. Une fois.",
    "Je ronronne même en dormant.",
    "J'ai un côté du visage préféré pour les photos.",
    "Je fais la fête à l'ouvre-boîte, pas à toi. Rien de perso."
  ]},
  {q:"Le moyen d'aller à mon cœur…", a:[
    "Des crevettes. Beaucoup de crevettes.",
    "Gratouille sous le menton, jamais le ventre (piège).",
    "Laisse un carton par terre, on verra la suite.",
    "Respecte mon espace, je viendrai (dans 3h)."
  ]}
];

// Notes de "propriétaire" pour l'ancrage réaliste
export const OWNER_NOTES = [
  "Adopté·e à la SPA de Gennevilliers, jamais regretté.",
  "Vit au 4e sans ascenseur, athlète malgré lui·elle.",
  "Partage l'appart avec un ficus qu'il·elle terrorise.",
  "A sa propre chaise à la table. On a abandonné.",
  "Trouvé·e sous une voiture à Belleville, aujourd'hui roi·reine du salon.",
  "Dort sur mon oreiller, moi sur le bord. C'est comme ça.",
  "Facture vétérinaire = crevettes uniquement, apparemment.",
  "Sonne à la fenêtre pour rentrer comme un·e humain·e."
];
