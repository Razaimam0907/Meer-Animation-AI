/* =========================================
   LENIS SMOOTH SCROLL
========================================= */
const lenis = new Lenis({
  duration: 1.2,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 0.9,
  touchMultiplier: 1.5
});
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);

// smooth anchor links through Lenis
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    if (id.length < 2) { e.preventDefault(); if (a.matches('.brand,[data-nav=home]')) lenis.scrollTo(0); return; }
    const t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    lenis.scrollTo(t, { offset: -20, duration: 1.5 });
  });
});

/* =========================================
   THREE.JS BACKGROUND (particles + wire shape)
========================================= */
(function initThree() {
  if (typeof THREE === "undefined") return;
  const canvas = document.getElementById("bg3d");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 14;

  const N = 900, pos = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) pos[i] = (Math.random() - 0.5) * 40;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe50914, size: 0.07, transparent: true, opacity: 0.8 }));
  scene.add(points);

  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(3, 0.8, 120, 16),
    new THREE.MeshBasicMaterial({ color: 0xb80710, wireframe: true, transparent: true, opacity: 0.18 })
  );
  knot.position.x = 7;
  scene.add(knot);

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    knot.position.x = innerWidth < 768 ? 0 : 7;
  }
  addEventListener("resize", resize); resize();

  let mx = 0, my = 0, sy = 0;
  addEventListener("pointermove", e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
  lenis.on("scroll", ({ scroll }) => { sy = scroll; });

  const clock = new THREE.Clock();
  (function loop() {
    const t = clock.getElapsedTime();
    points.rotation.y = t * 0.03 + sy * 0.0003;
    points.rotation.x = sy * 0.0002;
    knot.rotation.x = t * 0.15 + sy * 0.001;
    knot.rotation.y = t * 0.1;
    camera.position.x += (mx * 2 - camera.position.x) * 0.04;   // smooth parallax
    camera.position.y += (-my * 2 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    if (!document.hidden) renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
})();

/* =========================================
   HEADER: MENU, LOGIN, PRICING, VIDEO
========================================= */
const mobileMenu = document.getElementById("mobileMenu");
document.getElementById("hamburgerBtn").addEventListener("click", () => setMenu(!mobileMenu.classList.contains("open")));
document.getElementById("drawerBg").addEventListener("click", () => setMenu(false));
document.querySelectorAll(".mobile-menu a").forEach(l => l.addEventListener("click", () => setMenu(false)));
document.getElementById("loginBtn").addEventListener("click", () => openPage("login"));

const monthlyBtn = document.getElementById("monthlyBtn");
const yearlyBtn = document.getElementById("yearlyBtn");
const fanPrice = document.getElementById("fanPrice");
const megaPrice = document.getElementById("megaPrice");
monthlyBtn.addEventListener("click", () => {
  monthlyBtn.classList.add("active"); yearlyBtn.classList.remove("active");
  fanPrice.innerHTML = "₹469<span>/month</span>"; megaPrice.innerHTML = "₹569<span>/month</span>";
});
yearlyBtn.addEventListener("click", () => {
  yearlyBtn.classList.add("active"); monthlyBtn.classList.remove("active");
  fanPrice.innerHTML = "₹2,499<span>/year</span>"; megaPrice.innerHTML = "₹3,299<span>/year</span>";
});

const carouselEl = document.getElementById("carouselExampleIndicators");
carouselEl.addEventListener("slide.bs.carousel", () => document.querySelectorAll(".hero-video").forEach(v => v.pause()));
carouselEl.addEventListener("slid.bs.carousel", () => {
  const v = document.querySelector(".carousel-item.active .hero-video");
  if (v) v.play();
});

/* =========================================
   REAL ANIME DATA  (Jikan API – MyAnimeList, free, no key)
========================================= */
const API = "https://api.jikan.moe/v4";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cache = new Map();   // mal_id -> anime object

async function api(path) {
  try {
    const r = await fetch(API + path);
    if (r.status === 429) { await sleep(1200); return api(path); } // rate limit retry
    if (!r.ok) throw new Error(r.status);
    return (await r.json()).data || [];
  } catch (e) { console.error("API error", e); return []; }
}

/* =========================================
   TASTE PROFILE (the "AI" memory)
========================================= */
const G = { Action: 1, Adventure: 2, Comedy: 4, Mystery: 7, Drama: 8, Fantasy: 10, Horror: 14, Romance: 22, "Sci-Fi": 24, Sports: 30, "Slice of Life": 36, Supernatural: 37, Suspense: 41 };
const NAME = Object.fromEntries(Object.entries(G).map(([k, v]) => [v, k]));
const MOOD = {
  dark: [41, 14], scary: [14], horror: [14], funny: [4], laugh: [4], comedy: [4], love: [22], romantic: [22], romance: [22],
  fight: [1], fights: [1], action: [1], epic: [1, 2], magic: [10], fantasy: [10], space: [24], robot: [24], scifi: [24], "sci-fi": [24],
  sport: [30], sports: [30], mystery: [7], detective: [7], chill: [36], relax: [36], cozy: [36], sad: [8], emotional: [8], drama: [8],
  adventure: [2], ghost: [37], supernatural: [37], power: [37, 1], thriller: [41], psychological: [41, 7]
};

let profile = { w: {}, liked: [] };
try { profile = JSON.parse(localStorage.getItem("meerTaste")) || profile; } catch (e) {}
const save = () => localStorage.setItem("meerTaste", JSON.stringify(profile));
const addW = (ids, n) => ids.forEach(id => { profile.w[id] = Math.max(0, (profile.w[id] || 0) + n); });

function renderTaste() {
  const el = document.getElementById("taste");
  const top = Object.entries(profile.w).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = top[0] ? top[0][1] : 1;
  el.innerHTML = top.length
    ? top.map(([id, v]) => `<div class="bar"><b>${NAME[id] || id}</b><i style="width:${Math.max(8, v / max * 100)}%"></i></div>`).join("")
    : '<small style="color:#888">Your taste profile is empty — like some anime or pick genres above.</small>';
  document.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", (profile.w[c.dataset.id] || 0) > 0));
}

/* =========================================
   CARDS
========================================= */
function card(a) {
  cache.set(a.mal_id, a);
  const img = a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || "";
  const on = profile.liked.includes(a.mal_id);
  return `<article class="a-card reveal" data-id="${a.mal_id}"><img loading="lazy" src="${img}" alt="${esc(a.title)}">
    <div class="a-info"><h4>${esc(a.title)}</h4><small>★ ${a.score ?? "–"} · ${a.type || ""}</small></div>
    <button class="like ${on ? "on" : ""}" data-id="${a.mal_id}" aria-label="Like">♥</button></article>`;
}

const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}), { threshold: 0.12 });
const observe = (root = document) => root.querySelectorAll(".reveal:not(.in)").forEach((el, i) => {
  el.style.transitionDelay = (i % 8) * 60 + "ms";
  io.observe(el);
});

