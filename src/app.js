"use strict";
(() => {
/* ---------- Données (bloc JSON inerte, jamais exécuté) ---------- */
const RAW = JSON.parse(document.getElementById("data").textContent);
const METALS = Object.freeze(RAW.metals.map(Object.freeze));
const DATA = Object.freeze(RAW.recipes.map(Object.freeze));
const KEYS = new Set(DATA.map(r => r.key));
const BYKEY = new Map(DATA.map((r, i) => [r.key, i]));

/* ---------- Mini-helpers DOM : aucun innerHTML ---------- */
const $ = id => document.getElementById(id);
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = String(text);
  return e;
}
const clear = e => { while (e.firstChild) e.removeChild(e.firstChild); };

/* ---------- Enclume ---------- */
const ACTS = [
  { n: "Light Hit", d: -3, c: 1, col: 0, row: 0 },
  { n: "Medium Hit", d: -6, c: 1, col: 1, row: 0 },
  { n: "Hard Hit", d: -9, c: 1, col: 0, row: 1 },
  { n: "Draw", d: -15, c: 2, col: 1, row: 1 },
  { n: "Punch", d: 2, c: 3, col: 2, row: 0 },
  { n: "Bend", d: 7, c: 4, col: 3, row: 0 },
  { n: "Upset", d: 13, c: 5, col: 2, row: 1 },
  { n: "Shrink", d: 16, c: 6, col: 3, row: 1 }
];
const CLS = { hit: 1, draw: 2, punch: 3, bend: 4, upset: 5, shrink: 6 };
const ORDERS = ["not_last", "second_last", "third_last", "last", "any"];
const LIMIT = 150, TMIN = 40, TMAX = 113;

function parseRule(r) {
  for (const o of ORDERS) if (r.endsWith("_" + o)) return { t: CLS[r.slice(0, -o.length - 1)], o };
  return null;
}
function okRules(rules, l, s, t) {
  for (const { t: ty, o } of rules) {
    let m;
    if (o === "any") m = l === ty || s === ty || t === ty;
    else if (o === "last") m = l === ty;
    else if (o === "not_last") m = s === ty || t === ty;
    else if (o === "second_last") m = s === ty;
    else m = t === ty;
    if (!m) return false;
  }
  return true;
}
/* Parcours en largeur sur (position, 3 derniers coups) : donne la suite la plus courte. */
function solve(ruleStrs, target, work, h) {
  const rules = ruleStrs.map(parseRule);
  const enc = (w, a, b, c) => ((w * 7 + a) * 7 + b) * 7 + c;
  const N = (LIMIT + 1) * 343;
  const par = new Int32Array(N).fill(-2), act = new Int8Array(N);
  if (work === target && h[0] && okRules(rules, h[0], h[1], h[2])) return [];
  const start = enc(work, h[0], h[1], h[2]);
  par[start] = -1;
  const q = [start];
  for (let qi = 0; qi < q.length; qi++) {
    const s = q[qi];
    const b = ((s / 7) | 0) % 7, a = ((s / 49) | 0) % 7, w = (s / 343) | 0;
    for (let i = 0; i < 8; i++) {
      const nw = w + ACTS[i].d;
      if (nw < 0 || nw > LIMIT) continue;
      const ns = enc(nw, ACTS[i].c, a, b);
      if (par[ns] !== -2) continue;
      par[ns] = s; act[ns] = i;
      if (nw === target && okRules(rules, ACTS[i].c, a, b)) {
        const path = []; let cur = ns;
        while (par[cur] !== -1) { path.push(act[cur]); cur = par[cur]; }
        return path.reverse();
      }
      q.push(ns);
    }
  }
  return null;
}
const RNAME = { hit: "Hit", draw: "Draw", punch: "Punch", bend: "Bend", upset: "Upset", shrink: "Shrink" };
const ONAME = { any: "n'importe où", last: "dernier", not_last: "pas dernier", second_last: "avant-dernier", third_last: "3e avant la fin" };
function fmtRule(r) {
  for (const o of ORDERS) if (r.endsWith("_" + o)) return RNAME[r.slice(0, -o.length - 1)] + " · " + ONAME[o];
  return r;
}

/* ---------- MD5 (octets UTF-8) ---------- */
const MD5K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0);
const MD5S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
function md5(str) {
  const bytes = new TextEncoder().encode(str), n = bytes.length;
  const len = ((n + 8) >> 6) + 1, w = new Int32Array(len * 16);
  for (let i = 0; i < n; i++) w[i >> 2] |= bytes[i] << ((i % 4) * 8);
  w[n >> 2] |= 0x80 << ((n % 4) * 8);
  w[len * 16 - 2] = n * 8;
  let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
  const rl = (x, c) => (x << c) | (x >>> (32 - c));
  for (let o = 0; o < w.length; o += 16) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      const t = D; D = C; C = B;
      B = (B + rl((A + F + MD5K[i] + w[o + g]) | 0, MD5S[(i >> 4) * 4 + (i % 4)])) | 0;
      A = t;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  const out = new Uint8Array(16);
  [a0, b0, c0, d0].forEach((v, i) => { for (let j = 0; j < 4; j++) out[i * 4 + j] = (v >>> (j * 8)) & 255; });
  return out;
}

