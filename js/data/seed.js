import { RNG } from "../rng.js";
import * as P from "./pools.js";
import { CAT_IMAGES } from "./cataas-ids.js";

// Point de référence par défaut : centre de Paris (Hôtel de Ville).
export const PARIS_CENTER = { lat: 48.8566, lng: 2.3522 };

// Distance approximative (km) entre deux points lat/lng — formule de Haversine.
export function distanceKm(a, b){
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
}

// URL d'une déclinaison photo pour un chat cataas donné (MÊME animal, ambiance différente).
function photoUrl(catImageId, style){
  return `https://cataas.com/cat/${catImageId}?width=720&height=900&type=square${style.q}`;
}

function fill(tpl, ctx){
  return tpl
    .replace(/\{hood\}/g, ctx.hood)
    .replace(/\{age\}/g, ctx.age)
    .replace(/\{breedtag\}/g, ctx.breedtag)
    .replace(/\{trait\}/g, ctx.trait)
    .replace(/\{activity\}/g, ctx.activity)
    .replace(/\{food\}/g, ctx.food)
    .replace(/\{coat\}/g, ctx.coat);
}

function ageLabel(months){
  if(months < 12) return `${months} mois`;
  const y = Math.floor(months/12), m = months % 12;
  return m ? `${y} an${y>1?'s':''} et ${m} mois` : `${y} an${y>1?'s':''}`;
}

// Génère un profil complet et COHÉRENT, déterministe pour un index donné.
export function makeCat(i){
  const rng = new RNG(1000 + i * 7919);          // seed stable par chat
  const name = P.NAMES[i % P.NAMES.length];

  // --- apparence : pilotée par la vraie couleur de la photo cataas épinglée ---
  const image = CAT_IMAGES[i % CAT_IMAGES.length];
  const colorKey = P.COLOR_PROFILES[image.color] ? image.color : "divers";
  const colorProfile = P.COLOR_PROFILES[colorKey];
  const breed = rng.pick(colorProfile.breeds);   // race cohérente avec la couleur réelle

  const gender = rng.pick(P.GENDERS);
  const hood = rng.pick(P.NEIGHBORHOODS);
  const archetype = rng.pick(P.ARCHETYPES);
  const months = rng.int(6, 168);                // 6 mois à 14 ans

  // --- caractère cohérent avec l'archétype (trait signature imposé) ---
  const signature = P.ARCHETYPE_TRAIT[archetype.key];
  const others = rng.sample(P.PERSONALITY_TAGS.filter(t => t !== signature), rng.int(2,3));
  const traits = [signature, ...others];

  const food = rng.pick(P.FOODS);
  const activity = rng.pick(P.ACTIVITIES);

  const ctx = {
    hood: hood.name.replace(/\s*\(.*\)/,''),
    age: ageLabel(months),
    breedtag: colorProfile.coat,
    trait: signature,
    coat: colorProfile.coat,
    activity, food
  };

  const bio = [
    fill(rng.pick(P.BIO_OPENERS), ctx),
    fill(rng.pick(P.BIO_MIDS), ctx),
    fill(rng.pick(P.BIO_CLOSERS), ctx)
  ].join(" ");

  // Petit décalage géographique dans le quartier
  const loc = { lat: hood.lat + (rng.float()-0.5)*0.012, lng: hood.lng + (rng.float()-0.5)*0.012 };

  // 5 photos = LE MÊME chat, 5 ambiances -> cohérence visuelle garantie.
  const photos = P.PHOTO_STYLES.map(style => ({ url: photoUrl(image.id, style), caption: style.caption }));

  const prompts = rng.sample(P.PROMPTS, 3).map(pr => ({ q: pr.q, a: rng.pick(pr.a) }));

  // Stats de personnalité 0-100 — cohérentes avec l'archétype
  const base = () => rng.int(20, 90);
  const stats = {
    playfulness: base(), laziness: base(), affection: base(),
    independence: base(), chattiness: base(), curiosity: base()
  };
  const bump = (k,v)=> stats[k] = Math.min(100, stats[k]+v);
  ({
    potdecolle:()=>bump('affection',30),
    aventurier:()=>bump('curiosity',30),
    diva:()=>{bump('independence',25);},
    chasseur:()=>{bump('playfulness',20);bump('curiosity',20);},
    philosophe:()=>bump('laziness',35),
    clown:()=>bump('playfulness',30),
    gourmand:()=>bump('affection',15),
    athlete:()=>bump('playfulness',30),
    timide:()=>bump('independence',20),
    seducteur:()=>bump('affection',25),
    bavard:()=>bump('chattiness',40),
    zen:()=>bump('laziness',25)
  })[archetype.key]?.();

  // "Dur de la feuille" : exigence/susceptibilité, pour le dialogue à choix.
  // Diva / timide / zen / philosophe sont plus difficiles à séduire.
  const hardArch = { diva:35, timide:28, zen:22, philosophe:20 }[archetype.key] || 0;
  const pickiness = Math.min(95, Math.round(stats.independence*0.5 + (100-stats.affection)*0.3 + hardArch + rng.int(0,15)));

  return {
    id: `cat_${i}`,
    name,
    seedKey: `${name}-${i}`,
    imageId: image.id,
    color: colorKey,
    colorEmoji: colorProfile.emoji,
    coat: colorProfile.coat,
    breed,
    breedTag: colorProfile.coat,
    gender: gender.key,
    genderLabel: gender.label,
    genderEmoji: gender.emoji,
    ageMonths: months,
    ageLabel: ageLabel(months),
    neutered: rng.bool(0.85),
    neighborhood: hood.name,
    location: loc,
    photos,
    bio,
    archetype,
    personality: traits,
    stats,
    pickiness,                                    // 0-95 : plus c'est haut, plus il·elle est exigeant·e
    lookingFor: rng.pick(P.LOOKING_FOR),
    dealbreaker: rng.pick(P.DEALBREAKERS),
    favorites: {
      food: rng.pick(P.FOODS),
      toy: rng.pick(P.TOYS),
      spot: rng.pick(P.SPOTS),
      activity: rng.pick(P.ACTIVITIES)
    },
    zodiac: rng.pick(P.ZODIAC),
    prompts,
    ownerNote: rng.pick(P.OWNER_NOTES),
    isBot: rng.bool(0.35),
    vaccinated: rng.bool(0.92),
    verified: rng.bool(0.6)
  };
}

