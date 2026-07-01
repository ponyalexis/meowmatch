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

// Cohérence apparence : la couleur réelle de la photo (tag cataas) pilote la race,
// le descriptif de pelage et l'emoji. Le profil est ainsi cohérent de bout en bout.
export const COLOR_PROFILES = {
  noir:     { emoji:"🖤", coat:"au pelage noir de jais",        breeds:["Bombay","Chat noir de gouttière","Européen noir"] },
  roux:     { emoji:"🧡", coat:"roux flamboyant",               breeds:["Roux tigré","Maine Coon roux","Européen roux"] },
  blanc:    { emoji:"🤍", coat:"tout·e blanc·he immaculé·e",     breeds:["Angora turc","Persan blanc","Européen blanc"] },
  gris:     { emoji:"🩶", coat:"au pelage gris-bleu",           breeds:["Chartreux","British Shorthair","Bleu russe"] },
  "tigré":  { emoji:"🐯", coat:"au pelage tigré",               breeds:["Européen tigré","Bengal","Tabby classique"] },
  calico:   { emoji:"🎨", coat:"tricolore (robe calico)",       breeds:["Écaille de tortue","Calico","Européenne tricolore"] },
  "crème":  { emoji:"🤎", coat:"crème et caramel",              breeds:["Ragdoll","Sacré de Birmanie","Chat crème"] },
  bicolore: { emoji:"🐾", coat:"en smoking noir & blanc",        breeds:["Tuxedo (noir & blanc)","Européen bicolore"] },
  divers:   { emoji:"🐾", coat:"au charme unique",              breeds:["Européen (chat de gouttière)","Chat des toits parisiens"] }
};

// Variantes photo de secours (si pas d'images générées) : cadrages différents
// du MÊME chat, sans filtre "photobooth". Utilisé uniquement en fallback.
export const PHOTO_STYLES = [
  { q:"&position=center" },
  { q:"&position=top&brightness=1.04" },
  { q:"&position=bottom" },
  { q:"&position=left&brightness=1.03&saturation=1.06" },
  { q:"&position=right&saturation=1.08" }
];

