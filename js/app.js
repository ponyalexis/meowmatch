import * as Store from "./store.js";
import { fallbackAvatar, distanceKm } from "./data/seed.js";
import { ARCHETYPES, PERSONALITY_TAGS, LOOKING_FOR, NEIGHBORHOODS } from "./data/pools.js";
import * as Engine from "./engine/chat-engine.js";
import * as LLM from "./engine/llm-adapter.js";

const app = document.getElementById("app");
const tabbar = document.getElementById("tabbar");
const toastEl = document.getElementById("toast");

/* ---------- helpers ---------- */
const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
let viewToken = 0; // invalidé à chaque changement de vue (stoppe les timers d'autoplay)

function toast(msg){
  toastEl.textContent = msg; toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add("show"));
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toastEl.classList.remove("show"); setTimeout(() => toastEl.hidden = true, 250); }, 2200);
}

function imgWithFallback(cat, url, cls="", extra=""){
  const el = h(`<img class="${cls}" ${extra} alt="${esc(cat.name)}" src="${esc(url)}">`);
  el.addEventListener("error", () => { el.src = fallbackAvatar(cat); }, { once:true });
  return el;
}
function avatarUrl(cat){ return cat.photos?.[0]?.url || fallbackAvatar(cat); }

/* Renders *action* markup + line breaks into safe HTML. */
function renderCatText(text){
  return esc(text).replace(/\*([^*]+)\*/g, '<span class="action">$1</span>');
}

