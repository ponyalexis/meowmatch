// Petit générateur pseudo-aléatoire déterministe (mulberry32) + helpers.
// Déterministe = la seed de 100 chats est stable d'une session à l'autre.

export function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash string -> uint32 (pour dériver une seed depuis un id texte)
export function hashStr(str){
  let h = 2166136261;
  for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export class RNG{
  constructor(seed){ this.next = mulberry32(typeof seed === 'string' ? hashStr(seed) : seed); }
  float(){ return this.next(); }
  int(min, max){ return Math.floor(this.next() * (max - min + 1)) + min; }
  pick(arr){ return arr[Math.floor(this.next() * arr.length)]; }
  bool(p=0.5){ return this.next() < p; }
  // n éléments distincts
  sample(arr, n){
    const copy = arr.slice(); const out = [];
    n = Math.min(n, copy.length);
    for(let i=0;i<n;i++){ out.push(copy.splice(Math.floor(this.next()*copy.length),1)[0]); }
    return out;
  }
  // shuffle en place (copie)
  shuffle(arr){ const a = arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(this.next()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
}