/* ---------- Xoroshiro128++ comme Minecraft ----------
   cible = 40 + RandomSource.create(graine).forkPositional().fromHashOf(idObjet).nextInt(74) */
const GOLD = 0x9E3779B97F4A7C15n, SILV = 0x6A09E667F3BCC909n;
const u64 = x => BigInt.asUintN(64, x);
const rotl = (x, k) => u64((x << BigInt(k)) | (x >> BigInt(64 - k)));
function mix13(z) {
  z = u64(z);
  z = u64((z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n);
  z = u64((z ^ (z >> 27n)) * 0x94D049BB133111EBn);
  return z ^ (z >> 31n);
}
class Xoro {
  constructor(lo, hi) {
    lo = u64(lo); hi = u64(hi);
    if (lo === 0n && hi === 0n) { lo = GOLD; hi = SILV; }
    this.lo = lo; this.hi = hi;
  }
  nextLong() {
    const s0 = this.lo; let s1 = this.hi;
    const r = u64(rotl(u64(s0 + s1), 17) + s0);
    s1 ^= s0;
    this.lo = u64(rotl(s0, 49) ^ s1 ^ u64(s1 << 21n));
    this.hi = rotl(s1, 28);
    return r;
  }
  nextInt(bound) {
    const B = BigInt(bound);
    let l = BigInt.asUintN(32, this.nextLong()), m = l * B, n = m & 0xFFFFFFFFn;
    if (n < B) {
      const t = (0x100000000n - B) % B;
      while (n < t) { l = BigInt.asUintN(32, this.nextLong()); m = l * B; n = m & 0xFFFFFFFFn; }
    }
    return Number(m >> 32n);
  }
}
const SEED_NUM = /^[+-]?\d{1,20}$/;
function parseSeed(txt) {
  txt = String(txt).trim();
  if (!txt) return null;
  if (SEED_NUM.test(txt)) return BigInt.asIntN(64, BigInt(txt));
  let h = 0;                                  // String.hashCode() de Java
  for (let i = 0; i < txt.length; i++) h = (Math.imul(31, h) + txt.charCodeAt(i)) | 0;
  return BigInt(h);
}
let factory = null;
const tcache = new Map();
function setSeed(seed) {
  tcache.clear();
  if (seed === null) { factory = null; return; }
  const lo = u64(seed) ^ SILV, hi = u64(lo + GOLD);
  const r = new Xoro(mix13(lo), mix13(hi));
  factory = [r.nextLong(), r.nextLong()];
}
function targetFor(id) {
  if (!factory || !id) return null;
  if (tcache.has(id)) return tcache.get(id);
  const h = md5(id);
  let lo = 0n, hi = 0n;
  for (let i = 0; i < 8; i++) { lo = (lo << 8n) | BigInt(h[i]); hi = (hi << 8n) | BigInt(h[8 + i]); }
  const t = TMIN + new Xoro(lo ^ factory[0], hi ^ factory[1]).nextInt(74);
  tcache.set(id, t);
  return t;
}

/* ---------- Stockage local validé ---------- */
const STORE = "gregnautics-anvil-helper:v1";
const ID_RE = /^[a-z0-9_.-]{1,40}:[a-z0-9_./-]{1,80}$/;
const isTarget = v => Number.isInteger(v) && v >= TMIN && v <= TMAX;
const isSeedText = v => typeof v === "string" && v.length <= 40 && !/[\u0000-\u001f]/.test(v);
function sanitize(o) {
  const out = { seed: "", targets: {}, ids: {}, metal: "copper", item: "" };
  if (!o || typeof o !== "object" || Array.isArray(o)) return out;
  if (isSeedText(o.seed)) out.seed = o.seed;
  if (o.targets && typeof o.targets === "object")
    for (const [k, v] of Object.entries(o.targets)) if (KEYS.has(k) && isTarget(v)) out.targets[k] = v;
  if (o.ids && typeof o.ids === "object")
    for (const [k, v] of Object.entries(o.ids)) if (KEYS.has(k) && typeof v === "string" && ID_RE.test(v)) out.ids[k] = v;
  if (typeof o.metal === "string" && METALS.some(m => m.key === o.metal)) out.metal = o.metal;
  if (typeof o.item === "string" && KEYS.has(o.item)) out.item = o.item;
  return out;
}
let state = sanitize(null);
function load() {
  try { state = sanitize(JSON.parse(localStorage.getItem(STORE) || "null")); } catch (e) { state = sanitize(null); }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* stockage indisponible : on garde en mémoire */ }
}