// Scènes de vie courante par archétype -> légende affichée + description pour la
// génération d'images (5 par archétype, dans l'ordre des 5 photos).
export const ARCHETYPE_SCENES = {
  potdecolle: [
    { cap:"Lové contre son humain",         scene:"blotti tendrement contre l'épaule de son humain sur un canapé" },
    { cap:"Sur les genoux, refuse de bouger", scene:"installé sur les genoux de son humain qui télétravaille" },
    { cap:"À la fenêtre, à attendre",       scene:"assis à la fenêtre guettant le retour de son humain" },
    { cap:"Sieste sur l'oreiller partagé",  scene:"endormi sur un oreiller à côté d'un humain au réveil" },
    { cap:"Câlin du matin",                 scene:"réclamant un câlin en se frottant contre une jambe dans la cuisine" }
  ],
  aventurier: [
    { cap:"Exploration du balcon",          scene:"explorant prudemment un balcon parisien fleuri en hauteur" },
    { cap:"Perché sur la bibliothèque",     scene:"perché tout en haut d'une grande bibliothèque, fier" },
    { cap:"À l'affût derrière la vitre",    scene:"observant la rue derrière une fenêtre, curieux" },
    { cap:"En équilibre sur le rebord",     scene:"en équilibre sur le rebord d'une fenêtre ouverte" },
    { cap:"Découverte d'un carton",         scene:"la tête plongée dans un carton de déménagement mystérieux" }
  ],
  diva: [
    { cap:"Sur son trône de velours",       scene:"trônant majestueusement sur un fauteuil de velours" },
    { cap:"Pose royale au soleil",          scene:"posant élégamment dans un rayon de soleil doré" },
    { cap:"Toilette raffinée",              scene:"faisant sa toilette avec grâce sur un plaid douillet" },
    { cap:"Le plus beau coussin",           scene:"allongé sur le plus luxueux coussin du salon" },
    { cap:"Regard hautain",                 scene:"jetant un regard hautain depuis le haut du canapé" }
  ],
  chasseur: [
    { cap:"Embuscade derrière le rideau",   scene:"tapi en embuscade derrière un rideau, prêt à bondir" },
    { cap:"Guet du pigeon",                 scene:"fixant intensément un pigeon derrière la vitre" },
    { cap:"Bond sur la canne à plumes",     scene:"bondissant sur une canne à plumes en plein jeu" },
    { cap:"Yeux de traqueur",               scene:"les pupilles dilatées, en position de chasse au sol" },
    { cap:"Retour de chasse",               scene:"trottant fièrement avec une souris en peluche dans la gueule" }
  ],
  philosophe: [
    { cap:"Contemplation à la fenêtre",     scene:"contemplant la pluie derrière une fenêtre, pensif" },
    { cap:"Méditation sur le tapis",        scene:"en boule sur un tapis, l'air méditatif" },
    { cap:"Songeur au crépuscule",          scene:"assis au coucher du soleil, regard songeur" },
    { cap:"Sieste sur les livres",          scene:"endormi paisiblement sur une pile de vieux livres" },
    { cap:"Observation silencieuse",        scene:"observant le monde en silence depuis une étagère" }
  ],
  clown: [
    { cap:"Position absurde",               scene:"renversé sur le dos dans une position comique sur le canapé" },
    { cap:"Coincé (exprès) dans un carton", scene:"à moitié coincé dans un carton trop petit, l'air ravi" },
    { cap:"Jeu avec un bouchon",            scene:"jouant frénétiquement avec un bouchon de bouteille" },
    { cap:"La tête dans un sac",            scene:"la tête passée dans l'anse d'un sac en papier" },
    { cap:"Roulade sur le tapis",           scene:"en pleine roulade joueuse sur un tapis" }
  ],
  gourmand: [
    { cap:"À l'affût de la gamelle",        scene:"assis devant sa gamelle vide, le regard implorant" },
    { cap:"Quête sur le plan de travail",   scene:"inspectant le plan de travail de la cuisine" },
    { cap:"Yeux implorants à table",        scene:"quémandant à table avec de grands yeux" },
    { cap:"Sieste repue",                   scene:"endormi, le ventre rond, après un bon repas" },
    { cap:"Inspection du frigo",            scene:"la tête tournée vers un frigo entrouvert, gourmand" }
  ],
  athlete: [
    { cap:"Saut vers l'étagère",            scene:"en plein saut spectaculaire vers une étagère" },
    { cap:"Course dans le couloir",         scene:"en pleine course effrénée dans un couloir" },
    { cap:"Escalade de l'arbre à chat",     scene:"grimpant énergiquement au sommet d'un arbre à chat" },
    { cap:"Étirement parfait",              scene:"réalisant un étirement parfait au réveil" },
    { cap:"Parkour sur le canapé",          scene:"bondissant d'un accoudoir à l'autre du canapé" }
  ],
  timide: [
    { cap:"Caché sous le lit",              scene:"à moitié caché sous un lit, seuls les yeux visibles" },
    { cap:"Œil sous la couverture",         scene:"emmitouflé sous une couverture, un œil qui dépasse" },
    { cap:"Observation prudente",           scene:"observant de loin depuis l'embrasure d'une porte" },
    { cap:"Blotti dans un coin",            scene:"blotti timidement dans un coin douillet" },
    { cap:"Sortie timide au soleil",        scene:"s'aventurant timidement vers un rayon de soleil" }
  ],
  seducteur: [
    { cap:"Regard envoûtant",               scene:"fixant l'objectif avec un regard charmeur et envoûtant" },
    { cap:"Pose alanguie",                  scene:"allongé langoureusement sur un sofa" },
    { cap:"Clignement charmeur",            scene:"clignant lentement des yeux, séducteur" },
    { cap:"Étirement gracieux",             scene:"s'étirant gracieusement dans la lumière du soir" },
    { cap:"Ronron sur les genoux",          scene:"ronronnant, blotti sur des genoux accueillants" }
  ],
  bavard: [
    { cap:"Miaulement expressif",           scene:"la gueule ouverte en plein miaulement expressif" },
    { cap:"Réclame l'attention",            scene:"miaulant fort pour réclamer l'attention dans le salon" },
    { cap:"Conversation à la fenêtre",      scene:"'discutant' avec les oiseaux à la fenêtre" },
    { cap:"Commente le repas",              scene:"miaulant devant sa gamelle comme pour commenter" },
    { cap:"En pleine histoire",             scene:"la bouche ouverte, comme en train de raconter une histoire" }
  ],
  zen: [
    { cap:"Détente sur le radiateur",       scene:"parfaitement détendu, allongé sur un radiateur tiède" },
    { cap:"Yoga félin au soleil",           scene:"étiré au soleil dans une posture de yoga féline" },
    { cap:"Sieste imperturbable",           scene:"en sieste profonde, imperturbable, sur un fauteuil" },
    { cap:"Pose du chat zen",               scene:"assis calmement en position du sphinx, serein" },
    { cap:"Calme près de la plante",        scene:"posé sereinement à côté d'une plante verte" }
  ]
};

// Trait signature imposé par l'archétype (garantit la cohérence de caractère).
export const ARCHETYPE_TRAIT = {
  potdecolle:"pot de colle", aventurier:"aventurier·e", diva:"diva", chasseur:"chasseur·se",
  philosophe:"dodo pro", clown:"malicieux·se", gourmand:"gourmand·e", athlete:"joueur·se",
  timide:"froussard·e", seducteur:"affectueux·se", bavard:"bavard·e", zen:"peace & love"
};

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
