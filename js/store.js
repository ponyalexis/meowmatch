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
  onboarded: false
};

let state = load();
const listeners = new Set();

function load(){
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if(raw) return { ...structuredClone(DEFAULT), ...raw, memory: { ...DEFAULT.memory, ...(raw.memory||{}) }, settings: { ...DEFAULT.settings, ...(raw.settings||{}) } };
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