// like button -> teaches the AI
document.addEventListener("click", e => {
  const b = e.target.closest(".like");
  if (!b) return;
  const id = +b.dataset.id, a = cache.get(id);
  const genres = (a?.genres || []).map(g => g.mal_id);
  const i = profile.liked.indexOf(id);
  if (i > -1) { profile.liked.splice(i, 1); addW(genres, -1); }
  else { profile.liked.push(id); addW(genres, 1); }
  save(); renderTaste();
  document.querySelectorAll(`.like[data-id="${id}"]`).forEach(x => x.classList.toggle("on", i === -1));
});

// 3D tilt on cards
document.addEventListener("pointermove", e => {
  const c = e.target.closest?.(".a-card");
  if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty("--ry", ((e.clientX - r.left) / r.width - 0.5) * 14 + "deg");
  c.style.setProperty("--rx", -((e.clientY - r.top) / r.height - 0.5) * 14 + "deg");
});
document.addEventListener("pointerout", e => {
  const c = e.target.closest?.(".a-card");
  if (c) { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); }
});

/* =========================================
   DISCOVER + SEARCH
========================================= */
const grid = document.getElementById("discoverGrid");
const title = document.getElementById("discoverTitle");

async function showTrending() {
  grid.innerHTML = '<p style="color:#888">Loading…</p>';
  const data = await api("/top/anime?filter=airing&limit=12&sfw=true");
  title.innerHTML = "Trending <span>Now</span>";
  grid.innerHTML = data.length ? data.map(card).join("") : "<p>Could not load anime. Check your internet and refresh.</p>";
  observe(grid);
}