// La seed complète : 100 chats.
export function generateSeed(n = 100){
  const cats = [];
  for(let i=0;i<n;i++) cats.push(makeCat(i));
  return cats;
}

// Avatar SVG de secours (offline), teinté selon la couleur réelle du chat.
export function fallbackAvatar(cat){
  const rng = new RNG(cat.seedKey || cat.name);
  const FUR = {
    noir:"#2E2E2E", roux:"#D98A3D", blanc:"#F1EAE0", gris:"#8A93A0",
    "tigré":"#B07A47", calico:"#C98A5A", "crème":"#E7CBA0", bicolore:"#3A3A3A", divers:"#B79A78"
  };
  const fur = FUR[cat.color] || "#B79A78";
  const eye = ["#7BC47F","#F0C05A","#7BA3D9"][Math.floor(rng.float()*3)];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='375' viewBox='0 0 300 375'>
    <rect width='300' height='375' fill='#FBF7F0'/>
    <g transform='translate(150,205)'>
      <path d='M-90,-70 L-55,-20 L-120,-30 Z' fill='${fur}'/>
      <path d='M90,-70 L55,-20 L120,-30 Z' fill='${fur}'/>
      <ellipse cx='0' cy='0' rx='95' ry='88' fill='${fur}'/>
      <ellipse cx='-38' cy='-8' rx='15' ry='22' fill='#fff'/>
      <ellipse cx='38' cy='-8' rx='15' ry='22' fill='#fff'/>
      <ellipse cx='-38' cy='-6' rx='9' ry='16' fill='${eye}'/>
      <ellipse cx='38' cy='-6' rx='9' ry='16' fill='${eye}'/>
      <circle cx='-38' cy='-2' r='4' fill='#111'/>
      <circle cx='38' cy='-2' r='4' fill='#111'/>
      <path d='M-10,28 Q0,38 10,28' fill='#E48' stroke='#111' stroke-width='2'/>
      <path d='M0,20 L0,30' stroke='#111' stroke-width='2'/>
      <g stroke='#111' stroke-width='1.5' opacity='.6'>
        <line x1='15' y1='30' x2='70' y2='24'/><line x1='15' y1='36' x2='70' y2='40'/>
        <line x1='-15' y1='30' x2='-70' y2='24'/><line x1='-15' y1='36' x2='-70' y2='40'/>
      </g>
    </g>
    <text x='150' y='350' font-family='Georgia' font-size='26' fill='#6B4E71' text-anchor='middle'>${(cat.name||'?').replace(/[<>&]/g,'')}</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
