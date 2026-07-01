import * as Store from "./store.js";
import { fallbackAvatar } from "./data/seed.js";
import { ARCHETYPES, PERSONALITY_TAGS, LOOKING_FOR, NEIGHBORHOODS } from "./data/pools.js";
import * as Engine from "./engine/chat-engine.js";
import * as Dlg from "./engine/dialogue-engine.js";
import { synthesizePersona, personaLabel, stylizeUserLine } from "./engine/persona.js";
import { matchProbability } from "./engine/matchmaking.js";
import * as LLM from "./engine/llm-adapter.js";

const app = document.getElementById("app");
const tabbar = document.getElementById("tabbar");
const toastEl = document.getElementById("toast");

/* ---------- helpers ---------- */
const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
let viewToken = 0;

function toast(msg){
  toastEl.textContent = msg; toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add("show"));
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toastEl.classList.remove("show"); setTimeout(() => toastEl.hidden = true, 250); }, 2400);
}
function imgWithFallback(cat, url, cls="", extra=""){
  const el = h(`<img class="${cls}" ${extra} alt="${esc(cat.name)}" src="${esc(url)}">`);
  el.addEventListener("error", () => { el.src = fallbackAvatar(cat); }, { once:true });
  return el;
}
function avatarUrl(cat){ return cat.photos?.[0]?.url || fallbackAvatar(cat); }
function renderCatText(text){ return esc(text).replace(/\*([^*]+)\*/g, '<span class="action">$1</span>'); }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