// AniList GraphQL: banners, covers, trailers, descriptions (free, no key)
const AL_QUERY = `query($q:String){Page(perPage:12){media(search:$q,type:ANIME,sort:SEARCH_MATCH,isAdult:false){
  id idMal startDate{year} title{romaji english} bannerImage coverImage{extraLarge} averageScore format episodes
  description(asHtml:false) genres trailer{id site}}}}`;

async function searchAniList(q) {
  try {
    const r = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: AL_QUERY, variables: { q } })
    });
    const j = await r.json();
    return (j.data?.Page?.media || []).map(m => ({
      mal_id: m.idMal || m.id, alId: m.id, malId: m.idMal, year: m.startDate?.year,
      title: m.title.english || m.title.romaji,
      images: { jpg: { large_image_url: m.coverImage.extraLarge } },
      banner: m.bannerImage,
      score: m.averageScore ? (m.averageScore / 10).toFixed(1) : null,
      type: m.format, episodes: m.episodes,
      synopsis: (m.description || "").replace(/<[^>]+>/g, ""),
      genres: m.genres.map(n => ({ name: n, mal_id: G[n] })).filter(g => g.mal_id || g.name),
      trailerEmbed: m.trailer?.site === "youtube" ? `https://www.youtube.com/embed/${m.trailer.id}` : null
    }));
  } catch (e) { console.error(e); return []; }
}

document.getElementById("searchForm").addEventListener("submit", async e => {
  e.preventDefault();
  const q = document.getElementById("searchInput").value.trim();
  if (!q) return;
  grid.innerHTML = '<p style="color:#888">Searching…</p>'; document.getElementById("azBar").innerHTML = "";
  lenis.scrollTo("#discover", { offset: -20, duration: 1.4 });
  const data = await searchAniList(q);
  title.innerHTML = `Results for <span>${esc(q)}</span>`;
  grid.innerHTML = data.length ? data.map(card).join("") : "<p>No anime found.</p>";
  observe(grid);
});

/* =========================================
   WATCH PAGE  (seasons + episodes)  &  NAVIGATION
   Seasons: AniList relations (prequel/sequel chain)
   Episodes / streaming links: Jikan (MyAnimeList)
========================================= */
const $ = id => document.getElementById(id);
const modal = $("watchModal"), mBody = $("watchBody"), info = $("infoModal"), iBody = $("infoBody");

// Your own hosted episodes: { malId: ["ep1.mp4","ep2.mp4"] }  (array index = episode - 1)
const OWN_VIDEOS = {};
const MAIL = "support@meeranimation.example";   // <- put your real contact email here