/* ---------- Sélection courante ---------- */
let cur = { steps: [], idx: 0, start: 0 };
const entry = () => DATA[+$("item").value] || DATA[0];
const idOf = r => state.ids[r.key] || r.ids[0];
const calcOf = r => targetFor(idOf(r));
const metalName = k => (METALS.find(m => m.key === k) || { name: k }).name;
const itemLabel = r => r.label + (r.count > 1 && !/×/.test(r.label) ? " ×" + r.count : "");

function buildMetals() {
  const sel = $("metal"); clear(sel);
  [["Métaux", "pur"], ["Alliages et aciers", "all"], ["Sans métal précis", "misc"]].forEach(([lab, kind]) => {
    const og = document.createElement("optgroup"); og.label = lab;
    METALS.filter(m => m.kind === kind).forEach(m => {
      const n = DATA.filter(r => r.metal === m.key).length;
      if (!n) return;
      const o = el("option", "", m.name + " (" + n + ")"); o.value = m.key; og.appendChild(o);
    });
    if (og.children.length) sel.appendChild(og);
  });
  ["h1", "h2", "h3"].forEach(id => {
    const s = $(id); clear(s);
    ["Aucun", "Hit", "Draw", "Punch", "Bend", "Upset", "Shrink"].forEach((n, i) => { const o = el("option", "", n); o.value = i; s.appendChild(o); });
  });
}
function buildItems(keepKey) {
  const m = $("metal").value, sel = $("item"); clear(sel);
  let g = null, og = null, pick = null;
  DATA.forEach((r, i) => {
    if (r.metal !== m) return;
    if (r.group !== g) { og = document.createElement("optgroup"); og.label = r.group; sel.appendChild(og); g = r.group; }
    const o = el("option", "", itemLabel(r)); o.value = i; og.appendChild(o);
    if (pick === null || r.key === keepKey) pick = i;
  });
  if (pick !== null) sel.value = pick;
}
function buildGrid() {
  const g = $("grid"); clear(g);
  const cells = []; ACTS.forEach((a, i) => { cells[a.row * 4 + a.col] = i; });
  cells.forEach(i => {
    const a = ACTS[i], d = el("div", "key " + (a.d > 0 ? "pos" : "neg"), a.n);
    d.dataset.i = i;
    d.appendChild(el("b", "", (a.d > 0 ? "+" : "−") + Math.abs(a.d)));
    g.appendChild(d);
  });
}
function buildRows() {
  const ul = $("rows"); clear(ul);
  const m = $("metal").value;
  $("tabtitle").textContent = "Recettes : " + metalName(m);
  let g = null;
  DATA.forEach((r, i) => {
    if (r.metal !== m) return;
    if (r.group !== g) { g = r.group; ul.appendChild(el("li", "grp", g)); }
    const li = el("li"), b = el("button", "row-btn"); b.type = "button"; b.dataset.i = i;
    const nm = el("span", "nm", itemLabel(r)); nm.appendChild(el("span", "src" + (r.src === "Pack" ? " pack" : ""), r.src));
    b.append(nm,
      el("span", "in", r.input + (r.count > 1 ? " → ×" + r.count : "") + (r.tier ? " · tier " + r.tier : "")),
      el("span", "ru", r.rules.map(fmtRule).join(" · ")),
      el("span", "mm", r.min + "–" + r.max),
      el("span", "tg", "–"));
    b.addEventListener("click", () => { $("item").value = i; onItemChange(); $("app").scrollIntoView({ behavior: "smooth", block: "start" }); });
    li.appendChild(b); ul.appendChild(li);
  });
  refreshRows();
}
function refreshRows() {
  const sel = +$("item").value;
  document.querySelectorAll("#rows .row-btn").forEach(b => {
    const r = DATA[+b.dataset.i], tg = b.querySelector(".tg"), saved = state.targets[r.key], c = calcOf(r);
    b.classList.toggle("sel", +b.dataset.i === sel);
    tg.className = "tg";
    if (saved !== undefined) { tg.textContent = saved; if (c !== null && c !== saved) tg.classList.add("warn"); }
    else if (c !== null) { tg.textContent = c + (r.sure ? "" : "?"); tg.classList.add("calc"); }
    else tg.textContent = "–";
  });
}
function buildOid() {
  const r = entry(), sel = $("oid"); clear(sel);
  r.ids.forEach((x, i) => {
    const o = el("option", "", x + (r.sure ? "" : i === 0 ? " (probable)" : " (autre possibilité)")); o.value = x; sel.appendChild(o);
  });
  const o = el("option", "", "Autre identifiant…"); o.value = "__custom"; sel.appendChild(o);
  const c = state.ids[r.key];
  if (c && !r.ids.includes(c)) { sel.value = "__custom"; $("oidcustom").hidden = false; $("oidcustom").value = c; }
  else { sel.value = c || r.ids[0]; $("oidcustom").hidden = true; $("oidcustom").value = ""; }
}
function applyTarget() {
  const r = entry(), v = state.targets[r.key], c = calcOf(r);
  if (v !== undefined) $("target").value = v;
  else if (c !== null) $("target").value = c;
  else $("target").value = "";
}
function refreshStatus() {
  const r = entry(), v = state.targets[r.key], c = calcOf(r), box = $("status");
  let msg, cls = "";
  if (v !== undefined) {
    msg = "Cible saisie par toi : " + v + ".";
    cls = "ok";
    if (c !== null && c !== v) {
      cls = "warn";
      const alt = r.ids.find(x => targetFor(x) === v);
      msg += " Le calcul donne " + c + " pour « " + idOf(r) + " ». " +
        (alt ? "L'identifiant « " + alt + " » correspond à ta valeur : choisis-le dans les options avancées." : "Vérifie la graine ou l'identifiant.");
    } else if (c !== null) msg += " Elle confirme le calcul.";
  } else if (c !== null) {
    msg = "Cible calculée depuis la graine" + (r.sure ? "" : " (identifiant probable)") + ". Si le jeu affiche autre chose, saisis la vraie valeur.";
  } else {
    msg = "Entre la graine du monde, ou saisis la cible lue dans le jeu.";
  }
  box.className = "status" + (cls ? " " + cls : "");
  $("statustext").textContent = msg;
  $("forget").hidden = v === undefined || c === null;
}
function refreshMeta() {
  const r = entry(), m = $("meta"); clear(m);
  if (r.tier) m.appendChild(el("span", "chip tier", "Enclume tier " + r.tier + "+"));
  m.appendChild(el("span", "chip", r.input + (r.count > 1 ? " → ×" + r.count : "")));
  r.rules.forEach(x => m.appendChild(el("span", "chip", fmtRule(x))));
  m.appendChild(el("span", "src" + (r.src === "Pack" ? " pack" : ""), r.src));
  $("itemtitle").textContent = itemLabel(r) + " · " + metalName(r.metal);
}
const intIn = (id, lo, hi) => { const v = Number($(id).value); return Number.isInteger(v) && v >= lo && v <= hi ? v : null; };