/* ---------- router ---------- */
function go(route){ location.hash = "#/" + route; }
function currentRoute(){ return location.hash.replace(/^#\//, "") || (Store.getState().onboarded ? "discover" : "onboard"); }

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

function setActiveTab(route){
  const base = route.split("/")[0];
  const show = ["discover","matches","profile"].includes(base) || base === "chat";
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

function render(){
  viewToken++;
  const route = currentRoute();
  const st = Store.getState();
  if(!st.onboarded && route !== "onboard"){ go("onboard"); return; }

  app.innerHTML = "";
  setActiveTab(route);
  window.scrollTo(0,0);

  const base = route.split("/")[0];
  if(base === "onboard") return renderOnboard();
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
  name:"", ageMonths:24, breed:"Européen (chat de gouttière)", gender:"female",
  archetype:"potdecolle", personality:[], lookingFor:LOOKING_FOR[0],
  neighborhood:"Le Marais (4e)", avatar:"🐱",
  stats:{ playfulness:60, laziness:55, affection:70, independence:45, chattiness:50, curiosity:60 },
  bio:""
};
const AVATARS = ["🐱","🐈","🐈‍⬛","😺","😸","😻","🙀","😹","😽","🐯","🦁","🐾"];

function renderOnboard(){
  renderHero();
}

function renderHero(){
  const emojis = ["🐈","🐾","💛","😻","🐱","✨","🐈‍⬛","🎾"];
  const spread = emojis.map((e,i) => `<span style="left:${8+i*11}%;top:${10+(i%4)*16}%;animation-delay:${i*0.4}s">${e}</span>`).join("");
  const el = h(`<section class="hero">
    <div class="hero-emojis">${spread}</div>
    <div class="logo-badge">🐾</div>
    <h1>Trouvez l'âme<br>sœur de<br>votre chat.</h1>
    <p>Créez le profil de votre chat, swipez, matchez — puis lisez les conversations que leurs IA tiennent entre elles. À Paris, forcément.</p>
    <button class="btn" id="startBtn">Créer le profil de mon chat 🐱</button>
    <button class="btn ghost" id="skipBtn" style="margin-top:6px">Jeter un œil aux célibataires d'abord</button>
  </section>`);
  el.querySelector("#startBtn").addEventListener("click", () => wizard(0));
  el.querySelector("#skipBtn").addEventListener("click", () => {
    // profil express pour tester tout de suite
    if(!Store.getState().myCat) quickCat();
    go("discover");
  });
  app.appendChild(el);
}

function quickCat(){
  const c = buildMyCat({ ...draft, name: draft.name || "Mon Chat" });
  Store.setMyCat(c);
}

const STEPS = ["identité","personnalité","tempérament","recherche","localisation"];
function wizard(step){
  viewToken++;
  app.innerHTML = "";
  tabbar.hidden = true;
  const pct = ((step+1)/STEPS.length)*100;
  const wrap = h(`<section class="wizard">
    <div class="wizard-head">
      <button class="back" aria-label="Retour">‹</button>
      <div class="progress"><i style="width:${pct}%"></i></div>
    </div>
    <div class="wizard-body" id="wbody"></div>
    <div class="wizard-foot"><button class="btn" id="nextBtn">Continuer</button></div>
  </section>`);
  wrap.querySelector(".back").addEventListener("click", () => step === 0 ? renderOnboard() : wizard(step-1));
  const body = wrap.querySelector("#wbody");
  const nextBtn = wrap.querySelector("#nextBtn");

  if(step === 0) stepIdentity(body);
  if(step === 1) stepPersonality(body);
  if(step === 2) stepTemperament(body);
  if(step === 3) stepLooking(body);
  if(step === 4){ stepLocation(body); nextBtn.textContent = "C'est parti ! 🎉"; }

  nextBtn.addEventListener("click", () => {
    if(step === 0 && !draft.name.trim()){ toast("Donne un petit nom à ton chat 🐾"); return; }
    if(step < STEPS.length-1) wizard(step+1);
    else { Store.setMyCat(buildMyCat(draft)); toast("Profil créé ! Swipe pour rencontrer 😻"); go("discover"); }
  });
  app.appendChild(wrap);
}

function stepIdentity(body){
  body.appendChild(h(`<div>
    <div class="step-kicker">Étape 1 / 5</div>
    <h2 class="step-title">Qui est ton chat ?</h2>
    <p class="step-sub">Les bases pour faire chavirer les cœurs félins.</p>
  </div>`));
  const avatars = h(`<div class="field"><label>Sa petite tête</label><div class="avatar-pick"></div></div>`);
  const pick = avatars.querySelector(".avatar-pick");
  AVATARS.forEach(a => {
    const b = h(`<button class="${a===draft.avatar?'on':''}">${a}</button>`);
    b.addEventListener("click", () => { draft.avatar = a; pick.querySelectorAll("button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); });
    pick.appendChild(b);
  });
  body.appendChild(avatars);

  const name = h(`<div class="field"><label>Son nom</label><input class="input" placeholder="Minou, Pixel, Duchesse…" value="${esc(draft.name)}"></div>`);
  name.querySelector("input").addEventListener("input", e => draft.name = e.target.value);
  body.appendChild(name);

  const age = h(`<div class="field"><label>Âge : <b id="ageLbl">${ageStr(draft.ageMonths)}</b></label>
    <input type="range" min="3" max="200" value="${draft.ageMonths}"></div>`);
  age.querySelector("input").addEventListener("input", e => { draft.ageMonths = +e.target.value; age.querySelector("#ageLbl").textContent = ageStr(draft.ageMonths); });
  body.appendChild(age);

  const gender = h(`<div class="field"><label>Genre</label><div class="chips"></div></div>`);
  [["female","Femelle ♀️"],["male","Mâle ♂️"]].forEach(([k,l]) => {
    const c = h(`<button class="chip ${draft.gender===k?'on':''}">${l}</button>`);
    c.addEventListener("click", () => { draft.gender=k; gender.querySelectorAll(".chip").forEach(x=>x.classList.remove("on")); c.classList.add("on"); });
    gender.querySelector(".chips").appendChild(c);
  });
  body.appendChild(gender);
}

function stepPersonality(body){
  body.appendChild(h(`<div>
    <div class="step-kicker">Étape 2 / 5</div>
    <h2 class="step-title">Sa vibe</h2>
    <p class="step-sub">Choisis son archétype et jusqu'à 5 traits.</p>
  </div>`));
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
  body.appendChild(h(`<div>
    <div class="step-kicker">Étape 3 / 5</div>
    <h2 class="step-title">Son tempérament</h2>
    <p class="step-sub">Ça guide comment son IA discutera avec les autres.</p>
  </div>`));
  const labels = { playfulness:"Joueur", laziness:"Marmotte", affection:"Câlin", independence:"Indépendant", chattiness:"Bavard", curiosity:"Curieux" };
  const box = h(`<div class="field"></div>`);
  Object.keys(draft.stats).forEach(k => {
    const row = h(`<div class="slider-row"><label>${labels[k]}</label>
      <input type="range" min="0" max="100" value="${draft.stats[k]}">
      <span class="slider-val">${draft.stats[k]}</span></div>`);
    row.querySelector("input").addEventListener("input", e => { draft.stats[k]=+e.target.value; row.querySelector(".slider-val").textContent = e.target.value; });
    box.appendChild(row);
  });
  body.appendChild(box);

  const bio = h(`<div class="field"><label>Bio (optionnel)</label>
    <textarea class="textarea" placeholder="Team radiateur, expert en siestes, cherche co-chat pour surveiller la rue…">${esc(draft.bio)}</textarea></div>`);
  bio.querySelector("textarea").addEventListener("input", e => draft.bio = e.target.value);
  body.appendChild(bio);
}

function stepLooking(body){
  body.appendChild(h(`<div>
    <div class="step-kicker">Étape 4 / 5</div>
    <h2 class="step-title">Il·elle cherche…</h2>
    <p class="step-sub">Sans pression, hein.</p>
  </div>`));
  const box = h(`<div class="field"><div class="chips" style="flex-direction:column;align-items:stretch"></div></div>`);
  LOOKING_FOR.forEach(l => {
    const c = h(`<button class="chip ${draft.lookingFor===l?'on':''}" style="text-align:left">${esc(l)}</button>`);
    c.addEventListener("click", () => { draft.lookingFor=l; box.querySelectorAll(".chip").forEach(x=>x.classList.remove("on")); c.classList.add("on"); });
    box.querySelector(".chips").appendChild(c);
  });
  body.appendChild(box);
}

function stepLocation(body){
  body.appendChild(h(`<div>
    <div class="step-kicker">Étape 5 / 5</div>
    <h2 class="step-title">Vous êtes où ?</h2>
    <p class="step-sub">Pour trouver des matchs dans le quartier. Paris only pour l'instant 🥐</p>
  </div>`));
  const geoBtn = h(`<button class="btn secondary" style="margin-bottom:16px">📍 Utiliser ma position</button>`);
  const status = h(`<p class="mute" style="font-size:13px;margin:-8px 0 16px"></p>`);
  geoBtn.addEventListener("click", () => {
    status.textContent = "Localisation…";
    navigator.geolocation?.getCurrentPosition(
      pos => { Store.setLocation({ lat:pos.coords.latitude, lng:pos.coords.longitude }); status.textContent = "Position enregistrée ✅"; toast("Position trouvée 📍"); },
      () => { status.textContent = "Impossible — quartier utilisé à la place."; },
      { timeout: 6000 }
    ) || (status.textContent = "Géoloc indisponible ici.");
  });
  body.appendChild(geoBtn); body.appendChild(status);

  const hood = h(`<div class="field"><label>Ou choisis un quartier</label><select class="input"></select></div>`);
  const sel = hood.querySelector("select");
  NEIGHBORHOODS.forEach(n => { const o = document.createElement("option"); o.value = n.name; o.textContent = n.name; if(n.name===draft.neighborhood) o.selected = true; sel.appendChild(o); });
  sel.addEventListener("change", e => {
    draft.neighborhood = e.target.value;
    const n = NEIGHBORHOODS.find(x => x.name === e.target.value);
    if(n) Store.setLocation({ lat:n.lat, lng:n.lng });
  });
  body.appendChild(hood);
}

function ageStr(m){ if(m<12) return `${m} mois`; const y=Math.floor(m/12), r=m%12; return r?`${y} an${y>1?'s':''} ${r} mois`:`${y} an${y>1?'s':''}`; }

function buildMyCat(d){
  const n = NEIGHBORHOODS.find(x => x.name === d.neighborhood) || NEIGHBORHOODS[0];
  return {
    id:"me", name:d.name.trim()||"Mon Chat", seedKey:"me-"+(d.name||"chat"),
    breed:d.breed, breedTag:"", gender:d.gender, genderLabel:d.gender==='male'?'Mâle':'Femelle',
    ageMonths:d.ageMonths, ageLabel:ageStr(d.ageMonths), neutered:true,
    neighborhood:d.neighborhood, location:{ lat:n.lat, lng:n.lng },
    photos:[{ url:fallbackAvatar({name:d.name,seedKey:"me"}), caption:"Mon chat" }],
    bio:d.bio || "Un chat mystérieux qui n'a pas encore écrit sa bio.",
    archetype:ARCHETYPES.find(a=>a.key===d.archetype)||ARCHETYPES[0],
    personality:d.personality.length?d.personality:["câlin·e"],
    stats:d.stats, lookingFor:d.lookingFor, dealbreaker:"", favorites:{ food:"thon", toy:"la balle en alu", spot:"le radiateur", activity:"observer les pigeons" },
    zodiac:"", prompts:[], ownerNote:"", isBot:false, avatarEmoji:d.avatar, verified:false
  };
}

/* ============================================================
   DISCOVER — swipe deck
   ============================================================ */
function renderDiscover(){
  const wrap = h(`<div>
    <header class="topbar">
      <div class="brand"><span class="paw">🐾</span>Meow<b>Match</b></div>
      <button class="pill" id="filterPill">📍 ${Store.getState().settings.radiusKm} km</button>
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

  wrap.querySelector("#filterPill").addEventListener("click", openFilters);
  const deck = wrap.querySelector("#deck");
  let queue = Store.getDeck();
  let lastActed = null;

  function paint(){
    deck.innerHTML = "";
    if(queue.length === 0){
      deck.appendChild(h(`<div class="empty-deck">
        <div class="big">🐈‍⬛</div>
        <h3 class="serif">Plus de museaux pour l'instant</h3>
        <p class="mute">Élargis ton rayon ou reviens plus tard — de nouveaux chats emménagent tous les jours.</p>
        <button class="btn secondary" id="widen" style="margin-top:10px;max-width:220px">Élargir la recherche</button>
      </div>`));
      deck.querySelector("#widen")?.addEventListener("click", () => { Store.updateSettings({ radiusKm: Math.min(50, Store.getState().settings.radiusKm + 15) }); render(); });
      return;
    }
    // 2 cartes : celle du dessous puis celle du dessus (pour l'effet pile)
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
      <div class="stamp like">MIAM</div>
      <div class="stamp nope">NOPE</div>
      <div class="card-info">
        <div class="name-row">
          <h2>${esc(cat.name)}</h2><span class="age">${esc(cat.ageLabel)}</span>
          ${cat.verified?'<span class="verif">✅</span>':''}${cat.isBot?'<span class="bot-tag">IA</span>':''}
        </div>
        <div class="meta">
          <span>📍 ${cat.distanceKm.toFixed(1)} km</span>
          <span>${cat.archetype.emoji} ${esc(cat.archetype.label)}</span>
          <span>🐾 ${esc(cat.breed.replace(/\s*\(.*\)/,''))}</span>
        </div>
        <div class="tagline">${esc(cat.bio.split('. ')[0])}.</div>
        <div class="scroll-hint">Touche la carte pour voir le profil complet ↑</div>
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

    if(isBehind) return card; // pas d'interaction sur la carte du fond

    card.querySelector(".photo-tap.left").addEventListener("click", (e)=>{ e.stopPropagation(); showPhoto(photoIdx-1); });
    card.querySelector(".photo-tap.right").addEventListener("click", (e)=>{ e.stopPropagation(); showPhoto(photoIdx+1); });
    card.querySelector(".card-info").addEventListener("click", () => openProfileSheet(cat, act));

    enableDrag(card, act);
    return card;
  }

  // Applique une décision et repeint
  function act(kind){
    const cat = queue[0];
    if(!cat) return;
    lastActed = cat.id;
    if(kind === "like" || kind === "star"){
      const matched = Store.like(cat.id);
      if(matched) showMatchModal(cat);
      else toast(kind==="star" ? "Coup de cœur envoyé ⭐" : "Like envoyé ❤️");
    } else if(kind === "pass"){
      Store.pass(cat.id);
    }
    queue = Store.getDeck();
    paint();
    setActiveTab(currentRoute());
  }

  // Flèches d'action
  wrap.querySelector("#btnLike").addEventListener("click", () => flyOut("like", act));
  wrap.querySelector("#btnNope").addEventListener("click", () => flyOut("pass", act));
  wrap.querySelector("#btnStar").addEventListener("click", () => flyOut("star", act));
  wrap.querySelector("#btnRewind").addEventListener("click", () => {
    if(!lastActed){ toast("Rien à annuler 🐾"); return; }
    Store.rewind(lastActed); lastActed = null; queue = Store.getDeck(); paint(); toast("Retour en arrière ↩️");
  });

  function flyOut(kind, cb){
    const card = deck.querySelector(".swipe-card:not(.behind)");
    if(!card){ cb(kind); return; }
    const dir = kind==="pass" ? -1 : 1;
    const up = kind==="star" ? -1 : 0;
    card.style.transition = "transform .35s ease, opacity .35s ease";
    card.style.transform = `translate(${dir*160}%, ${up? -60: 20}%) rotate(${dir*22}deg)`;
    card.style.opacity = "0";
    const stamp = card.querySelector(kind==="pass" ? ".stamp.nope" : ".stamp.like");
    if(stamp) stamp.style.opacity = "1";
    setTimeout(() => cb(kind), 300);
  }

  paint();

  /* ---- drag/swipe ---- */
  function enableDrag(card, cb){
    let startX=0, startY=0, dragging=false, dx=0, dy=0;
    const likeStamp = card.querySelector(".stamp.like");
    const nopeStamp = card.querySelector(".stamp.nope");
    const down = (e) => {
      // ne pas déclencher le drag sur les zones de tap photo / info
      dragging = true; card.style.transition = "none";
      const p = point(e); startX = p.x; startY = p.y;
      card.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if(!dragging) return;
      const p = point(e); dx = p.x - startX; dy = p.y - startY;
      if(Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx*0.05}deg)`;
      likeStamp.style.opacity = Math.max(0, dx/120);
      nopeStamp.style.opacity = Math.max(0, -dx/120);
    };
    const upFn = () => {
      if(!dragging) return; dragging = false;
      card.style.transition = "transform .3s ease, opacity .3s ease";
      if(dx > 110){ finish(1); }
      else if(dx < -110){ finish(-1); }
      else { card.style.transform = ""; likeStamp.style.opacity=0; nopeStamp.style.opacity=0; }
    };
    function finish(dir){
      card.style.transform = `translate(${dir*170}%, ${dy}px) rotate(${dir*22}deg)`;
      card.style.opacity = "0";
      setTimeout(() => cb(dir>0 ? "like":"pass"), 260);
    }
    card.addEventListener("pointerdown", down);
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", upFn);
    card.addEventListener("pointercancel", upFn);
  }
  function point(e){ return { x: e.clientX ?? e.touches?.[0]?.clientX ?? 0, y: e.clientY ?? e.touches?.[0]?.clientY ?? 0 }; }
}

function openFilters(){
  const st = Store.getState();
  const bg = h(`<div class="sheet-bg"></div>`);
  const sheet = h(`<div class="sheet" style="max-height:auto">
    <div class="grip"></div>
    <div class="body">
      <h2 class="name serif">Filtres</h2>
      <div class="info-card">
        <h4>Rayon de recherche</h4>
        <div class="slider-row" style="margin:6px 0 0">
          <input type="range" min="1" max="50" value="${st.settings.radiusKm}">
          <span class="slider-val" id="rv">${st.settings.radiusKm} km</span>
        </div>
      </div>
      <div class="info-card" style="display:flex;justify-content:space-between;align-items:center">
        <div><h4 style="margin:0">Afficher les profils IA</h4><p class="mute" style="font-size:13px;margin:4px 0 0">Chats gérés par une IA (badge « IA »).</p></div>
        <button class="chip ${st.settings.showBots?'on':''}" id="botToggle">${st.settings.showBots?'Oui':'Non'}</button>
      </div>
      <button class="btn" id="applyF" style="margin-top:10px">Appliquer</button>
    </div>
  </div>`);
  let radius = st.settings.radiusKm, showBots = st.settings.showBots;
  sheet.querySelector("input[type=range]").addEventListener("input", e => { radius=+e.target.value; sheet.querySelector("#rv").textContent = radius+" km"; });
  sheet.querySelector("#botToggle").addEventListener("click", (e) => { showBots=!showBots; e.target.classList.toggle("on", showBots); e.target.textContent = showBots?'Oui':'Non'; });
  const close = () => { bg.remove(); sheet.remove(); };
  bg.addEventListener("click", close);
  sheet.querySelector("#applyF").addEventListener("click", () => { Store.updateSettings({ radiusKm:radius, showBots }); close(); render(); });
  document.body.append(bg, sheet);
}

/* ============================================================
   PROFILE SHEET (détail complet)
   ============================================================ */
function openProfileSheet(cat, act){
  const bg = h(`<div class="sheet-bg"></div>`);
  const statLabels = { playfulness:"Joueur", laziness:"Marmotte", affection:"Câlin", independence:"Indépendant", chattiness:"Bavard", curiosity:"Curieux" };
  const sheet = h(`<div class="sheet"><div class="grip"></div><div class="gallery"></div>
    <div class="body">
      <h2 class="name serif">${esc(cat.name)}, ${esc(cat.ageLabel)} ${cat.isBot?'<span class="bot-tag">IA</span>':''}</h2>
      <div class="subline">${cat.archetype.emoji} ${esc(cat.archetype.label)} · 📍 ${esc(cat.neighborhood)}</div>

      <div class="info-card"><h4>À propos</h4><p>${esc(cat.bio)}</p></div>

      ${cat.prompts?.[0] ? `<div class="info-card prompt-card"><h4>${esc(cat.prompts[0].q)}</h4><div class="a">${esc(cat.prompts[0].a)}</div></div>`:''}

      <div class="info-card"><h4>Caractère</h4>
        <div class="factbox">${cat.personality.map(t=>`<span class="fact">${esc(t)}</span>`).join("")}</div>
      </div>

      ${cat.prompts?.[1] ? `<div class="info-card prompt-card"><h4>${esc(cat.prompts[1].q)}</h4><div class="a">${esc(cat.prompts[1].a)}</div></div>`:''}

      <div class="info-card"><h4>Tempérament</h4><div class="trait-grid">
        ${Object.entries(cat.stats).map(([k,v])=>`<div class="trait"><div class="t-top"><span>${statLabels[k]}</span><span>${v}</span></div><div class="bar"><i style="width:${v}%"></i></div></div>`).join("")}
      </div></div>

      <div class="info-card"><h4>Ses petits favoris</h4>
        <div class="factbox">
          <span class="fact">🍤 ${esc(cat.favorites.food)}</span>
          <span class="fact">🧶 ${esc(cat.favorites.toy)}</span>
          <span class="fact">🛋️ ${esc(cat.favorites.spot)}</span>
        </div>
      </div>

      ${cat.prompts?.[2] ? `<div class="info-card prompt-card"><h4>${esc(cat.prompts[2].q)}</h4><div class="a">${esc(cat.prompts[2].a)}</div></div>`:''}

      <div class="info-card"><h4>Recherche</h4><p>${esc(cat.lookingFor)}</p></div>
      ${cat.dealbreaker?`<div class="info-card"><h4>Non négociable</h4><p>${esc(cat.dealbreaker)}</p></div>`:''}
      ${cat.ownerNote?`<div class="info-card"><h4>Le mot de l'humain</h4><p>${esc(cat.ownerNote)}</p></div>`:''}
    </div>
    <div class="sheet-actions">
      <button class="round big nope">✖️</button>
      <button class="round star">⭐</button>
      <button class="round big like">❤️</button>
    </div>
  </div>`);
  const gal = sheet.querySelector(".gallery");
  cat.photos.forEach(p => {
    const shot = h(`<div class="shot"><span class="cap">${esc(p.caption)}</span></div>`);
    shot.prepend(imgWithFallback(cat, p.url));
    gal.appendChild(shot);
  });
  const close = () => { bg.remove(); sheet.remove(); };
  bg.addEventListener("click", close);
  if(act){
    sheet.querySelector(".nope").addEventListener("click", () => { close(); act("pass"); });
    sheet.querySelector(".like").addEventListener("click", () => { close(); act("like"); });
    sheet.querySelector(".star").addEventListener("click", () => { close(); act("star"); });
  } else {
    sheet.querySelector(".sheet-actions").style.display = "none";
  }
  document.body.append(bg, sheet);
}

/* ---- Match modal ---- */
function showMatchModal(cat){
  const my = Store.getState().myCat;
  const conf = Array.from({length:14}, (_,i)=>`<span class="confetti" style="left:${i*7}%;animation-delay:${i*0.12}s">${['🎉','💛','🐾','😻','✨'][i%5]}</span>`).join("");
  const modal = h(`<div class="match-modal">${conf}
    <div style="position:relative;z-index:2">
      <h1>C'est un match !</h1>
      <div class="avas"></div>
      <p><b>${esc(my?.name||'Ton chat')}</b> et <b>${esc(cat.name)}</b> se plaisent. Leurs IA vont faire connaissance… 😽</p>
      <button class="btn" id="goChat">Lire leur conversation 💬</button>
      <button class="btn ghost" id="keepSwipe" style="color:#fff;margin-top:4px">Continuer à swiper</button>
    </div>
  </div>`);
  const avas = modal.querySelector(".avas");
  avas.appendChild(imgWithFallback(my||cat, avatarUrl(my||cat)));
  avas.appendChild(imgWithFallback(cat, avatarUrl(cat)));
  modal.querySelector("#goChat").addEventListener("click", () => { modal.remove(); go("chat/m_"+cat.id); });
  modal.querySelector("#keepSwipe").addEventListener("click", () => modal.remove());
  document.body.appendChild(modal);
}

/* ============================================================
   MATCHES list
   ============================================================ */
function renderMatches(){
  const st = Store.getState();
  const wrap = h(`<div>
    <header class="topbar"><div class="brand"><span class="paw">💬</span>Matchs</div></header>
  </div>`);
  app.appendChild(wrap);

  if(st.matches.length === 0){
    wrap.appendChild(h(`<div class="empty-deck" style="height:60vh">
      <div class="big">😽</div>
      <h3 class="serif">Pas encore de match</h3>
      <p class="mute">Swipe des museaux dans l'onglet Découvrir pour lancer les premières rencontres.</p>
      <button class="btn secondary" style="max-width:200px;margin-top:10px" onclick="location.hash='#/discover'">Découvrir</button>
    </div>`));
    return;
  }

  // Nouveaux matchs (sans conversation démarrée)
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
  if(withMsg.length === 0) list.appendChild(h(`<p class="mute" style="padding:0 18px">Touche un nouveau match pour lancer la conversation de leurs IA 🐾</p>`));
  withMsg.forEach(m => {
    const cat = Store.catById(m.catId);
    const last = m.messages[m.messages.length-1];
    const who = last.fromId === cat.id ? cat.name : (st.myCat?.name || "Ton chat");
    const item = h(`<div class="conv-item">
      <div class="mid">
        <div class="top"><span class="cname">${esc(cat.name)} ${cat.isBot?'<span class="bot-tag">IA</span>':''}</span><span class="time">${timeAgo(m.lastTs)}</span></div>
        <div class="snippet ${m.unread?'unread':''}">${esc(who)}: ${esc(stripActions(last.text)).slice(0,46)}…</div>
      </div>
      ${m.unread?'<div class="dot-unread"></div>':''}
    </div>`);
    item.prepend(imgWithFallback(cat, avatarUrl(cat), "ava"));
    item.addEventListener("click", () => go("chat/"+m.id));
    list.appendChild(item);
  });
  wrap.appendChild(list);
}

function stripActions(t){ return t.replace(/\*[^*]+\*/g, "").replace(/\s+/g," ").trim() || t; }

/* ============================================================
   CHAT — conversation entre les deux IA
   ============================================================ */
function renderChat(matchId){
  const myToken = viewToken;
  const match = Store.getMatch(matchId);
  const st = Store.getState();
  if(!match){ go("matches"); return; }
  const cat = Store.catById(match.catId);
  const my = st.myCat;
  Store.markRead(matchId);

  const wrap = h(`<div>
    <div class="chat-head">
      <button class="back">‹</button>
      <div class="who"><b>${esc(my?.name||'Ton chat')} 🐾 ${esc(cat.name)}</b><small id="moodLine"></small></div>
      <button class="info-btn">ⓘ</button>
    </div>
    <div class="affinity"><span>💞</span><div class="bar"><i id="affBar"></i></div><span id="affPct"></span></div>
    <div class="chat-banner">💡 Ce sont leurs IA qui discutent. Réagis aux messages (❤️ 😹 👎) pour rendre le moteur plus drôle au fil du temps.</div>
    <div class="chat-scroll" id="scroll"></div>
    <div class="chat-foot">
      <button class="toggle" id="autoToggle">▶︎ Auto</button>
      <button class="btn plum" id="moreBtn">Générer la suite 💬</button>
    </div>
  </div>`);
  app.appendChild(wrap);
  wrap.querySelector(".back").addEventListener("click", () => go("matches"));
  wrap.querySelector(".info-btn").addEventListener("click", () => openProfileSheet(cat, null));

  const scroll = wrap.querySelector("#scroll");
  const moodLine = wrap.querySelector("#moodLine");
  const affBar = wrap.querySelector("#affBar");
  const affPct = wrap.querySelector("#affPct");
  const autoToggle = wrap.querySelector("#autoToggle");
  const moreBtn = wrap.querySelector("#moreBtn");

  // init état de conversation
  if(match.affinity == null) match.affinity = Engine.compatibility(my || cat, cat);
  if(!match.turnState) match.turnState = { affinity: match.affinity, turnIndex: match.messages.length, lastBeat:null, lastSpeakerId: match.messages.length? match.messages[match.messages.length-1].fromId : null };

  function updateAffinity(){
    const a = match.affinity;
    affBar.style.width = a + "%";
    affPct.textContent = a + "%";
    moodLine.textContent = Engine.moodTag(a);
  }

  function bubble(msg){
    const isCat = msg.fromId === cat.id;
    const who = isCat ? cat : (my || cat);
    const row = h(`<div class="msg ${isCat?'left':'right'}" data-key="${msg.tplKey||''}">
      <span class="react-btn">＋</span>
      <div class="bubble">${renderCatText(msg.text)}${msg.reaction?`<span class="reaction">${msg.reaction==='love'?'❤️':msg.reaction==='funny'?'😹':'👎'}</span>`:''}</div>
    </div>`);
    row.prepend(imgWithFallback(who, avatarUrl(who), "m-ava"));
    if(msg.reaction) row.classList.add("reacted");
    row.querySelector(".react-btn").addEventListener("click", () => openReactions(row, msg));
    return row;
  }

  function openReactions(row, msg){
    const existing = row.querySelector(".react-pop");
    if(existing){ existing.remove(); return; }
    const pop = h(`<div class="react-pop" style="position:absolute;background:#fff;border-radius:999px;padding:6px 10px;box-shadow:var(--shadow-md);display:flex;gap:10px;font-size:20px;z-index:5;transform:translateY(-34px)">
      <span data-r="love">❤️</span><span data-r="funny">😹</span><span data-r="meh">👎</span></div>`);
    row.querySelector(".bubble").style.position = "relative";
    row.querySelector(".bubble").appendChild(pop);
    pop.querySelectorAll("span").forEach(s => s.addEventListener("click", () => {
      const r = s.dataset.r;
      msg.reaction = r;
      if(msg.tplKey){ Engine.learnFromReaction(st.memory, msg.tplKey, r); Store.saveMemory(st.memory); }
      Store.saveMatch(match);
      pop.remove();
      // re-render juste ce message
      const nb = bubble(msg); row.replaceWith(nb);
      toast(r==='meh' ? "Noté, on évitera ce style 👎" : "Le moteur apprend ce qui te plaît ✨");
    }));
    setTimeout(() => document.addEventListener("click", function off(e){ if(!pop.contains(e.target)){ pop.remove(); document.removeEventListener("click", off); } }), 0);
  }

  function paintAll(){
    scroll.innerHTML = "";
    if(match.messages.length === 0){
      scroll.appendChild(h(`<div class="day-sep">Vous avez matché · ${timeAgo(match.createdAt)}</div>`));
      scroll.appendChild(h(`<div class="center-col" style="padding:20px;gap:10px">
        <div style="font-size:40px">😻</div>
        <p class="mute" style="max-width:260px">${esc(cat.name)} et ${esc(my?.name||'ton chat')} viennent de matcher. Lance leur toute première conversation !</p>
      </div>`));
    } else {
      scroll.appendChild(h(`<div class="day-sep">Conversation de leurs IA</div>`));
      match.messages.forEach(m => scroll.appendChild(bubble(m)));
    }
    updateAffinity();
    scroll.scrollTop = scroll.scrollHeight;
  }

  async function generateBatch(n=2){
    if(myToken !== viewToken) return;
    moreBtn.disabled = true;
    // tentative LLM (si configuré), sinon procédural
    let produced = null;
    if(LLM.llmEnabled()){
      const hist = match.messages.map(m => ({ from: m.fromId===cat.id?'B':'A', text: m.text }));
      produced = await LLM.generateViaLLM(my||cat, cat, match.affinity, hist, n);
    }
    if(!produced){
      const res = Engine.generateTurns({ catA: my||cat, catB: cat, count: n, state: match.turnState, memory: st.memory });
      produced = res.messages;
      match.turnState = res.state;
      match.affinity = res.state.affinity;
    }
    // affiche avec indicateur "en train d'écrire"
    for(const msg of produced){
      if(myToken !== viewToken) return;
      const isCat = msg.fromId === cat.id;
      const typing = h(`<div class="typing" style="${isCat?'':'margin-left:auto;margin-right:34px'}"><i></i><i></i><i></i></div>`);
      scroll.appendChild(typing); scroll.scrollTop = scroll.scrollHeight;
      await sleep(650 + Math.min(1200, msg.text.length*18));
      if(myToken !== viewToken) return;
      typing.remove();
      msg.ts = Date.now();
      match.messages.push(msg);
      scroll.appendChild(bubble(msg));
      updateAffinity();
      scroll.scrollTop = scroll.scrollHeight;
      match.lastTs = Date.now();
      Store.saveMatch(match);
      await sleep(280);
    }
    moreBtn.disabled = false;
    Store.saveMemory(st.memory);
  }

  let auto = false;
  autoToggle.addEventListener("click", async () => {
    auto = !auto;
    autoToggle.classList.toggle("on", auto);
    autoToggle.textContent = auto ? "⏸ Auto" : "▶︎ Auto";
    while(auto && myToken === viewToken){
      await generateBatch(2);
      if(!auto || myToken !== viewToken) break;
      await sleep(900);
      if(match.messages.length > 80){ auto=false; autoToggle.classList.remove("on"); autoToggle.textContent="▶︎ Auto"; toast("Sacrée conversation ! 😹"); break; }
    }
  });
  moreBtn.addEventListener("click", () => generateBatch(2));

  paintAll();
  // Démarrage automatique de la toute première conversation
  if(match.messages.length === 0){ setTimeout(() => generateBatch(3), 400); }
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

/* ============================================================
   MY PROFILE
   ============================================================ */
function renderProfile(){
  const st = Store.getState();
  const my = st.myCat;
  const learn = Engine.learningSummary(st.memory);
  const wrap = h(`<div>
    <header class="topbar"><div class="brand"><span class="paw">🐱</span>Mon chat</div>
      <button class="pill" id="editBtn">✏️ Modifier</button>
    </header>
    <div class="me-hero">
      <div class="ava">${my?.avatarEmoji || '🐱'}</div>
      <h2 class="serif">${esc(my?.name||'Mon Chat')}, ${esc(my?.ageLabel||'')}</h2>
      <div class="sub">${my?.archetype?.emoji||''} ${esc(my?.archetype?.label||'')} · 📍 ${esc(my?.neighborhood||'Paris')}</div>
    </div>
    <div class="stat-row">
      <div class="s"><b>${st.likes.length}</b><span>Likes</span></div>
      <div class="s"><b>${st.matches.length}</b><span>Matchs</span></div>
      <div class="s"><b>${st.matches.reduce((a,m)=>a+m.messages.length,0)}</b><span>Messages IA</span></div>
    </div>

    <div class="info-card" style="margin:0 14px 14px">
      <h4>🧠 Moteur d'IA — niveau ${learn.level}</h4>
      <p style="font-size:14px">Ton moteur de conversation apprend de tes réactions. Plus tu réagis (❤️ 😹 👎), plus les dialogues collent à ton humour.</p>
      <div class="factbox" style="margin-top:10px">
        <span class="fact">${learn.reactions} réactions</span>
        <span class="fact">${learn.tunedLines} répliques affinées</span>
      </div>
    </div>

    <div class="menu">
      <button id="mBio"><span class="ico">📝</span> Voir mon profil public <span class="chev">›</span></button>
      <button id="mLLM"><span class="ico">✨</span> Moteur IA avancé (LLM) <span class="chev">›</span></button>
      <button id="mInstall"><span class="ico">📲</span> Installer l'app <span class="chev">›</span></button>
      <button id="mReset" class="danger"><span class="ico">🗑️</span> Réinitialiser (effacer tout)</button>
    </div>
    <p class="mute" style="text-align:center;font-size:12px;margin:16px">MeowMatch · démo · faite avec 🐾 à Paris</p>
  </div>`);
  app.appendChild(wrap);
  wrap.querySelector("#editBtn").addEventListener("click", () => { seedDraftFromMy(); wizard(0); });
  wrap.querySelector("#mBio").addEventListener("click", () => openProfileSheet(publicSelf(), null));
  wrap.querySelector("#mLLM").addEventListener("click", openLLMConfig);
  wrap.querySelector("#mInstall").addEventListener("click", () => toast("Menu du navigateur → « Ajouter à l'écran d'accueil » 📲"));
  wrap.querySelector("#mReset").addEventListener("click", () => { if(confirm("Tout effacer et repartir de zéro ?")){ Store.resetAll(); location.hash="#/onboard"; render(); } });
}

function publicSelf(){
  const my = Store.getState().myCat;
  return { ...my, photos: my.photos?.length? my.photos : [{ url: fallbackAvatar(my), caption:"Mon chat" }], prompts: my.prompts||[], favorites: my.favorites };
}
function seedDraftFromMy(){
  const my = Store.getState().myCat; if(!my) return;
  Object.assign(draft, {
    name:my.name, ageMonths:my.ageMonths, gender:my.gender, archetype:my.archetype.key,
    personality:[...my.personality], lookingFor:my.lookingFor, neighborhood:my.neighborhood,
    avatar:my.avatarEmoji||"🐱", stats:{...my.stats}, bio:my.bio
  });
}

function openLLMConfig(){
  const cfg = LLM.getLLMConfig() || { endpoint:"", model:"claude-haiku-4-5-20251001" };
  const bg = h(`<div class="sheet-bg"></div>`);
  const sheet = h(`<div class="sheet">
    <div class="grip"></div>
    <div class="body">
      <h2 class="name serif">✨ Moteur IA avancé</h2>
      <p class="mute" style="font-size:14px">Par défaut, les dialogues sont générés localement (aucune connexion requise). Tu peux brancher un vrai modèle via un <b>proxy backend</b> qui détient la clé API — ne mets jamais de clé en clair côté navigateur.</p>
      <div class="field"><label>Endpoint du proxy (POST)</label><input class="input" id="ep" placeholder="https://mon-proxy.exemple/chat" value="${esc(cfg.endpoint||'')}"></div>
      <div class="field"><label>Modèle</label><input class="input" id="mdl" value="${esc(cfg.model||'')}"></div>
      <p class="mute" style="font-size:12px">Format attendu : le proxy renvoie <code>{ messages:[{from:'A'|'B',text}] }</code>. Voir README.md.</p>
      <button class="btn" id="saveLLM">Enregistrer</button>
      <button class="btn ghost" id="clearLLM" style="margin-top:4px">Désactiver (revenir au moteur local)</button>
    </div>
  </div>`);
  const close = () => { bg.remove(); sheet.remove(); };
  bg.addEventListener("click", close);
  sheet.querySelector("#saveLLM").addEventListener("click", () => {
    LLM.setLLMConfig({ endpoint: sheet.querySelector("#ep").value.trim(), model: sheet.querySelector("#mdl").value.trim() });
    toast("Moteur IA configuré ✨"); close();
  });
  sheet.querySelector("#clearLLM").addEventListener("click", () => { LLM.setLLMConfig({ endpoint:"", model:cfg.model }); toast("Moteur local réactivé 🐾"); close(); });
  document.body.append(bg, sheet);
}

/* ---------- misc ---------- */
function timeAgo(ts){
  if(!ts) return "";
  const s = (Date.now()-ts)/1000;
  if(s<60) return "à l'instant";
  if(s<3600) return Math.floor(s/60)+" min";
  if(s<86400) return Math.floor(s/3600)+" h";
  return Math.floor(s/86400)+" j";
}

/* ---------- PWA service worker ---------- */
if("serviceWorker" in navigator){
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