async function apiFull(path) {
  try {
    const r = await fetch(API + path);
    if (r.status === 429) { await sleep(1200); return apiFull(path); }
    if (!r.ok) throw 0;
    return await r.json();
  } catch (e) { return {}; }
}
async function al(query, variables) {
  try {
    const r = await fetch("https://graphql.anilist.co", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ query, variables }) });
    return (await r.json()).data || null;
  } catch (e) { return null; }
}
const NODE = `id idMal title{romaji english} bannerImage coverImage{extraLarge} averageScore format episodes status description(asHtml:false) genres trailer{id site} startDate{year month day} relations{edges{relationType node{id format}}}`;
const MQ = `query($id:Int,$mal:Int){Media(id:$id,idMal:$mal,type:ANIME){${NODE}}}`;
const KEEP = ["TV", "TV_SHORT", "ONA", "MOVIE", "OVA"];
const norm = m => ({
  alId: m.id, malId: m.idMal, title: m.title.english || m.title.romaji, cover: m.coverImage?.extraLarge, banner: m.bannerImage,
  score: m.averageScore ? (m.averageScore / 10).toFixed(1) : null, type: m.format, episodes: m.episodes, status: m.status,
  syn: (m.description || "").replace(/<[^>]+>/g, ""), genres: m.genres || [],
  trailer: m.trailer?.site === "youtube" ? `https://www.youtube.com/embed/${m.trailer.id}` : null,
  year: m.startDate?.year, date: (m.startDate?.year || 0) * 1e4 + (m.startDate?.month || 0) * 100 + (m.startDate?.day || 0)
});
const fromCard = a => ({
  alId: a.alId, malId: a.alId ? a.malId : a.mal_id, title: a.title, cover: a.images?.jpg?.large_image_url, banner: a.banner,
  score: a.score, type: a.type, episodes: a.episodes, syn: a.synopsis || "", genres: (a.genres || []).map(g => g.name),
  trailer: a.trailerEmbed || (a.trailer?.embed_url || "").replace("autoplay=1", "autoplay=0") || null, year: a.year, label: "Season 1"
});

// build the franchise: walk PREQUEL / SEQUEL links level by level
async function getSeasons(a) {
  const first = (await al(MQ, a.alId ? { id: a.alId } : { mal: a.mal_id }))?.Media;
  if (!first) return [fromCard(a)];
  const seen = new Map([[first.id, first]]);
  let level = [first];
  while (level.length && seen.size < 16) {
    const ids = [...new Set(level.flatMap(m => m.relations.edges
      .filter(e => /^(PREQUEL|SEQUEL)$/.test(e.relationType) && KEEP.includes(e.node.format) && !seen.has(e.node.id))
      .map(e => e.node.id)))].slice(0, 16 - seen.size);
    ids.forEach(i => seen.set(i, null));
    level = (await Promise.all(ids.map(i => al(MQ, { id: i }).then(d => d && d.Media)))).filter(Boolean);
    level.forEach(m => seen.set(m.id, m));
  }
  let n = 0;
  const list = [...seen.values()].filter(Boolean).map(norm).sort((x, y) => x.date - y.date);
  list.forEach(s => { s.label = /^(TV|TV_SHORT|ONA)$/.test(s.type) ? "Season " + (++n) : s.type === "MOVIE" ? "Movie" : "OVA"; s.first = s.alId === first.id; });
  return list;
}

let W = null; // { seasons, i, ep }
const fmtDate = d => d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";

async function openWatch(a) {
  const s0 = fromCard(a), my = W = { seasons: [s0], i: 0, ep: null };
  mBody.innerHTML = `<div class="w-banner" style="background-image:url('${s0.banner || s0.cover || ""}')"></div><div class="w-content"><h2>${esc(s0.title)}</h2><p class="w-meta">Loading seasons…</p></div>`;
  modal.classList.add("open"); lenis.stop();
  const seasons = await getSeasons(a);
  if (W !== my) return;
  W = { seasons, i: Math.max(0, seasons.findIndex(s => s.first)), ep: null };
  renderWatch();
}

function renderWatch() {
  const s = W.seasons[W.i];
  mBody.innerHTML = `<div class="w-banner" style="background-image:url('${s.banner || s.cover || ""}')"></div>
  <div class="w-content">
    <h2>${esc(s.title)}</h2>
    <p class="w-meta">★ ${s.score ?? "–"} · ${s.type || ""} · ${s.episodes ?? "?"} eps${s.year ? " · " + s.year : ""}${s.status ? " · " + s.status.replace(/_/g, " ") : ""}</p>
    <div class="chips">${s.genres.map(g => `<span class="chip on">${esc(g)}</span>`).join("")}</div>
    <div class="w-player" id="wPlayer"></div>
    ${W.seasons.length > 1 ? `<h4>Seasons</h4><div class="s-tabs">${W.seasons.map((x, i) => `<button class="chip ${i === W.i ? "on" : ""}" data-s="${i}">${x.label}<small>${x.year || ""}</small></button>`).join("")}</div>` : ""}
    <div class="ep-head"><h4>Episodes</h4><input id="epFilter" type="search" placeholder="Find episode…"></div>
    <div class="ep-list" id="epList"><p class="w-meta">Loading episodes…</p></div><div id="epMore"></div>
    <p class="w-syn">${esc(s.syn.slice(0, 700))}</p>
  </div>`;
  playEp(null); loadEps(s);
}