function render() {
  const r = entry();
  refreshMeta(); refreshStatus(); refreshRows();
  const target = intIn("target", TMIN, TMAX), work = intIn("cur", 0, LIMIT);
  const h = ["h1", "h2", "h3"].map(id => +$(id).value || 0);
  const msg = $("msg"), steps = $("steps"); clear(steps); msg.hidden = true; $("count").textContent = "";
  cur = { steps: [], idx: 0, start: work ?? 0 };
  if (target === null || work === null) {
    msg.textContent = target === null && $("target").value === "" ? "Indique la cible : entre la graine ou saisis la valeur lue dans le jeu."
      : "La cible doit être entre 40 et 113, et la position entre 0 et 150.";
    msg.hidden = false; paint(); return;
  }
  const p = solve(r.rules, target, work, h);
  if (p === null) { msg.textContent = "Aucune suite de coups ne termine cet objet depuis cette position."; msg.hidden = false; paint(); return; }
  let w = work;
  cur.steps = p.map(i => { w += ACTS[i].d; return { i, at: w }; });
  const c = $("count");
  if (p.length === 0) c.textContent = "Déjà terminé";
  else { c.textContent = p.length; c.appendChild(el("small", "", p.length > 1 ? "coups" : "coup")); }
  paint();
}
function paint() {
  const steps = $("steps"); clear(steps);
  cur.steps.forEach((s, k) => {
    const a = ACTS[s.i], li = el("li"), b = el("button", "step " + (a.d > 0 ? "pos" : "neg") + (k < cur.idx ? " done" : "") + (k === cur.idx ? " next" : ""));
    b.type = "button";
    b.append(el("span", "n", (k + 1) + "."), el("span", "nm", a.n), el("span", "d", (a.d > 0 ? "+" : "−") + Math.abs(a.d)), el("span", "at", "→ " + s.at));
    b.setAttribute("aria-pressed", k < cur.idx ? "true" : "false");
    b.addEventListener("click", () => { cur.idx = cur.idx === k + 1 ? k : k + 1; paint(); });
    li.appendChild(b); steps.appendChild(li);
  });
  document.querySelectorAll("#grid .key").forEach(e => e.classList.remove("on"));
  const nx = cur.steps[cur.idx];
  if (nx) document.querySelector('#grid .key[data-i="' + nx.i + '"]').classList.add("on");
  const pos = cur.idx === 0 ? cur.start : cur.steps[cur.idx - 1].at;
  const t = intIn("target", TMIN, TMAX);
  $("mt").hidden = t === null;
  if (t !== null) { $("mt").style.left = (t / LIMIT * 100) + "%"; $("mtl").textContent = t; }
  $("mc").style.left = (pos / LIMIT * 100) + "%"; $("mcl").textContent = pos;
  $("next").disabled = !nx;
  const bar = $("nextbar");
  if (nx) {
    const a = ACTS[nx.i], p = $("nexttext"); clear(p);
    p.append("Coup " + (cur.idx + 1) + "/" + cur.steps.length + " : ", el("span", a.d > 0 ? "pos" : "neg", a.n + " " + (a.d > 0 ? "+" : "−") + Math.abs(a.d)), " → " + nx.at);
    bar.hidden = false;
  } else bar.hidden = true;
  $("bar").setAttribute("aria-label", "Flèche verte " + pos + (t !== null ? ", flèche rouge " + t : ""));
}