// Compression d'une photo uploadée -> dataURL (léger pour localStorage).
function compressImage(file, max=760){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width:w, height:hh } = img;
        const scale = Math.min(1, max/Math.max(w,hh));
        w = Math.round(w*scale); hh = Math.round(hh*scale);
        const cv = document.createElement("canvas"); cv.width = w; cv.height = hh;
        cv.getContext("2d").drawImage(img, 0, 0, w, hh);
        resolve(cv.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject; img.src = reader.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

/* ---------- router ---------- */
function go(route){ location.hash = "#/" + route; }
function currentRoute(){ return location.hash.replace(/^#\//, "") || (Store.getState().onboarded ? "discover" : "onboard"); }
window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

function setActiveTab(route){
  const base = route.split("/")[0];
  app.classList.toggle("chat-mode", base === "chat");
  const show = ["discover","matches","profile"].includes(base);   // plein écran sur le chat
  tabbar.hidden = !show || !Store.getState().onboarded;
  [...tabbar.querySelectorAll(".tab")].forEach(t => {
    const r = t.dataset.route;
    t.classList.toggle("on", r === base || (base==="chat" && r==="matches"));
  });
  const badge = document.getElementById("matchBadge");
  const n = Store.unreadCount();
  badge.hidden = n === 0; badge.textContent = n;
}
tabbar.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => go(t.dataset.route)));

let pendingDaily = false;
function render(){
  viewToken++;
  const route = currentRoute();
  const st = Store.getState();
  if(!st.onboarded && route !== "onboard"){ go("onboard"); return; }
  if(st.onboarded && Store.ensureDaily()) pendingDaily = true;   // nouveau jour -> cadeau à réclamer
  app.innerHTML = ""; setActiveTab(route); window.scrollTo(0,0);
  const base = route.split("/")[0];
  if(base === "onboard") return renderHero();
  if(base === "discover") return renderDiscover();
  if(base === "matches") return renderMatches();
  if(base === "chat") return renderChat(route.split("/")[1]);
  if(base === "profile") return renderProfile();
  renderDiscover();
}

/* ============================================================
   ONBOARDING
   ============================================================ */
const draft = {
  name:"", ageMonths:24, gender:"female",
  archetype:"potdecolle", personality:[], lookingFor:LOOKING_FOR[0],
  neighborhood:"Le Marais (4e)", avatar:"🐱", photos:[],
  stats:{ playfulness:60, laziness:55, affection:70, independence:45, chattiness:50, curiosity:60 },
  bio:""
};
const AVATARS = ["🐱","🐈","🐈‍⬛","😺","😸","😻","🙀","😹","😽","🐯","🦁","🐾"];

function renderHero(){
  const emojis = ["🐈","🐾","💛","😻","🐱","✨","🐈‍⬛","🎾"];
  const spread = emojis.map((e,i) => `<span style="left:${8+i*11}%;top:${10+(i%4)*16}%;animation-delay:${i*0.4}s">${e}</span>`).join("");
  const el = h(`<section class="hero">
    <div class="hero-emojis">${spread}</div>
    <div class="logo-badge">🐾</div>
    <h1>Créez le profil<br>de VOTRE chat.</h1>
    <p>Prenez votre chat à la maison, ajoutez ses vraies photos, et laissez son IA — calquée sur SA personnalité — flirter avec les célibataires du quartier. Vous lisez, vous orientez. 😻</p>
    <button class="btn" id="startBtn">📸 Créer le profil de mon chat</button>
    <button class="btn ghost" id="skipBtn" style="margin-top:6px">Voir les célibataires d'abord</button>
  </section>`);
  el.querySelector("#startBtn").addEventListener("click", () => wizard(0));
  el.querySelector("#skipBtn").addEventListener("click", () => { if(!Store.getState().myCat) quickCat(); go("discover"); });
  app.appendChild(el);
}
function quickCat(){ Store.setMyCat(buildMyCat({ ...draft, name: draft.name || "Mon Chat" })); }

const STEPS = ["identité","photos","personnalité","tempérament","recherche"];
function wizard(step){
  viewToken++; app.innerHTML = ""; tabbar.hidden = true;
  const pct = ((step+1)/STEPS.length)*100;
  const wrap = h(`<section class="wizard">
    <div class="wizard-head"><button class="back" aria-label="Retour">‹</button>
      <div class="progress"><i style="width:${pct}%"></i></div></div>
    <div class="wizard-body" id="wbody"></div>
    <div class="wizard-foot"><button class="btn" id="nextBtn">Continuer</button></div>
  </section>`);
  wrap.querySelector(".back").addEventListener("click", () => step === 0 ? renderHero() : wizard(step-1));
  const body = wrap.querySelector("#wbody");
  const nextBtn = wrap.querySelector("#nextBtn");
  [stepIdentity, stepPhotos, stepPersonality, stepTemperament, stepLooking][step](body, nextBtn);
  if(step === STEPS.length-1) nextBtn.textContent = "Révéler sa personnalité ✨";
  nextBtn.addEventListener("click", () => {
    if(step === 0 && !draft.name.trim()){ toast("Donne un petit nom à ton chat 🐾"); return; }
    if(step < STEPS.length-1) wizard(step+1);
    else { const c = buildMyCat(draft); Store.setMyCat(c); personaReveal(c); }
  });
  app.appendChild(wrap);
}

function stepIdentity(body){
  body.appendChild(h(`<div><div class="step-kicker">Étape 1 / 5</div>
    <h2 class="step-title">Qui est ton chat ?</h2>
    <p class="step-sub">Les bases pour faire chavirer les cœurs félins.</p></div>`));
  const avatars = h(`<div class="field"><label>Une frimousse en attendant tes photos</label><div class="avatar-pick"></div></div>`);
  const pick = avatars.querySelector(".avatar-pick");
  AVATARS.forEach(a => {
    const b = h(`<button class="${a===draft.avatar?'on':''}">${a}</button>`);
    b.addEventListener("click", () => { draft.avatar=a; pick.querySelectorAll("button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); });
    pick.appendChild(b);
  });
  body.appendChild(avatars);
  const name = h(`<div class="field"><label>Son nom</label><input class="input" placeholder="Minou, Pixel, Duchesse…" value="${esc(draft.name)}"></div>`);
  name.querySelector("input").addEventListener("input", e => draft.name = e.target.value);
  body.appendChild(name);
  const age = h(`<div class="field"><label>Âge : <b id="ageLbl">${ageStr(draft.ageMonths)}</b></label><input type="range" min="3" max="200" value="${draft.ageMonths}"></div>`);
  age.querySelector("input").addEventListener("input", e => { draft.ageMonths=+e.target.value; age.querySelector("#ageLbl").textContent = ageStr(draft.ageMonths); });
  body.appendChild(age);
  const gender = h(`<div class="field"><label>Genre</label><div class="chips"></div></div>`);
  [["female","Femelle ♀️"],["male","Mâle ♂️"]].forEach(([k,l]) => {
    const c = h(`<button class="chip ${draft.gender===k?'on':''}">${l}</button>`);
    c.addEventListener("click", () => { draft.gender=k; gender.querySelectorAll(".chip").forEach(x=>x.classList.remove("on")); c.classList.add("on"); });
    gender.querySelector(".chips").appendChild(c);
  });
  body.appendChild(gender);
}

function stepPhotos(body){
  body.appendChild(h(`<div><div class="step-kicker">Étape 2 / 5</div>
    <h2 class="step-title">Les photos de ton chat 📸</h2>
    <p class="step-sub">C'est ce qui fait toute la différence. Ajoute 2 à 6 vraies photos de ton chat à la maison — canapé, fenêtre, sieste… Elles restent sur ton appareil.</p></div>`));
  const grid = h(`<div class="upload-grid"></div>`);
  function paintGrid(){
    grid.innerHTML = "";
    draft.photos.forEach((p, i) => {
      const cell = h(`<div class="up-cell"><img src="${p.url}"><button class="up-del" aria-label="Supprimer">✕</button></div>`);
      cell.querySelector(".up-del").addEventListener("click", () => { draft.photos.splice(i,1); paintGrid(); });
      grid.appendChild(cell);
    });
    if(draft.photos.length < 6){
      const add = h(`<label class="up-cell up-add"><span>＋</span><small>Ajouter</small><input type="file" accept="image/*" multiple hidden></label>`);
      add.querySelector("input").addEventListener("change", async (e) => {
        const files = [...e.target.files].slice(0, 6 - draft.photos.length);
        for(const f of files){
          try { const url = await compressImage(f); draft.photos.push({ url, caption: "Chez nous" }); }
          catch { toast("Photo illisible, on passe."); }
        }
        paintGrid();
      });
      grid.appendChild(add);
    }
  }
  paintGrid();
  body.appendChild(grid);
  body.appendChild(h(`<p class="mute" style="font-size:12.5px;margin-top:12px">💡 Astuce : une belle photo lumineuse près d'une fenêtre = beaucoup plus de matchs. Tu peux aussi sauter cette étape et les ajouter plus tard.</p>`));
}

function stepPersonality(body){
  body.appendChild(h(`<div><div class="step-kicker">Étape 3 / 5</div>
    <h2 class="step-title">Sa vibe</h2>
    <p class="step-sub">C'est ELLE qui définira comment son IA parle. Choisis bien : un archétype + jusqu'à 5 traits.</p></div>`));
  const arche = h(`<div class="field"><label>Archétype</label><div class="chips"></div></div>`);
  ARCHETYPES.forEach(a => {
    const c = h(`<button class="chip ${draft.archetype===a.key?'on':''}">${a.emoji} ${a.label}</button>`);
    c.addEventListener("click", () => { draft.archetype=a.key; arche.querySelectorAll(".chip").forEach(x=>x.classList.remove("on")); c.classList.add("on"); });
    arche.querySelector(".chips").appendChild(c);
  });
  body.appendChild(arche);
  const traits = h(`<div class="field"><label>Traits de caractère</label><div class="chips"></div></div>`);
  PERSONALITY_TAGS.forEach(t => {
    const c = h(`<button class="chip warm ${draft.personality.includes(t)?'on':''}">${t}</button>`);
    c.addEventListener("click", () => {
      const i = draft.personality.indexOf(t);
      if(i>=0){ draft.personality.splice(i,1); c.classList.remove("on"); }
      else if(draft.personality.length < 5){ draft.personality.push(t); c.classList.add("on"); }
      else toast("5 traits max 😺");
    });
    traits.querySelector(".chips").appendChild(c);
  });
  body.appendChild(traits);
}

function stepTemperament(body){
  body.appendChild(h(`<div><div class="step-kicker">Étape 4 / 5</div>
    <h2 class="step-title">Son tempérament</h2>
    <p class="step-sub">Ces curseurs pilotent finement le ton de son IA (et à quelle célébrité il·elle ressemblera 👀).</p></div>`));
  const labels = { playfulness:"Joueur", laziness:"Marmotte", affection:"Câlin", independence:"Indépendant", chattiness:"Bavard", curiosity:"Curieux" };
  const box = h(`<div class="field"></div>`);
  Object.keys(draft.stats).forEach(k => {
    const row = h(`<div class="slider-row"><label>${labels[k]}</label><input type="range" min="0" max="100" value="${draft.stats[k]}"><span class="slider-val">${draft.stats[k]}</span></div>`);
    row.querySelector("input").addEventListener("input", e => { draft.stats[k]=+e.target.value; row.querySelector(".slider-val").textContent = e.target.value; });
    box.appendChild(row);
  });
  body.appendChild(box);
  const bio = h(`<div class="field"><label>Bio (optionnel)</label><textarea class="textarea" placeholder="Team radiateur, expert en siestes, cherche co-chat pour surveiller la rue…">${esc(draft.bio)}</textarea></div>`);
  bio.querySelector("textarea").addEventListener("input", e => draft.bio = e.target.value);
  body.appendChild(bio);
}

function stepLooking(body){
  body.appendChild(h(`<div><div class="step-kicker">Étape 5 / 5</div>
    <h2 class="step-title">Il·elle cherche…</h2>
    <p class="step-sub">Et dans quel coin de Paris.</p></div>`));
  const box = h(`<div class="field"><div class="chips" style="flex-direction:column;align-items:stretch"></div></div>`);
  LOOKING_FOR.forEach(l => {
    const c = h(`<button class="chip ${draft.lookingFor===l?'on':''}" style="text-align:left">${esc(l)}</button>`);
    c.addEventListener("click", () => { draft.lookingFor=l; box.querySelectorAll(".chip").forEach(x=>x.classList.remove("on")); c.classList.add("on"); });
    box.querySelector(".chips").appendChild(c);
  });
  body.appendChild(box);
  const hood = h(`<div class="field"><label>Quartier</label><select class="input"></select></div>`);
  const sel = hood.querySelector("select");
  NEIGHBORHOODS.forEach(n => { const o=document.createElement("option"); o.value=n.name; o.textContent=n.name; if(n.name===draft.neighborhood) o.selected=true; sel.appendChild(o); });
  sel.addEventListener("change", e => {
    draft.neighborhood = e.target.value;
    const n = NEIGHBORHOODS.find(x=>x.name===e.target.value); if(n) Store.setLocation({ lat:n.lat, lng:n.lng });
  });
  body.appendChild(hood);
}

function ageStr(m){ if(m<12) return `${m} mois`; const y=Math.floor(m/12), r=m%12; return r?`${y} an${y>1?'s':''} ${r} mois`:`${y} an${y>1?'s':''}`; }

function buildMyCat(d){
  const n = NEIGHBORHOODS.find(x => x.name === d.neighborhood) || NEIGHBORHOODS[0];
  const archetype = ARCHETYPES.find(a=>a.key===d.archetype)||ARCHETYPES[0];
  const cat = {
    id:"me", name:d.name.trim()||"Mon Chat", seedKey:"me-"+(d.name||"chat"),
    color:"divers", colorEmoji:"🐾", coat:"au charme unique",
    breed:"Chat unique", breedTag:"", gender:d.gender, genderLabel:d.gender==='male'?'Mâle':'Femelle',
    ageMonths:d.ageMonths, ageLabel:ageStr(d.ageMonths), neutered:true,
    neighborhood:d.neighborhood, location:{ lat:n.lat, lng:n.lng },
    photos: (d.photos && d.photos.length) ? d.photos.slice() : [{ url:fallbackAvatar({name:d.name,seedKey:"me",color:"divers"}), caption:"Mon chat" }],
    bio:d.bio || "Un chat mystérieux qui n'a pas encore écrit sa bio.",
    archetype, personality:d.personality.length?d.personality:["câlin·e"],
    stats:d.stats, pickiness: Math.round(d.stats.independence*0.5 + (100-d.stats.affection)*0.3),
    lookingFor:d.lookingFor, dealbreaker:"", favorites:{ food:"thon", toy:"la balle en alu", spot:"le radiateur", activity:"observer les pigeons" },
    zodiac:"", prompts:[], ownerNote:"", isBot:false, avatarEmoji:d.avatar, verified:false
  };
  cat.persona = synthesizePersona(cat);   // "s'il était humain·e…"
  return cat;
}

/* ---- Reveal de persona après l'onboarding ---- */
function personaReveal(cat){
  viewToken++; app.innerHTML = ""; tabbar.hidden = true;
  const p = cat.persona;
  const el = h(`<section class="hero" style="justify-content:center">
    <div class="center-col" style="gap:6px">
      <div class="logo-badge" style="margin:0 auto 14px">${p.emoji}</div>
      <div class="step-kicker">Le profil psychologique de ${esc(cat.name)}</div>
      <h1 style="font-size:32px;margin:6px 0">Si ${esc(cat.name)}<br>était humain·e…</h1>
      <div class="persona-card">
        <div class="pc-human">${p.emoji} ${esc(p.human)}</div>
        <div class="pc-celeb">un peu comme <b>${esc(p.celeb)}</b></div>
        <div class="pc-nuance">version ${esc(p.nuance)}</div>
        <div class="pc-sample">« ${esc(sampleLine(cat))} »</div>
      </div>
      <p class="mute" style="max-width:320px;margin:14px auto 20px">Son IA a été calibrée sur ce profil : elle parlera exactement comme tu l'imagines. Tu pourras l'orienter à chaque conversation.</p>
      <button class="btn" id="goDisc" style="max-width:340px">Rencontrer des chats 🐾</button>
    </div>
  </section>`);
  el.querySelector("#goDisc").addEventListener("click", () => { toast("Profil créé ! Swipe pour rencontrer 😻"); go("discover"); });
  app.appendChild(el);
}
function sampleLine(cat){
  // génère une réplique d'exemple, stylée selon le persona
  const base = "Approche, je te garderais bien une place sur mon radiateur.";
  return stylizeUserLine(base, cat.persona, makeRng(cat.name+"sample"));
}
function makeRng(seed){ // petit RNG local pour le reveal
  let a = 2166136261; for(let i=0;i<seed.length;i++){ a ^= seed.charCodeAt(i); a = Math.imul(a,16777619); }
  return { float(){ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; } };
}

/* ============================================================
   DISCOVER — swipe deck
   ============================================================ */
function renderDiscover(){
  const st = Store.getState();
  const d = Store.daily();
  const wrap = h(`<div>
    <header class="topbar">
      <button class="pill streak" id="streakPill">🔥 <b>${d.streak||1}</b></button>
      <div class="brand" style="font-size:18px"><span class="paw">🐾</span>Meow<b>Match</b></div>
      <div style="display:flex;gap:6px">
        <button class="pill likes" id="likesPill">❤️ ${Store.likesLeft()}</button>
        <button class="pill" id="filterPill">⚙️</button>
      </div>
    </header>
    <div class="deck" id="deck"></div>
    <div class="deck-actions">
      <button class="round rewind" id="btnRewind" aria-label="Annuler">↩️</button>
      <button class="round big nope" id="btnNope" aria-label="Passer">✖️</button>
      <button class="round star" id="btnStar" aria-label="Coup de cœur">⭐</button>
      <button class="round big like" id="btnLike" aria-label="J'aime">❤️</button>
    </div>
  </div>`);
  app.appendChild(wrap);

  // Incitation à ajouter de vraies photos
  const hasRealPhotos = st.myCat && st.myCat.photos && st.myCat.photos.length && st.myCat.photos[0].url.startsWith("data:image/jpeg");
  if(st.myCat && !hasRealPhotos){
    const nudge = h(`<div class="nudge">📸 Ajoute les vraies photos de <b>${esc(st.myCat.name)}</b> pour de meilleurs matchs. <button class="nudge-cta">Ajouter</button></div>`);
    nudge.querySelector(".nudge-cta").addEventListener("click", () => { seedDraftFromMy(); wizard(1); });
    wrap.querySelector(".topbar").after(nudge);
  }

  wrap.querySelector("#filterPill").addEventListener("click", openFilters);
  wrap.querySelector("#streakPill").addEventListener("click", () => dailyRewardModal());
  wrap.querySelector("#likesPill").addEventListener("click", () => toast(`❤️ ${Store.likesLeft()} likes · ⭐ ${Store.superLeft()} super-likes aujourd'hui`));
  const deck = wrap.querySelector("#deck");
  let queue = Store.getDeck();
  let lastActed = null;

  function refreshPills(){
    const dd = Store.daily();
    wrap.querySelector("#streakPill").innerHTML = `🔥 <b>${dd.streak||1}</b>`;
    wrap.querySelector("#likesPill").textContent = `❤️ ${Store.likesLeft()}`;
  }
  function limitBlocked(kind){
    if(kind === "star") return Store.superLeft() <= 0;
    if(kind === "like") return Store.likesLeft() <= 0;
    return false;
  }
  // Cadeau à réclamer sur nouvelle journée
  if(pendingDaily){ pendingDaily = false; setTimeout(() => dailyRewardModal(true), 500); }

  function paint(){
    deck.innerHTML = "";
    if(queue.length === 0){
      deck.appendChild(h(`<div class="empty-deck"><div class="big">🐈‍⬛</div>
        <h3 class="serif">Plus de museaux pour l'instant</h3>
        <p class="mute">Élargis ton rayon ou reviens plus tard.</p>
        <button class="btn secondary" id="widen" style="margin-top:10px;max-width:220px">Élargir la recherche</button></div>`));
      deck.querySelector("#widen")?.addEventListener("click", () => { Store.updateSettings({ radiusKm: Math.min(50, st.settings.radiusKm + 15) }); render(); });
      return;
    }
    const top = queue[0], behind = queue[1];
    if(behind) deck.appendChild(makeCard(behind, true));
    deck.appendChild(makeCard(top, false));
  }

  function makeCard(cat, isBehind){
    let photoIdx = 0;
    const card = h(`<article class="swipe-card ${isBehind?'behind':''}">
      <img class="photo" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0">
      <div class="scrim"></div>
      <div class="photo-dots"></div>
      <div class="photo-tap left"></div><div class="photo-tap right"></div>
      <div class="universe-tag"></div>
      <div class="stamp like">MIAM</div><div class="stamp nope">NOPE</div>
      <div class="card-info">
        <div class="name-row"><h2>${esc(cat.name)}</h2><span class="age">${esc(cat.ageLabel)}</span>
          ${cat.verified?'<span class="verif">✅</span>':''}${cat.isBot?'<span class="bot-tag">IA</span>':''}</div>
        <div class="meta"><span class="match-chip">💘 ${matchProbability(st.myCat, cat).score}%</span>
          <span>📍 ${cat.distanceKm.toFixed(1)} km</span>
          <span>${cat.archetype.emoji} ${esc(cat.archetype.label)}</span>
          <span>${cat.colorEmoji} ${esc(cat.breed.replace(/\s*\(.*\)/,''))}</span>
          ${cat.pickiness>65?'<span>😼 dur·e de la feuille</span>':''}</div>
        <div class="tagline">${esc(cat.bio.split('. ')[0])}.</div>
        <div class="scroll-hint">Touche la carte pour le profil complet ↑</div>
      </div>
    </article>`);
    const photo = card.querySelector(".photo");
    const dots = card.querySelector(".photo-dots");
    const uni = card.querySelector(".universe-tag");
    cat.photos.forEach((_,i) => dots.appendChild(h(`<i class="${i===0?'on':''}"></i>`)));
    function showPhoto(i){
      photoIdx = (i + cat.photos.length) % cat.photos.length;
      photo.src = cat.photos[photoIdx].url;
      photo.onerror = () => { photo.onerror=null; photo.src = fallbackAvatar(cat); };
      uni.textContent = cat.photos[photoIdx].caption;
      dots.querySelectorAll("i").forEach((d,di) => d.classList.toggle("on", di===photoIdx));
    }
    showPhoto(0);
    if(isBehind) return card;
    card.querySelector(".photo-tap.left").addEventListener("click", (e)=>{ e.stopPropagation(); showPhoto(photoIdx-1); });
    card.querySelector(".photo-tap.right").addEventListener("click", (e)=>{ e.stopPropagation(); showPhoto(photoIdx+1); });
    card.querySelector(".card-info").addEventListener("click", () => openProfileSheet(cat, act));
    enableDrag(card, act);
    return card;
  }

  function act(kind){
    const cat = queue[0]; if(!cat) return;
    lastActed = cat.id;
    if(kind === "like" || kind === "star"){
      Store.useLike(kind);   // consomme le quota (déjà vérifié avant l'animation)
      const matched = Store.like(cat.id);
      if(matched) showMatchModal(cat);
      else toast(kind==="star" ? "Coup de cœur envoyé ⭐" : "Like envoyé ❤️");
    } else if(kind === "pass"){ Store.pass(cat.id); }
    queue = Store.getDeck(); paint(); refreshPills(); setActiveTab(currentRoute());
  }
  // Gate d'un like/super-like : bloque avant l'animation si quota épuisé.
  function tryAct(kind){
    if(limitBlocked(kind)){
      if(kind === "star") toast("Plus de super-likes aujourd'hui ⭐");
      else outOfLikesModal();
      return;
    }
    flyOut(kind, act);
  }

  wrap.querySelector("#btnLike").addEventListener("click", () => tryAct("like"));
  wrap.querySelector("#btnNope").addEventListener("click", () => flyOut("pass", act));
  wrap.querySelector("#btnStar").addEventListener("click", () => tryAct("star"));
  wrap.querySelector("#btnRewind").addEventListener("click", () => {
    if(!lastActed){ toast("Rien à annuler 🐾"); return; }
    Store.rewind(lastActed); lastActed=null; queue=Store.getDeck(); paint(); toast("Retour en arrière ↩️");
  });

  function flyOut(kind, cb){
    const card = deck.querySelector(".swipe-card:not(.behind)"); if(!card){ cb(kind); return; }
    const dir = kind==="pass"?-1:1; const up = kind==="star"?-1:0;
    card.style.transition = "transform .35s ease, opacity .35s ease";
    card.style.transform = `translate(${dir*160}%, ${up?-60:20}%) rotate(${dir*22}deg)`;
    card.style.opacity = "0";
    const stamp = card.querySelector(kind==="pass"?".stamp.nope":".stamp.like"); if(stamp) stamp.style.opacity="1";
    setTimeout(() => cb(kind), 300);
  }
  paint();

  function enableDrag(card, cb){
    let startX=0,startY=0,dragging=false,dx=0,dy=0;
    const likeStamp = card.querySelector(".stamp.like"), nopeStamp = card.querySelector(".stamp.nope");
    const down = (e) => { dragging=true; card.style.transition="none"; const p=point(e); startX=p.x; startY=p.y; card.setPointerCapture?.(e.pointerId); };
    const move = (e) => {
      if(!dragging) return; const p=point(e); dx=p.x-startX; dy=p.y-startY;
      if(Math.abs(dx)<6&&Math.abs(dy)<6) return;
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx*0.05}deg)`;
      likeStamp.style.opacity = Math.max(0, dx/120); nopeStamp.style.opacity = Math.max(0, -dx/120);
    };
    const upFn = () => {
      if(!dragging) return; dragging=false; card.style.transition="transform .3s ease, opacity .3s ease";
      if(dx>110) finish(1); else if(dx<-110) finish(-1);
      else { card.style.transform=""; likeStamp.style.opacity=0; nopeStamp.style.opacity=0; }
    };
    function finish(dir){
      if(dir>0 && limitBlocked("like")){ card.style.transform=""; likeStamp.style.opacity=0; outOfLikesModal(); return; }
      card.style.transform=`translate(${dir*170}%, ${dy}px) rotate(${dir*22}deg)`; card.style.opacity="0"; setTimeout(()=>cb(dir>0?"like":"pass"),260);
    }
    card.addEventListener("pointerdown", down); card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", upFn); card.addEventListener("pointercancel", upFn);
  }
  function point(e){ return { x:e.clientX??e.touches?.[0]?.clientX??0, y:e.clientY??e.touches?.[0]?.clientY??0 }; }
}

function openFilters(){
  const st = Store.getState();
  const bg = h(`<div class="sheet-bg"></div>`);
  const sheet = h(`<div class="sheet"><div class="grip"></div><div class="body">
    <h2 class="name serif">Filtres</h2>
    <div class="info-card"><h4>Rayon de recherche</h4>
      <div class="slider-row" style="margin:6px 0 0"><input type="range" min="1" max="50" value="${st.settings.radiusKm}"><span class="slider-val" id="rv">${st.settings.radiusKm} km</span></div></div>
    <div class="info-card" style="display:flex;justify-content:space-between;align-items:center">
      <div><h4 style="margin:0">Afficher les profils IA</h4><p class="mute" style="font-size:13px;margin:4px 0 0">Chats gérés par une IA (badge « IA »).</p></div>
      <button class="chip ${st.settings.showBots?'on':''}" id="botToggle">${st.settings.showBots?'Oui':'Non'}</button></div>
    <div class="field" style="margin-top:12px"><label>Quartier de référence</label><select class="input" id="hoodSel"></select></div>
    <button class="btn" id="applyF" style="margin-top:6px">Appliquer</button></div></div>`);
  let radius=st.settings.radiusKm, showBots=st.settings.showBots, hood=st.myCat?.neighborhood||NEIGHBORHOODS[0].name;
  const sel = sheet.querySelector("#hoodSel");
  NEIGHBORHOODS.forEach(n => { const o=document.createElement("option"); o.value=n.name; o.textContent=n.name; if(n.name===hood) o.selected=true; sel.appendChild(o); });
  sel.addEventListener("change", e => hood=e.target.value);
  sheet.querySelector("input[type=range]").addEventListener("input", e => { radius=+e.target.value; sheet.querySelector("#rv").textContent=radius+" km"; });
  sheet.querySelector("#botToggle").addEventListener("click", (e)=>{ showBots=!showBots; e.target.classList.toggle("on",showBots); e.target.textContent=showBots?'Oui':'Non'; });
  const close = () => { bg.remove(); sheet.remove(); };
  bg.addEventListener("click", close);
  sheet.querySelector("#applyF").addEventListener("click", () => {
    Store.updateSettings({ radiusKm:radius, showBots });
    const n = NEIGHBORHOODS.find(x=>x.name===hood); if(n) Store.setLocation({ lat:n.lat, lng:n.lng });
    close(); render();
  });
  document.body.append(bg, sheet);
}

/* ============================================================
   PROFILE SHEET
   ============================================================ */
function compatCardHtml(cat){
  const my = Store.getState().myCat;
  if(!my || cat.id === "me" || cat.id === my.id) return "";
  const m = matchProbability(my, cat);
  const modeLbl = m.mode === "similar" ? "Qui se ressemble s'assemble" : "Les contraires s'attirent";
  return `<div class="info-card compat-card">
    <div class="compat-top"><div><h4 style="margin:0">Compatibilité</h4><div class="compat-label">${esc(m.label)}</div></div><div class="compat-score">${m.score}<small>%</small></div></div>
    <div class="bar" style="height:8px;border-radius:5px;background:#e7e2dc;overflow:hidden;margin:10px 0 8px"><i style="display:block;height:100%;width:${m.score}%;background:var(--grad-warm)"></i></div>
    <p style="margin:0;font-size:13.5px;color:var(--ink-soft)">${esc(m.reason)} <span style="opacity:.7">· ${esc(modeLbl)}</span></p>
  </div>`;
}

function openProfileSheet(cat, act){
  const bg = h(`<div class="sheet-bg"></div>`);
  const statLabels = { playfulness:"Joueur", laziness:"Marmotte", affection:"Câlin", independence:"Indépendant", chattiness:"Bavard", curiosity:"Curieux" };
  const sheet = h(`<div class="sheet"><div class="grip"></div><div class="gallery"></div>
    <div class="body">
      <h2 class="name serif">${esc(cat.name)}, ${esc(cat.ageLabel)} ${cat.isBot?'<span class="bot-tag">IA</span>':''}</h2>
      <div class="subline">${cat.archetype.emoji} ${esc(cat.archetype.label)} · ${cat.colorEmoji} ${esc(cat.breed)} · 📍 ${esc(cat.neighborhood)}</div>
      ${compatCardHtml(cat)}
      ${cat.persona?`<div class="info-card prompt-card"><h4>S'il·elle était humain·e</h4><div class="a">${esc(cat.persona.human)} — dans la lignée de ${esc(cat.persona.celeb)} ${cat.persona.emoji}</div></div>`:''}
      <div class="info-card"><h4>À propos</h4><p>${esc(cat.bio)}</p></div>
      ${cat.prompts?.[0]?`<div class="info-card prompt-card"><h4>${esc(cat.prompts[0].q)}</h4><div class="a">${esc(cat.prompts[0].a)}</div></div>`:''}
      <div class="info-card"><h4>Caractère</h4><div class="factbox">${cat.personality.map(t=>`<span class="fact">${esc(t)}</span>`).join("")}</div></div>
      ${cat.prompts?.[1]?`<div class="info-card prompt-card"><h4>${esc(cat.prompts[1].q)}</h4><div class="a">${esc(cat.prompts[1].a)}</div></div>`:''}
      <div class="info-card"><h4>Tempérament</h4><div class="trait-grid">
        ${Object.entries(cat.stats).map(([k,v])=>`<div class="trait"><div class="t-top"><span>${statLabels[k]}</span><span>${v}</span></div><div class="bar"><i style="width:${v}%"></i></div></div>`).join("")}</div></div>
      <div class="info-card"><h4>Ses petits favoris</h4><div class="factbox">
        <span class="fact">🍤 ${esc(cat.favorites.food)}</span><span class="fact">🧶 ${esc(cat.favorites.toy)}</span><span class="fact">🛋️ ${esc(cat.favorites.spot)}</span></div></div>
      ${cat.prompts?.[2]?`<div class="info-card prompt-card"><h4>${esc(cat.prompts[2].q)}</h4><div class="a">${esc(cat.prompts[2].a)}</div></div>`:''}
      <div class="info-card"><h4>Recherche</h4><p>${esc(cat.lookingFor)}</p></div>
      ${cat.dealbreaker?`<div class="info-card"><h4>Non négociable</h4><p>${esc(cat.dealbreaker)}</p></div>`:''}
      ${cat.ownerNote?`<div class="info-card"><h4>Le mot de l'humain</h4><p>${esc(cat.ownerNote)}</p></div>`:''}
    </div>
    <div class="sheet-actions"><button class="round big nope">✖️</button><button class="round star">⭐</button><button class="round big like">❤️</button></div>
  </div>`);
  const gal = sheet.querySelector(".gallery");
  cat.photos.forEach(p => { const shot = h(`<div class="shot"><span class="cap">${esc(p.caption)}</span></div>`); shot.prepend(imgWithFallback(cat, p.url)); gal.appendChild(shot); });
  const close = () => { bg.remove(); sheet.remove(); };
  bg.addEventListener("click", close);
  if(act){
    sheet.querySelector(".nope").addEventListener("click", () => { close(); act("pass"); });
    sheet.querySelector(".like").addEventListener("click", () => { close(); act("like"); });
    sheet.querySelector(".star").addEventListener("click", () => { close(); act("star"); });
  } else { sheet.querySelector(".sheet-actions").style.display = "none"; }
  document.body.append(bg, sheet);
}

function showMatchModal(cat){
  const my = Store.getState().myCat;
  const conf = Array.from({length:14}, (_,i)=>`<span class="confetti" style="left:${i*7}%;animation-delay:${i*0.12}s">${['🎉','💛','🐾','😻','✨'][i%5]}</span>`).join("");
  const modal = h(`<div class="match-modal">${conf}<div style="position:relative;z-index:2;display:flex;flex-direction:column;align-items:center">
    <h1>C'est un match !</h1>
    <div class="subtitle">L'étincelle est là. Une nouvelle histoire commence.</div>
    <div class="avas"></div>
    <p><b>${esc(my?.name||'Ton chat')}</b> et <b>${esc(cat.name)}</b> se plaisent. À toi d'orienter la conversation de leurs IA… 😽</p>
    <button class="btn" id="goChat">💬 Démarrer la conversation</button>
    <button class="btn ghost" id="keepSwipe" style="color:#eeddf4;margin-top:4px">Continuer à swiper</button>
    <div class="kicker">MeowMatch Exclusive</div></div></div>`);
  const avas = modal.querySelector(".avas");
  avas.appendChild(imgWithFallback(my||cat, avatarUrl(my||cat)));
  avas.appendChild(imgWithFallback(cat, avatarUrl(cat)));
  avas.appendChild(h(`<div class="heart-burst">❤️</div>`));
  modal.querySelector("#goChat").addEventListener("click", () => { modal.remove(); go("chat/m_"+cat.id); });
  modal.querySelector("#keepSwipe").addEventListener("click", () => modal.remove());
  document.body.appendChild(modal);
}

/* ---- Cadeau quotidien + streak ---- */
function dailyRewardModal(isNewDay=false){
  const d = Store.daily();
  const paws = Array.from({length:7}, (_,i) => {
    const idx = ((d.streak-1) % 7);
    const filled = i <= idx;
    const glow = i === (idx+1) % 7 && !d.claimed;
    return `<div class="paw-stamp ${filled?'on':''} ${glow?'glow':''}">🐾</div>`;
  }).join("");
  const bg = h(`<div class="sheet-bg"></div>`);
  const modal = h(`<div class="reward-modal">
    <div class="rw-card">
      <span class="rw-badge">Retour quotidien</span>
      <h2 class="serif">Ton rendez-vous quotidien 🎁</h2>
      <p class="mute">${isNewDay?'Content·e de te revoir 🥰 Série de '+d.streak+' jour'+(d.streak>1?'s':'')+' 🔥':'Un petit cadeau pour toi et ton félin. Série de '+d.streak+' jour'+(d.streak>1?'s':'')+' 🔥'}</p>
      <div class="rw-gift" id="giftBox">${d.claimed
        ? `<div class="rw-claimed">✅ Cadeau du jour déjà réclamé — reviens demain !</div>`
        : `<button class="rw-mystery" id="mysteryBtn"><span class="rw-mystery-ico">🎁</span><span class="rw-mystery-lbl">Tapote pour révéler</span></button>`}</div>
      <div class="paw-row">${paws}</div>
      ${d.claimed?'':`<button class="btn" id="claimBtn" style="margin-top:14px">Récupérer mon cadeau</button>`}
      <button class="btn ghost" id="rwClose" style="margin-top:6px">${d.claimed?'Fermer':'Reviens demain'}</button>
    </div>
  </div>`);
  const close = () => { bg.remove(); modal.remove(); };
  bg.addEventListener("click", close);
  modal.querySelector("#rwClose").addEventListener("click", close);
  const doClaim = () => {
    const r = Store.claimDaily();
    if(r){
      const box = modal.querySelector("#giftBox");
      box.innerHTML = `<div class="rw-reveal">+${r.superLikes} super-likes ⭐<br><small>ajoutés à ton compte</small></div>`;
      modal.querySelector("#claimBtn")?.remove();
      confettiBurst();
      setTimeout(() => { close(); render(); }, 1600);
    }
  };
  modal.querySelector("#claimBtn")?.addEventListener("click", doClaim);
  modal.querySelector("#mysteryBtn")?.addEventListener("click", doClaim);
  document.body.append(bg, modal);
}

function outOfLikesModal(){
  const d = Store.daily();
  const bg = h(`<div class="sheet-bg"></div>`);
  const modal = h(`<div class="reward-modal">
    <div class="rw-card">
      <div class="rw-flame">❤️</div>
      <h2 class="serif">Plus de likes pour aujourd'hui</h2>
      <p class="mute">Tu as utilisé tes 20 likes du jour. Reviens demain pour en avoir 20 nouveaux — et garder ta série de ${d.streak} 🔥.</p>
      <button class="btn" id="refillBtn">▶️ Recharger mes likes <small style="opacity:.8">(démo)</small></button>
      ${!d.claimed?`<button class="btn secondary" id="giftBtn" style="margin-top:8px">🎁 Ouvrir le cadeau du jour</button>`:''}
      <button class="btn ghost" id="olClose" style="margin-top:6px">Revenir demain</button>
    </div>
  </div>`);
  const close = () => { bg.remove(); modal.remove(); };
  bg.addEventListener("click", close);
  modal.querySelector("#olClose").addEventListener("click", close);
  modal.querySelector("#refillBtn").addEventListener("click", () => { Store.refillLikes(); toast("Likes rechargés ❤️"); close(); render(); });
  modal.querySelector("#giftBtn")?.addEventListener("click", () => { close(); dailyRewardModal(); });
  document.body.append(bg, modal);
}

function confettiBurst(){
  const conf = document.createElement("div");
  conf.className = "match-modal"; conf.style.background = "transparent"; conf.style.pointerEvents = "none"; conf.style.zIndex = 80;
  conf.innerHTML = Array.from({length:16},(_,i)=>`<span class="confetti" style="left:${i*6}%;animation-delay:${i*0.08}s">${['⭐','💛','✨','🐾'][i%4]}</span>`).join("");
  document.body.appendChild(conf); setTimeout(()=>conf.remove(), 2400);
}

/* ============================================================
   MATCHES list
   ============================================================ */
function renderMatches(){
  const st = Store.getState();
  const wrap = h(`<div><header class="topbar"><div class="brand"><span class="paw">💬</span>Matchs</div></header></div>`);
  app.appendChild(wrap);
  if(st.matches.length === 0){
    wrap.appendChild(h(`<div class="empty-deck" style="height:60vh"><div class="big">😽</div>
      <h3 class="serif">Pas encore de match</h3>
      <p class="mute">Swipe des museaux dans Découvrir pour lancer les premières rencontres.</p>
      <button class="btn secondary" style="max-width:200px;margin-top:10px" onclick="location.hash='#/discover'">Découvrir</button></div>`));
    return;
  }
  const fresh = st.matches.filter(m => m.messages.length === 0);
  if(fresh.length){
    const row = h(`<div class="new-matches"></div>`);
    fresh.forEach(m => {
      const cat = Store.catById(m.catId);
      const nm = h(`<div class="nm"><div class="nm-name">${esc(cat.name)}</div></div>`);
      nm.prepend(imgWithFallback(cat, avatarUrl(cat), "ava"));
      nm.addEventListener("click", () => go("chat/"+m.id));
      row.appendChild(nm);
    });
    wrap.appendChild(h(`<h3 class="serif" style="margin:6px 18px 2px;font-size:16px">Nouveaux matchs</h3>`));
    wrap.appendChild(row);
  }
  wrap.appendChild(h(`<h3 class="serif" style="margin:10px 18px 6px;font-size:16px">Conversations</h3>`));
  const list = h(`<div></div>`);
  const withMsg = st.matches.filter(m => m.messages.length > 0);
  if(withMsg.length === 0) list.appendChild(h(`<p class="mute" style="padding:0 18px">Touche un nouveau match pour lancer la conversation 🐾</p>`));
  withMsg.forEach(m => {
    const cat = Store.catById(m.catId);
    const last = m.messages[m.messages.length-1];
    const who = last.fromId === cat.id ? cat.name : (st.myCat?.name || "Ton chat");
    const status = m.dialog?.ended === "blocked" ? '<span class="bot-tag" style="color:#FF6B6B;border-color:#FF6B6B">Bloqué·e</span>'
                 : m.dialog?.ended === "soulmate" ? '<span class="bot-tag" style="color:#4FC58B;border-color:#4FC58B">Âme sœur</span>' : '';
    const item = h(`<div class="conv-item"><div class="mid">
      <div class="top"><span class="cname">${esc(cat.name)} ${status||(cat.isBot?'<span class="bot-tag">IA</span>':'')}</span><span class="time">${timeAgo(m.lastTs)}</span></div>
      <div class="snippet ${m.unread?'unread':''}">${esc(who)}: ${esc(stripActions(last.text)).slice(0,42)}…</div></div>
      ${m.unread?'<div class="dot-unread"></div>':''}</div>`);
    item.prepend(imgWithFallback(cat, avatarUrl(cat), "ava"));
    item.addEventListener("click", () => go("chat/"+m.id));
    list.appendChild(item);
  });
  wrap.appendChild(list);
}
function stripActions(t){ return t.replace(/\*[^*]+\*/g, "").replace(/\s+/g," ").trim() || t; }

/* ============================================================
   CHAT — dialogue à CHOIX (arborescence)
   ============================================================ */
function renderChat(matchId){
  const myToken = viewToken;
  const match = Store.getMatch(matchId);
  const st = Store.getState();
  if(!match){ go("matches"); return; }
  const cat = Store.catById(match.catId);
  const my = st.myCat;
  Store.markRead(matchId);
  if(!match.dialog) match.dialog = Dlg.initDialog(my, cat);

  const wrap = h(`<div>
    <div class="chat-head"><button class="back">‹</button>
      <div class="who"><b>${esc(my?.name||'Ton chat')} 🐾 ${esc(cat.name)}</b><small id="moodLine"></small></div>
      <button class="info-btn">ⓘ</button></div>
    <div class="affinity"><span>💞</span><div class="bar"><i id="affBar"></i></div><span id="affPct"></span></div>
    <div class="affinity" style="margin-top:2px"><span>🐾</span><div class="bar"><i id="patBar" style="background:linear-gradient(90deg,#FF6B6B,#E8B04B,#4FC58B)"></i></div><span id="patLbl" style="font-size:11px">humeur</span></div>
    <div class="chat-scroll" id="scroll"></div>
    <div class="chat-choices" id="choices"></div>
  </div>`);
  app.appendChild(wrap);
  wrap.querySelector(".back").addEventListener("click", () => go("matches"));
  wrap.querySelector(".info-btn").addEventListener("click", () => openProfileSheet(cat, null));
  const scroll = wrap.querySelector("#scroll");
  const moodLine = wrap.querySelector("#moodLine");
  const affBar = wrap.querySelector("#affBar"), affPct = wrap.querySelector("#affPct");
  const patBar = wrap.querySelector("#patBar");
  const choicesBox = wrap.querySelector("#choices");
  let auto = false;

  function updateBars(){
    const d = match.dialog;
    affBar.style.width = d.affinity + "%"; affPct.textContent = d.affinity + "%";
    patBar.style.width = d.patience + "%";
    moodLine.textContent = Dlg.moodLabel(d);
  }
  function bubble(msg){
    const isCat = msg.fromId === cat.id;
    const who = isCat ? cat : (my || cat);
    const row = h(`<div class="msg ${isCat?'left':'right'}">
      <span class="react-btn">＋</span>
      <div class="bubble">${renderCatText(msg.text)}${msg.reaction?`<span class="reaction">${msg.reaction==='love'?'❤️':msg.reaction==='funny'?'😹':'👎'}</span>`:''}</div></div>`);
    row.prepend(imgWithFallback(who, avatarUrl(who), "m-ava"));
    if(msg.reaction) row.classList.add("reacted");
    row.querySelector(".react-btn").addEventListener("click", () => openReactions(row, msg));
    return row;
  }
  function openReactions(row, msg){
    const ex = row.querySelector(".react-pop"); if(ex){ ex.remove(); return; }
    const pop = h(`<div class="react-pop" style="position:absolute;background:#fff;border-radius:999px;padding:6px 10px;box-shadow:var(--shadow-md);display:flex;gap:10px;font-size:20px;z-index:5;transform:translateY(-34px)">
      <span data-r="love">❤️</span><span data-r="funny">😹</span><span data-r="meh">👎</span></div>`);
    const b = row.querySelector(".bubble"); b.style.position="relative"; b.appendChild(pop);
    pop.querySelectorAll("span").forEach(s => s.addEventListener("click", () => {
      const r = s.dataset.r; msg.reaction = r;
      if(msg.tplKey){ Engine.learnFromReaction(st.memory, msg.tplKey, r); Store.saveMemory(st.memory); }
      Store.saveMatch(match); pop.remove();
      const nb = bubble(msg); row.replaceWith(nb);
      toast(r==='meh'?"Noté, on évitera ce style 👎":"Le moteur apprend ce qui te plaît ✨");
    }));
    setTimeout(() => document.addEventListener("click", function off(e){ if(!pop.contains(e.target)){ pop.remove(); document.removeEventListener("click", off); } }), 0);
  }
  function typing(isCat){
    const t = h(`<div class="typing" style="${isCat?'':'margin-left:auto;margin-right:34px'}"><i></i><i></i><i></i></div>`);
    scroll.appendChild(t); scroll.scrollTop = scroll.scrollHeight; return t;
  }

  function renderChoices(){
    choicesBox.innerHTML = "";
    const d = match.dialog;
    if(d.ended){
      const banner = h(`<div class="end-card ${d.ended}"><p>${esc(Dlg.endBanner(d, cat))}</p>
        <button class="btn ${d.ended==='blocked'?'secondary':''}" id="endCta">${d.ended==='blocked'?'Trouver d\'autres chats 🐾':'Continuer à swiper 💫'}</button></div>`);
      banner.querySelector("#endCta").addEventListener("click", () => go("discover"));
      choicesBox.appendChild(banner);
      return;
    }
    const choices = Dlg.getChoices(d, my, cat);
    const head = h(`<div class="choices-head"><span class="ch-title">Que répondre&nbsp;?</span> <button class="auto-mini" id="autoMini">${auto?'⏸':'🍿'} regarder</button></div>`);
    head.querySelector("#autoMini").addEventListener("click", toggleAuto);
    choicesBox.appendChild(head);
    const grid = h(`<div class="choices"></div>`);
    choices.forEach(c => {
      const btn = h(`<button class="choice-btn"><span class="c-emoji">${c.emoji}</span><span class="c-lbl">${esc(c.label)}</span><span class="c-chev">›</span></button>`);
      btn.addEventListener("click", () => play(c));
      grid.appendChild(btn);
    });
    choicesBox.appendChild(grid);
  }

  async function play(choice){
    if(myToken !== viewToken) return;
    choicesBox.querySelectorAll("button").forEach(b => b.disabled = true);
    const res = Dlg.applyChoice(choice, my, cat, match.dialog);
    // ton chat parle
    const ut = typing(false); await sleep(500); if(myToken!==viewToken) return; ut.remove();
    res.userMsg.ts = Date.now(); match.messages.push(res.userMsg); scroll.appendChild(bubble(res.userMsg)); scroll.scrollTop = scroll.scrollHeight;
    await sleep(350);
    // le chat d'en face réagit
    const at = typing(true); await sleep(650 + Math.min(1100, res.aiMsg.text.length*16)); if(myToken!==viewToken) return; at.remove();
    res.aiMsg.ts = Date.now(); match.messages.push(res.aiMsg); scroll.appendChild(bubble(res.aiMsg)); scroll.scrollTop = scroll.scrollHeight;
    match.dialog = res.state; match.lastTs = Date.now();
    updateBars(); Store.saveMatch(match);
    if(res.delta > 0){
      const chip = h(`<div class="reward-chip">✨ +${res.delta} complicité</div>`);
      scroll.appendChild(chip); scroll.scrollTop = scroll.scrollHeight;
      setTimeout(() => chip.remove(), 2600);
    } else if(res.delta < 0){ toast(res.delta + " complicité 😿"); }
    if(res.ending === "soulmate") celebrate();
    renderChoices();
  }

  function toggleAuto(){
    auto = !auto;
    if(auto){ toast("Mode regarder : l'IA joue toute seule 🍿"); runAuto(); } else { renderChoices(); }
  }
  async function runAuto(){
    while(auto && myToken===viewToken && !match.dialog.ended){
      const choices = Dlg.getChoices(match.dialog, my, cat);
      const pick = Dlg.autoPick(choices, cat, match.dialog);
      await play(pick);
      if(match.messages.length > 60){ auto=false; break; }
      await sleep(900);
    }
    auto = false;
  }

  function celebrate(){
    const conf = document.createElement("div");
    conf.className = "match-modal"; conf.style.background = "transparent"; conf.style.pointerEvents = "none";
    conf.innerHTML = Array.from({length:16},(_,i)=>`<span class="confetti" style="left:${i*6}%;animation-delay:${i*0.1}s">${['💛','😻','✨','🐾'][i%4]}</span>`).join("");
    document.body.appendChild(conf); setTimeout(()=>conf.remove(), 2600);
  }

  // Rendu initial
  scroll.appendChild(h(`<div class="day-sep">Vous avez matché · ${timeAgo(match.createdAt)}</div>`));
  match.messages.forEach(m => scroll.appendChild(bubble(m)));
  updateBars();

  if(match.messages.length === 0 && !match.dialog.opened){
    // ligne d'ouverture du chat d'en face
    const t = typing(true);
    setTimeout(() => {
      if(myToken!==viewToken) return; t.remove();
      const ex = Dlg.openingExchange(my, cat); ex.message.ts = Date.now();
      match.messages.push(ex.message); match.dialog.opened = true; match.dialog.topic = ex.topic;
      scroll.appendChild(bubble(ex.message)); scroll.scrollTop = scroll.scrollHeight;
      Store.saveMatch(match); renderChoices();
    }, 700);
  } else {
    renderChoices();
    scroll.scrollTop = scroll.scrollHeight;
  }
}

/* ============================================================
   MY PROFILE
   ============================================================ */
function renderProfile(){
  const st = Store.getState();
  const my = st.myCat;
  const learn = Engine.learningSummary(st.memory);
  const p = my?.persona;
  const wrap = h(`<div>
    <header class="topbar"><div class="brand"><span class="paw">🐱</span>Mon chat</div>
      <button class="pill" id="editBtn">✏️ Modifier</button></header>
    <div class="me-hero"><div class="ava" id="meAva">${my?.avatarEmoji||'🐱'}</div>
      <h2 class="serif">${esc(my?.name||'Mon Chat')}, ${esc(my?.ageLabel||'')}</h2>
      <div class="sub">${my?.archetype?.emoji||''} ${esc(my?.archetype?.label||'')} · 📍 ${esc(my?.neighborhood||'Paris')}</div></div>
    ${p?`<div class="persona-card" style="margin:0 14px 14px"><div class="pc-human">${p.emoji} ${esc(p.human)}</div>
      <div class="pc-celeb">Si ${esc(my.name)} était humain·e : un peu comme <b>${esc(p.celeb)}</b></div>
      <div class="pc-nuance">version ${esc(p.nuance)}</div></div>`:''}
    <div class="stat-row">
      <div class="s"><b>${st.likes.length}</b><span>Likes</span></div>
      <div class="s"><b>${st.matches.length}</b><span>Matchs</span></div>
      <div class="s"><b>${st.matches.filter(m=>m.dialog?.ended==='soulmate').length}</b><span>Âmes sœurs</span></div></div>
    <div class="info-card" style="margin:0 14px 14px"><h4>🧠 Moteur d'IA — niveau ${learn.level}</h4>
      <p style="font-size:14px">L'IA apprend de tes réactions (❤️ 😹 👎) pendant les conversations pour devenir plus drôle.</p>
      <div class="factbox" style="margin-top:10px"><span class="fact">${learn.reactions} réactions</span><span class="fact">${learn.tunedLines} répliques affinées</span></div></div>
    <div class="menu">
      <button id="mPhotos"><span class="ico">📸</span> Ajouter / changer ses photos <span class="chev">›</span></button>
      <button id="mBio"><span class="ico">📝</span> Voir mon profil public <span class="chev">›</span></button>
      <button id="mLLM"><span class="ico">✨</span> Moteur IA avancé (LLM) <span class="chev">›</span></button>
      <button id="mInstall"><span class="ico">📲</span> Installer l'app <span class="chev">›</span></button>
      <button id="mReset" class="danger"><span class="ico">🗑️</span> Réinitialiser (effacer tout)</button></div>
    <p class="mute" style="text-align:center;font-size:12px;margin:16px">MeowMatch · démo · faite avec 🐾 à Paris</p>
  </div>`);
  app.appendChild(wrap);
  // si photos réelles, montrer la première en avatar
  if(my?.photos?.[0]?.url?.startsWith("data:image")){
    const ava = wrap.querySelector("#meAva"); ava.textContent = ""; ava.style.padding="0"; ava.style.overflow="hidden";
    ava.appendChild(imgWithFallback(my, my.photos[0].url, "", 'style="width:100%;height:100%;object-fit:cover"'));
  }
  wrap.querySelector("#editBtn").addEventListener("click", () => { seedDraftFromMy(); wizard(0); });
  wrap.querySelector("#mPhotos").addEventListener("click", () => { seedDraftFromMy(); wizard(1); });
  wrap.querySelector("#mBio").addEventListener("click", () => openProfileSheet(publicSelf(), null));
  wrap.querySelector("#mLLM").addEventListener("click", openLLMConfig);
  wrap.querySelector("#mInstall").addEventListener("click", () => toast("Menu du navigateur → « Ajouter à l'écran d'accueil » 📲"));
  wrap.querySelector("#mReset").addEventListener("click", () => { if(confirm("Tout effacer et repartir de zéro ?")){ Store.resetAll(); location.hash="#/onboard"; render(); } });
}
function publicSelf(){ const my = Store.getState().myCat; return { ...my, photos: my.photos?.length?my.photos:[{ url:fallbackAvatar(my), caption:"Mon chat" }], prompts: my.prompts||[] }; }
function seedDraftFromMy(){
  const my = Store.getState().myCat; if(!my) return;
  Object.assign(draft, { name:my.name, ageMonths:my.ageMonths, gender:my.gender, archetype:my.archetype.key,
    personality:[...my.personality], lookingFor:my.lookingFor, neighborhood:my.neighborhood,
    avatar:my.avatarEmoji||"🐱", stats:{...my.stats}, bio:my.bio, photos:(my.photos||[]).filter(ph=>ph.url.startsWith("data:image")).slice() });
}

function openLLMConfig(){
  const cfg = LLM.getLLMConfig() || { endpoint:"", model:"claude-haiku-4-5-20251001" };
  const bg = h(`<div class="sheet-bg"></div>`);
  const sheet = h(`<div class="sheet"><div class="grip"></div><div class="body">
    <h2 class="name serif">✨ Moteur IA avancé</h2>
    <p class="mute" style="font-size:14px">Par défaut, les dialogues sont générés localement (aucune connexion requise). Tu peux brancher un vrai modèle via un <b>proxy backend</b> qui détient la clé API — jamais de clé en clair côté navigateur.</p>
    <div class="field"><label>Endpoint du proxy (POST)</label><input class="input" id="ep" placeholder="https://mon-proxy.exemple/chat" value="${esc(cfg.endpoint||'')}"></div>
    <div class="field"><label>Modèle</label><input class="input" id="mdl" value="${esc(cfg.model||'')}"></div>
    <button class="btn" id="saveLLM">Enregistrer</button>
    <button class="btn ghost" id="clearLLM" style="margin-top:4px">Désactiver (moteur local)</button></div></div>`);
  const close = () => { bg.remove(); sheet.remove(); };
  bg.addEventListener("click", close);
  sheet.querySelector("#saveLLM").addEventListener("click", () => { LLM.setLLMConfig({ endpoint:sheet.querySelector("#ep").value.trim(), model:sheet.querySelector("#mdl").value.trim() }); toast("Moteur IA configuré ✨"); close(); });
  sheet.querySelector("#clearLLM").addEventListener("click", () => { LLM.setLLMConfig({ endpoint:"", model:cfg.model }); toast("Moteur local réactivé 🐾"); close(); });
  document.body.append(bg, sheet);
}

/* ---------- misc ---------- */
function timeAgo(ts){
  if(!ts) return ""; const s=(Date.now()-ts)/1000;
  if(s<60) return "à l'instant"; if(s<3600) return Math.floor(s/60)+" min";
  if(s<86400) return Math.floor(s/3600)+" h"; return Math.floor(s/86400)+" j";
}

if("serviceWorker" in navigator){ window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(()=>{})); }
