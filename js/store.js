import { generateSeed, PARIS_CENTER, distanceKm } from "./data/seed.js";

const KEY = "meow.state.v1";

const DEFAULT = {
  myCat: null,             // profil du chat de l'utilisateur
  location: PARIS_CENTER,  // position "de référence" (géoloc ou Paris centre)
  seen: [],                // ids swipés (like ou pass)
  likes: [],               // ids likés
  passes: [],              // ids passés
  matches: [],             // [{id, catId, messages:[], affinity, createdAt, lastTs, unread, autoplay}]
  memory: { templateScores: {}, reactionsCount: 0 }, // apprentissage du moteur
  settings: { radiusKm: 15, showBots: true },
  daily: { day: null, streak: 0, claimed: false, likesUsed: 0, superUsed: 0, superCredits: 0, best: 0 },
  onboarded: false
};

// Boucles addictives : limites quotidiennes.
export const DAILY_LIKES = 20;
export const DAILY_SUPER = 3;
export const DAILY_REWARD_SUPER = 2;  // super-likes offerts par le cadeau du jour

function dayNumber(){ const d = new Date(); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000); }

let state = load();
const listeners = new Set();

function load(){
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if(raw) return { ...structuredClone(DEFAULT), ...raw,
      memory: { ...DEFAULT.memory, ...(raw.memory||{}) },
      settings: { ...DEFAULT.settings, ...(raw.settings||{}) },
      daily: { ...DEFAULT.daily, ...(raw.daily||{}) } };
  } catch {}
  return structuredClone(DEFAULT);
}
function persist(){ localStorage.setItem(KEY, JSON.stringify(state)); }

export function getState(){ return state; }
export function subscribe(fn){ listeners.add(fn); return () => listeners.delete(fn); }
function emit(){ persist(); listeners.forEach(fn => fn(state)); }

// Seed des 100 chats (en mémoire, régénérée à chaque chargement — déterministe).
export const CATS = generateSeed(100);
const CAT_BY_ID = Object.fromEntries(CATS.map(c => [c.id, c]));
export function catById(id){ return CAT_BY_ID[id]; }

/* ---- Mutations ---- */
export function setMyCat(cat){ state.myCat = cat; state.onboarded = true; emit(); }
export function setLocation(loc){ state.location = loc; emit(); }
export function updateSettings(patch){ state.settings = { ...state.settings, ...patch }; emit(); }

export function resetAll(){ localStorage.removeItem(KEY); state = structuredClone(DEFAULT); emit(); }

/* ---- Boucle quotidienne : streak + likes limités + cadeau ---- */
// Bascule sur un nouveau jour si besoin. Retourne true si c'est un nouveau jour (cadeau à réclamer).
export function ensureDaily(){
  const today = dayNumber();
  const d = state.daily || (state.daily = structuredClone(DEFAULT.daily));
  if(d.day === today) return false;
  let streak;
  if(d.day == null) streak = 1;
  else if(today - d.day === 1) streak = (d.streak || 0) + 1;   // journée consécutive
  else streak = 1;                                              // streak cassé
  state.daily = {
    day: today, streak, claimed: false,
    likesUsed: 0, superUsed: 0,
    superCredits: d.superCredits || 0,
    best: Math.max(d.best || 0, streak)
  };
  persist();
  return true;
}

export function daily(){ return state.daily; }
export function likesLeft(){ return Math.max(0, DAILY_LIKES - (state.daily.likesUsed||0)); }
export function superLeft(){ return Math.max(0, DAILY_SUPER + (state.daily.superCredits||0) - (state.daily.superUsed||0)); }

// Consomme un like/super-like. Retourne true si autorisé.
export function useLike(kind){
  if(kind === "star"){
    if(superLeft() <= 0) return false;
    state.daily.superUsed = (state.daily.superUsed||0) + 1;
  } else {
    if(likesLeft() <= 0) return false;
    state.daily.likesUsed = (state.daily.likesUsed||0) + 1;
  }
  emit();
  return true;
}

// Recharge les likes du jour (démo : simule une pub récompensée / un abonnement).
export function refillLikes(){ state.daily.likesUsed = 0; emit(); }

// Réclame le cadeau du jour (une fois par jour) -> crédits de super-likes.
export function claimDaily(){
  if(state.daily.claimed) return null;
  state.daily.claimed = true;
  state.daily.superCredits = (state.daily.superCredits||0) + DAILY_REWARD_SUPER;
  emit();
  return { superLikes: DAILY_REWARD_SUPER, streak: state.daily.streak };
}

// Deck filtré : non vus, dans le rayon, respect du filtre bots, trié par distance.
export function getDeck(){
  const loc = state.location || PARIS_CENTER;
  return CATS
    .filter(c => !state.seen.includes(c.id))
    .filter(c => state.settings.showBots || !c.isBot)
    .map(c => ({ ...c, distanceKm: Math.max(0.2, distanceKm(loc, c.location)) }))
    .filter(c => c.distanceKm <= state.settings.radiusKm)
    .sort((a,b) => a.distanceKm - b.distanceKm);
}

export function distanceToMe(cat){
  return Math.max(0.2, distanceKm(state.location || PARIS_CENTER, cat.location));
}

// Renvoie true si ça crée un match.
export function like(catId){
  if(!state.seen.includes(catId)){ state.seen.push(catId); }
  if(!state.likes.includes(catId)) state.likes.push(catId);
  const cat = catById(catId);
  // Logique de match : bots -> toujours match ; "vrais" chats -> proba selon compat.
  const willMatch = cat.isBot ? true : Math.random() < 0.72;
  let created = false;
  if(willMatch && !state.matches.find(m => m.catId === catId)){
    state.matches.unshift({
      id: "m_" + catId,
      catId,
      messages: [],
      createdAt: Date.now(),
      lastTs: Date.now(),
      unread: false,
      dialog: null   // état du dialogue à choix (affinité, patience, fin…)
    });
    created = true;
  }
  emit();
  return created;
}

export function pass(catId){
  if(!state.seen.includes(catId)) state.seen.push(catId);
  if(!state.passes.includes(catId)) state.passes.push(catId);
  emit();
}

export function rewind(catId){
  state.seen = state.seen.filter(id => id !== catId);
  state.likes = state.likes.filter(id => id !== catId);
  state.passes = state.passes.filter(id => id !== catId);
  emit();
}

export function getMatch(matchId){ return state.matches.find(m => m.id === matchId); }
export function getMatchByCat(catId){ return state.matches.find(m => m.catId === catId); }

export function saveMatch(match){
  const i = state.matches.findIndex(m => m.id === match.id);
  if(i >= 0) state.matches[i] = match;
  emit();
}

export function markRead(matchId){
  const m = getMatch(matchId);
  if(m && m.unread){ m.unread = false; emit(); }
}

export function unreadCount(){ return state.matches.filter(m => m.unread).length; }

export function saveMemory(mem){ state.memory = mem; emit(); }