/* ---------- Événements ---------- */
function onItemChange() { state.item = entry().key; save(); buildOid(); applyTarget(); resetHits(); render(); }
function onMetalChange() { state.metal = $("metal").value; buildItems(); buildRows(); onItemChange(); }
function resetHits() { $("cur").value = 0; ["h1", "h2", "h3"].forEach(i => { $(i).value = 0; }); }
function onSeedInput() {
  const txt = $("seed").value.slice(0, 40);
  const info = $("seedinfo");
  let seed = null;
  try { seed = parseSeed(txt); } catch (e) { seed = null; }
  setSeed(seed);
  state.seed = isSeedText(txt) ? txt : ""; save();
  info.className = "hint" + (seed === null ? "" : " ok");
  info.textContent = seed === null ? "Sans graine, saisis les cibles à la main."
    : SEED_NUM.test(txt.trim()) ? "Graine active : les cibles se calculent automatiquement."
    : "Texte converti en graine comme le fait Minecraft (" + seed + ").";
  applyTarget(); render();
}
function onTargetInput() {
  const r = entry(), t = intIn("target", TMIN, TMAX);
  if (t !== null) {
    if (t === calcOf(r)) delete state.targets[r.key]; else state.targets[r.key] = t;
    save();
  }
  render();
}
function onOidChange() {
  const r = entry(), v = $("oid").value;
  if (v === "__custom") { $("oidcustom").hidden = false; $("oidcustom").focus(); return; }
  $("oidcustom").hidden = true;
  if (v === r.ids[0]) delete state.ids[r.key]; else state.ids[r.key] = v;
  save(); applyTarget(); render();
}
function onCustomOid() {
  const r = entry(), inp = $("oidcustom"), v = inp.value.trim().toLowerCase();
  const ok = ID_RE.test(v);
  inp.setAttribute("aria-invalid", ok || !v ? "false" : "true");
  if (!ok) return;
  state.ids[r.key] = v; save(); applyTarget(); render();
}
function search() {
  const q = $("search").value.trim().toLowerCase().slice(0, 40), ul = $("results"); clear(ul);
  if (q.length < 2) { ul.hidden = true; return; }
  const words = q.split(/\s+/);
  const hits = [];
  for (let i = 0; i < DATA.length && hits.length < 30; i++) {
    const r = DATA[i], hay = (r.label + " " + metalName(r.metal) + " " + r.metal.replace(/_/g, " ") + " " + r.ids.join(" ")).toLowerCase();
    if (words.every(w => hay.includes(w))) hits.push(i);
  }
  if (!hits.length) ul.appendChild(el("li", "hint", "Aucun résultat"));
  hits.forEach(i => {
    const r = DATA[i], li = el("li"), b = el("button"); b.type = "button";
    b.append(el("span", "", itemLabel(r)), el("small", "", metalName(r.metal)));
    b.addEventListener("click", () => {
      $("metal").value = r.metal; state.metal = r.metal;
      buildItems(r.key); buildRows(); onItemChange();
      $("search").value = ""; ul.hidden = true;
    });
    li.appendChild(b); ul.appendChild(li);
  });
  ul.hidden = false;
}
function exportData() {
  const blob = new Blob([JSON.stringify({ app: "gregnautics-anvil-helper", version: 1, seed: state.seed, targets: state.targets, ids: state.ids }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "enclume-gregnautics.json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importData(ev) {
  const f = ev.target.files && ev.target.files[0];
  ev.target.value = "";
  if (!f) return;
  if (f.size > 200000) { alertStatus("Fichier trop gros pour être un export de cette page."); return; }
  f.text().then(txt => {
    let o; try { o = JSON.parse(txt); } catch (e) { alertStatus("Fichier illisible : ce n'est pas du JSON."); return; }
    const clean = sanitize(o);
    const n = Object.keys(clean.targets).length;
    state.targets = Object.assign({}, state.targets, clean.targets);
    state.ids = Object.assign({}, state.ids, clean.ids);
    if (clean.seed) { state.seed = clean.seed; $("seed").value = clean.seed; }
    save(); onSeedInput();
    alertStatus(n + " cible" + (n > 1 ? "s" : "") + " importée" + (n > 1 ? "s" : "") + ".");
  });
}
function alertStatus(t) { $("statustext").textContent = t; $("status").className = "status"; }

/* ---------- Démarrage ---------- */
load();
buildMetals(); buildGrid();
$("metal").value = state.metal;
buildItems(state.item || "tfc:anvil/metal/pickaxe_head/copper");
buildRows();
$("seed").value = state.seed;
$("seed").addEventListener("input", onSeedInput);
$("metal").addEventListener("change", onMetalChange);
$("item").addEventListener("change", onItemChange);
$("oid").addEventListener("change", onOidChange);
$("oidcustom").addEventListener("input", onCustomOid);
$("target").addEventListener("input", onTargetInput);
["cur", "h1", "h2", "h3"].forEach(id => $(id).addEventListener("input", render));
$("search").addEventListener("input", search);
$("forget").addEventListener("click", () => { delete state.targets[entry().key]; save(); applyTarget(); render(); });
const advance = () => { if (cur.idx < cur.steps.length) { cur.idx++; paint(); } };
$("next").addEventListener("click", advance);
$("next2").addEventListener("click", advance);
$("reset").addEventListener("click", () => { resetHits(); render(); });
$("export").addEventListener("click", exportData);
$("import").addEventListener("change", importData);
buildOid();
onSeedInput();
})();