function playEp(n) {
  const s = W.seasons[W.i], box = $("wPlayer"); if (!box) return;
  W.ep = n;
  document.querySelectorAll(".ep").forEach(b => b.classList.toggle("on", +b.dataset.ep === n));
  const own = n && OWN_VIDEOS[s.malId]?.[n - 1];
  if (own) { box.innerHTML = `<video src="${esc(own)}" controls autoplay></video>`; return; }
  const links = (s.stream || []).map(l => `<a class="hero-btn sm" target="_blank" rel="noopener" href="${esc(l.url)}">▶ ${esc(l.name)}</a>`).join("");
  const bg = `background-image:linear-gradient(rgba(0,0,0,.72),rgba(0,0,0,.9)),url('${s.banner || s.cover || ""}')`;
  box.innerHTML = `<div class="w-ph" style="${bg}"><h3>${n ? `${s.label} · Episode ${n}` : esc(s.title)}</h3>
    <p>${n ? "This episode isn't hosted on Meer Animation yet. Watch it officially on:" : "Pick an episode below to start."}</p>
    <div class="btn-row">${n ? links : ""}${s.trailer ? '<button class="hero-btn sm" data-trailer>🎞 Trailer</button>' : ""}</div>
    ${n && !links ? "<small>No official streaming link found.</small>" : ""}</div>`;
}

async function loadEps(s, more) {
  const my = W;
  if (!s.eps) { s.eps = []; s.page = 0; s.more = true; if (s.type === "MOVIE") { s.eps = [{ mal_id: 1, title: s.title }]; s.more = false; } }
  if (!s.stream) { s.stream = []; if (s.malId) api(`/anime/${s.malId}/streaming`).then(l => { s.stream = l; if (W === my && W.seasons[W.i] === s) playEp(W.ep); }); }
  if (s.more && (more || !s.eps.length)) {
    if (s.malId) { const r = await apiFull(`/anime/${s.malId}/episodes?page=${s.page + 1}`); s.page++; s.eps.push(...(r.data || [])); s.more = !!r.pagination?.has_next_page; }
    else s.more = false;
    if (!s.eps.length && s.episodes) { s.eps = Array.from({ length: s.episodes }, (_, i) => ({ mal_id: i + 1, title: "Episode " + (i + 1) })); s.more = false; }
  }
  if (W === my && W.seasons[W.i] === s) drawEps(s);
}
function drawEps(s) {
  const q = ($("epFilter").value || "").toLowerCase();
  const eps = s.eps.filter(e => !q || String(e.mal_id) === q || (e.title || "").toLowerCase().includes(q));
  $("epList").innerHTML = eps.length ? eps.map(e => `<button class="ep ${W.ep === e.mal_id ? "on" : ""}" data-ep="${e.mal_id}"><b>${e.mal_id}</b><span><strong>${esc(e.title || "Episode " + e.mal_id)}</strong><small>${fmtDate(e.aired)}${e.filler ? " · Filler" : ""}${e.recap ? " · Recap" : ""}</small></span><i>▶</i></button>`).join("") : '<p class="w-meta">No episodes listed yet.</p>';
  $("epMore").innerHTML = s.more ? '<button class="chip" data-more>Load more episodes</button>' : "";
}
document.addEventListener("input", e => { if (e.target.id === "epFilter") drawEps(W.seasons[W.i]); });

function closeModal() {
  document.querySelectorAll(".modal-bg.open").forEach(m => m.classList.remove("open"));
  mBody.innerHTML = ""; W = null; lenis.start();
}

/* ---------- browse (drawer + footer) ---------- */
const DAY = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const BR = {
  trending: ["Trending <span>Now</span>", "/top/anime?filter=airing&limit=24&sfw=true"],
  top: ["Top <span>Rated</span>", "/top/anime?limit=24&sfw=true"],
  popular: ["Most <span>Popular</span>", "/top/anime?filter=bypopularity&limit=24&sfw=true"],
  new: ["New This <span>Season</span>", "/seasons/now?limit=24&sfw=true"],
  airing: ["Simulcasts <span>Airing</span>", "/top/anime?filter=airing&limit=24&sfw=true"],
  schedule: ["Releasing <span>Today</span>", () => `/schedule?filter=${DAY[new Date().getDay()]}&limit=24&sfw=true`],
  movies: ["Anime <span>Movies</span>", "/top/anime?type=movie&limit=24&sfw=true"],
  music: ["Music <span>Videos & Concerts</span>", "/anime?type=music&order_by=score&sort=desc&limit=24&sfw=true"],
  games: ["Video Game <span>Anime</span>", "/anime?q=video%20game&order_by=members&sort=desc&limit=24&sfw=true"]
};
const GN = { Action: 1, Adventure: 2, Comedy: 4, Drama: 8, Fantasy: 10, Music: 19, Romance: 22, "Sci-Fi": 24, Seinen: 42, Shojo: 25, Shonen: 27, "Slice of Life": 36, Sports: 30, Supernatural: 37, Thriller: 41 };
$("genreAcc").innerHTML = Object.entries(GN).map(([n, id]) => `<button type="button" class="chip" data-genre="${id}">${n}</button>`).join("");
$("genreBtn").addEventListener("click", () => $("genreWrap").classList.toggle("open"));

async function loadGrid(t, path, az) {
  title.innerHTML = t;
  $("azBar").innerHTML = az ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l => `<button class="chip ${l === az ? "on" : ""}" data-letter="${l}">${l}</button>`).join("") : "";
  grid.innerHTML = '<p style="color:#888">Loading…</p>';
  lenis.scrollTo("#discover", { offset: -20, duration: 1.4 });
  const seen = new Set(), data = (await api(path)).filter(a => !seen.has(a.mal_id) && seen.add(a.mal_id));
  grid.innerHTML = data.length ? data.map(card).join("") : "<p>Nothing found.</p>";
  observe(grid);
}
const azLoad = l => loadGrid("Anime <span>A–Z</span>", `/anime?letter=${l}&order_by=title&sort=asc&limit=24&sfw=true`, l);
function browse(k) { if (k === "az") return azLoad("A"); const [t, p] = BR[k] || BR.trending; return loadGrid(t, typeof p === "function" ? p() : p); }
const browseGenre = (id, n) => loadGrid(`${esc(n)} <span>Anime</span>`, `/anime?genres=${id}&order_by=score&sort=desc&min_score=6.5&limit=24&sfw=true`);
async function openByTitle(q) { const r = await searchAniList(q); if (r[0]) openWatch(r[0]); }

/* ---------- hamburger drawer ---------- */
function setMenu(o) {
  mobileMenu.classList.toggle("open", o); $("hamburgerBtn").classList.toggle("open", o);
  $("drawerBg").classList.toggle("open", o); $("hamburgerBtn").setAttribute("aria-expanded", o);
}

/* ---------- info pages, login, language ---------- */
const PAGES = {
  about: ["About Meer Animation", "<p>Meer Animation is an anime discovery hub: browse what's trending, explore every season and episode of a series, and let the AI Taste Studio build playlists around what you like.</p>"],
  help: ["Help Center", `<p>Search any anime from the top bar, open it, then pick a season and episode. Need a hand? Email <a href="mailto:${MAIL}">${MAIL}</a>.</p>`],
  terms: ["Terms of Service", "<p>Use Meer Animation for personal, non-commercial purposes. Anime data comes from MyAnimeList (via Jikan) and AniList; all titles belong to their owners.</p><small>Placeholder text — replace with your own terms.</small>"],
  privacy: ["Privacy Policy", "<p>Your taste profile, likes and login name are stored only in your own browser. We don't sell or share personal data.</p><small>Placeholder text — replace with your own policy.</small>"],
  cookies: ["Cookie Consent Tool", "<p>This site only uses browser storage for your taste profile and login name, plus a Google Translate cookie if you pick a language. To clear everything, clear this site's data in your browser settings.</p>"],
  press: ["Press Inquiries", `<p>For interviews and press kits, email <a href="mailto:${MAIL}">${MAIL}</a>.</p>`],
  ads: ["Advertising Inquiries", `<p>To advertise with us, email <a href="mailto:${MAIL}">${MAIL}</a>.</p>`],
  apps: ["Get the Apps", "<p>Mobile apps are coming soon. Meanwhile, open this site in your phone browser and choose <b>Add to Home Screen</b> for an app-like shortcut.</p>"],
  jobs: ["Jobs", `<p>No open roles right now, but we'd love to hear from you: <a href="mailto:${MAIL}">${MAIL}</a>.</p>`]
};
let user = null; try { user = JSON.parse(localStorage.getItem("meerUser")); } catch (e) {}
const paintUser = () => { $("loginBtn").textContent = user ? user.name.toUpperCase().slice(0, 10) : "LOGIN"; };
function openInfo(h) { iBody.innerHTML = h; info.classList.add("open"); lenis.stop(); }
function openPage(k) {
  if (k === "login" || k === "signup") {
    const up = k === "signup";
    if (user && !up) return openInfo(`<h2>Hi, ${esc(user.name)}</h2><p class="w-syn">You're logged in on this browser.</p><button class="hero-btn gen-btn" id="logout">LOG OUT</button>`);
    return openInfo(`<h2>${up ? "Create Account" : "Log In"}</h2><form class="auth" id="authForm">${up ? '<input name="name" placeholder="Username" required>' : ""}<input name="email" type="email" placeholder="Email" required><input name="password" type="password" placeholder="Password (6+ characters)" minlength="6" required><button class="hero-btn gen-btn">${up ? "SIGN UP" : "LOG IN"}</button></form><p class="w-meta">${up ? "Already have an account?" : "New here?"} <a href="#" data-page="${up ? "login" : "signup"}">${up ? "Log in" : "Create account"}</a></p>`);
  }
  if (PAGES[k]) openInfo(`<h2>${PAGES[k][0]}</h2><div class="w-syn">${PAGES[k][1]}</div>`);
}
document.addEventListener("submit", e => {
  if (e.target.id !== "authForm") return;
  e.preventDefault();
  const f = new FormData(e.target), email = f.get("email");
  user = { email, name: f.get("name") || email.split("@")[0] };   // front-end demo only: no password is stored
  localStorage.setItem("meerUser", JSON.stringify(user)); paintUser(); closeModal();
});

function setLang(l) {   // Google Translate website translator (needs the site served over http/https)
  const exp = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
  ["", ";domain=" + location.hostname].forEach(d => document.cookie = `googtrans=${l === "en" ? ";" + exp : "/en/" + l};path=/${d}`);
  location.reload();
}
if (/googtrans=\/en\/\w/.test(document.cookie)) {
  window.googleTranslateElementInit = () => new google.translate.TranslateElement({ pageLanguage: "en", autoDisplay: false }, "gt");
  const s = document.createElement("script"); s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"; document.head.appendChild(s);
}

/* ---------- one click handler for everything ---------- */
document.addEventListener("click", e => {
  const t = e.target;
  if (t.closest(".like")) return;
  const nav = t.closest("[data-browse],[data-genre],[data-anime],[data-page],[data-lang]");
  if (nav) {
    e.preventDefault(); setMenu(false); closeModal();
    const d = nav.dataset;
    if (d.browse) browse(d.browse);
    else if (d.genre) browseGenre(+d.genre, nav.textContent.trim());
    else if (d.anime) openByTitle(d.anime);
    else if (d.page) openPage(d.page);
    else if (d.lang) setLang(d.lang);
    return;
  }
  const c = t.closest(".a-card");
  if (c) { const a = cache.get(+c.dataset.id); if (a) openWatch(a); return; }
  if (t.matches("[data-close]")) return closeModal();
  if (t.id === "logout") { user = null; localStorage.removeItem("meerUser"); paintUser(); return closeModal(); }
  const l = t.closest("[data-letter]"); if (l) return azLoad(l.dataset.letter);
  if (!W) return;
  const s = t.closest("[data-s]"); if (s) { W.i = +s.dataset.s; W.ep = null; return renderWatch(); }
  const ep = t.closest(".ep"); if (ep) { playEp(+ep.dataset.ep); $("wPlayer").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  if (t.closest("[data-more]")) return loadEps(W.seasons[W.i], true);
  if (t.closest("[data-trailer]")) $("wPlayer").innerHTML = `<iframe src="${W.seasons[W.i].trailer}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
});
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); setMenu(false); } });
paintUser();

/* =========================================
   AI STUDIO
========================================= */
const msg = document.getElementById("aiMsg");
const chips = document.getElementById("chips");
chips.innerHTML = Object.entries(G).map(([n, id]) => `<button type="button" class="chip" data-id="${id}">${n}</button>`).join("");
chips.addEventListener("click", e => {
  const c = e.target.closest(".chip");
  if (!c) return;
  const id = +c.dataset.id;
  profile.w[id] = (profile.w[id] || 0) > 0 ? 0 : 2;
  save(); renderTaste();
});

// natural-language taste learning
document.getElementById("aiForm").addEventListener("submit", e => {
  e.preventDefault();
  const inp = document.getElementById("aiInput");
  const words = inp.value.toLowerCase().match(/[a-z-]+/g) || [];
  const hits = new Set();
  words.forEach(w => (MOOD[w] || []).forEach(id => hits.add(id)));
  if (!hits.size) { msg.textContent = "I couldn't pick up a mood. Try words like dark, funny, romantic, magic, sports, chill…"; return; }
  addW([...hits], 2); save(); renderTaste();
  msg.textContent = "Got it! I learned you like: " + [...hits].map(i => NAME[i]).join(", ") + ".";
  inp.value = "";
});

document.getElementById("genBtn").addEventListener("click", async () => {
  const top = Object.entries(profile.w).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([id]) => +id);
  if (!top.length) { msg.textContent = "Tell me what you like first — pick genres, like anime, or type a mood."; return; }
  const out = document.getElementById("playlists");
  out.innerHTML = ""; msg.textContent = "✦ AI is building your playlists…";

  const combos = [[top[0], top[1]], [top[1], top[2]], [top[0]]].map(c => c.filter(Boolean)).filter(c => c.length);
  const seen = new Set(profile.liked);
  let n = 0;
  for (const ids of combos) {
    const data = (await api(`/anime?genres=${ids.join(",")}&order_by=score&sort=desc&min_score=7.3&sfw=true&limit=20`))
      .filter(a => !seen.has(a.mal_id)).slice(0, 10);
    data.forEach(a => seen.add(a.mal_id));
    if (!data.length) continue;
    const names = ids.map(i => NAME[i]);
    const div = document.createElement("div");
    div.className = "playlist reveal";
    div.innerHTML = `<h3>${names.join(" × ")} <span>Mix #${++n}</span></h3>
      <small>Picked for you based on your ${names.join(" + ")} taste</small>
      <div class="p-row">${data.map(card).join("")}</div>`;
    out.appendChild(div);
    observe(div);
    await sleep(450); // respect Jikan rate limit
  }
  msg.textContent = n ? "Done! Like more anime to make the next playlists even better." : "Nothing found, try again in a moment.";
  if (n) lenis.scrollTo(out, { offset: -80, duration: 1.4 });
});

/* =========================================
   INIT
========================================= */
renderTaste();
observe();
showTrending();
