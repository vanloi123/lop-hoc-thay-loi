/* Lớp Học Thầy Lợi — sân chơi ôn tập điều khiển bằng cử chỉ tay qua webcam. */
import { SAMPLE_SETS } from "./data/sample-sets.js";
import { XL } from "./lib/xlsx.js";

/* ---------------- bộ đề mẫu ---------------- */

/* ---------------- đọc bộ đề ---------------- */
/* hỗ trợ dán thẳng từ Excel / Google Sheets: các cột (tab) được hiểu như dấu | */
const lines = t => (t || "").split(/\r?\n/).map((s, i) => ({ tab: s.includes("\t"), s: s.split("\t").map(x => x.trim()).filter(Boolean).join(" | ").trim(), n: i + 1 })).filter(o => o.s && !o.s.startsWith("//"));
function parseQuiz(t) {
  const items = [], errors = [];
  for (const { s, n, tab } of lines(t)) {
    const p = s.split("|").map(x => x.trim()).filter(Boolean);
    if (p.length < 3) { errors.push({ n, msg: "cần câu hỏi và ít nhất 2 đáp án, ngăn cách bằng |" }); continue; }
    let ans = -1;
    const opts = p.slice(1, 5).map((o, k) => { if (o.startsWith("*")) { if (ans < 0) ans = k; return o.slice(1).trim(); } return o; });
    if (ans < 0 && tab) ans = 0; // từ Excel: cột thứ 2 là đáp án đúng
    if (ans < 0) { errors.push({ n, msg: "chưa có dấu * trước đáp án đúng" }); continue; }
    items.push({ q: p[0], opts, ans });
  }
  return { items, errors };
}
function parseTF(t) {
  const items = [], errors = [], T = ["đ", "d", "đúng", "dung", "true", "t", "x"], F = ["s", "sai", "false", "f"];
  for (const { s, n } of lines(t)) {
    const i = s.lastIndexOf("|");
    const st = i < 0 ? "" : s.slice(0, i).trim(), v = i < 0 ? "" : s.slice(i + 1).trim().toLowerCase();
    if (!st || (!T.includes(v) && !F.includes(v))) { errors.push({ n, msg: "cuối dòng phải là | Đ hoặc | S" }); continue; }
    items.push({ s: st, v: T.includes(v) });
  }
  return { items, errors };
}
function parseMatch(t) {
  const items = [], errors = [];
  for (const { s, n } of lines(t)) {
    let i = s.indexOf("|"); if (i < 0) i = s.indexOf("="); // dấu | (cột Excel) ưu tiên, để vế trái được chứa dấu =
    const a = i < 0 ? "" : s.slice(0, i).trim(), b = i < 0 ? "" : s.slice(i + 1).trim();
    if (!a || !b) { errors.push({ n, msg: "dạng đúng: Vế trái = Vế phải" }); continue; }
    items.push({ a, b });
  }
  return { items, errors };
}
function parseSort(t) {
  const items = [], errors = [];
  for (const { s, n } of lines(t)) {
    let i = s.indexOf(":"); if (i < 0) i = s.indexOf("|");
    const name = i < 0 ? "" : s.slice(0, i).trim();
    const body = i < 0 ? "" : s.slice(i + 1);
    const list = (body.includes("|") ? body.split("|") : body.split(/[,;]/)).map(x => x.trim()).filter(Boolean); // có | thì chỉ tách theo | (giữ được 0,5)
    if (!name || !list.length) { errors.push({ n, msg: "dạng đúng: Tên nhóm: thẻ 1, thẻ 2" }); continue; }
    items.push({ name, items: list });
  }
  if (items.length === 1) errors.push({ n: 0, msg: "cần ít nhất 2 nhóm" });
  return { items, errors };
}
function parseOrder(t) {
  const items = [], errors = [];
  for (const { s, n } of lines(t)) {
    let i = s.indexOf(":"); if (i < 0 && !s.includes(">")) i = s.indexOf("|");
    const title = i < 0 ? "Sắp xếp theo đúng thứ tự" : s.slice(0, i).trim();
    const rest = i < 0 ? s : s.slice(i + 1);
    const seq = (rest.includes("|") ? rest.split("|") : rest.split(">")).map(x => x.trim()).filter(Boolean);
    if (seq.length < 3 || seq.length > 7) { errors.push({ n, msg: "cần 3–7 mục, ngăn cách bằng dấu >" }); continue; }
    items.push({ title, seq });
  }
  return { items, errors };
}
function parseWords(t) {
  const items = [], errors = [];
  for (const { s, n } of lines(t)) {
    const i = s.indexOf("|");
    const w = (i < 0 ? s : s.slice(0, i)).trim().toUpperCase(), hint = i < 0 ? "" : s.slice(i + 1).trim();
    const nl = [...w].filter(c => /[A-Z]/.test(baseChar(c))).length;
    if (!nl) { errors.push({ n, msg: "từ cần có chữ cái" }); continue; }
    if (nl > 20) { errors.push({ n, msg: "từ quá dài (tối đa 20 chữ cái)" }); continue; }
    items.push({ w, hint: hint || "Không có gợi ý" });
  }
  return { items, errors };
}
const SECS = [
  { k: "quiz", t: "Trắc nghiệm", p: parseQuiz, unit: "câu", fmt: "Câu hỏi | *Đáp án đúng | Sai | Sai | Sai" },
  { k: "tf", t: "Đúng / Sai", p: parseTF, unit: "phát biểu", fmt: "Phát biểu | Đ   (hoặc | S)" },
  { k: "match", t: "Cặp ghép", p: parseMatch, unit: "cặp", fmt: "Vế trái = Vế phải" },
  { k: "sort", t: "Phân nhóm", p: parseSort, unit: "nhóm", fmt: "Tên nhóm: thẻ 1, thẻ 2, thẻ 3" },
  { k: "order", t: "Thứ tự", p: parseOrder, unit: "dãy", fmt: "Tiêu đề: Mục 1 > Mục 2 > Mục 3" },
  { k: "words", t: "Từ khóa", p: parseWords, unit: "từ", fmt: "TỪ KHÓA | Gợi ý" }
];
const parseSet = set => Object.fromEntries(SECS.map(x => [x.k, x.p(set[x.k]).items]));


/* ---------------- quản lý bộ đề: thông tin & tiện ích ---------------- */
const SUBJECTS = ["Toán", "Tiếng Việt", "Ngữ văn", "Tiếng Anh", "Khoa học", "Khoa học tự nhiên", "Tự nhiên và Xã hội", "Lịch sử và Địa lý", "Lịch sử", "Địa lý", "Tin học", "Công nghệ", "Vật lý", "Hóa học", "Sinh học", "Giáo dục công dân", "Đạo đức", "Âm nhạc", "Mĩ thuật", "Hoạt động trải nghiệm"];
const GRADES = ["Mầm non", ...Array.from({ length: 12 }, (_, i) => "Lớp " + (i + 1))];
/* chuyển bộ đề kiểu cũ ("Toán · Lớp 5" trong một ô) sang dạng có môn, lớp, ngày dạy, chủ đề, nhãn… */
function migrateSet(s) {
  if (s._v === 2) return s;
  if (!("grade" in s)) { const parts = String(s.subject || "").split("·").map(x => x.trim()).filter(Boolean); s.subject = parts[0] || ""; s.grade = parts.slice(1).join(" · "); }
  s.date = s.date || ""; s.topic = s.topic || ""; s.tags = Array.isArray(s.tags) ? s.tags : String(s.tags || "").split(",").map(x => x.trim()).filter(Boolean);
  s.fav = !!s.fav; s.archived = !!s.archived; s.created = s.created || Date.now(); s.updated = s.updated || s.created; s.lastUsed = s.lastUsed || 0; s._v = 2;
  SECS.forEach(x => { if (typeof s[x.k] !== "string") s[x.k] = ""; });
  return s;
}
function newSet(fields = {}) {
  const s = { id: "set-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: "Bộ đề mới", subject: "", grade: "", date: "", topic: "", tags: [], fav: false, archived: false, created: Date.now(), updated: Date.now(), lastUsed: 0, _v: 2 };
  SECS.forEach(x => s[x.k] = ""); return Object.assign(s, fields);
}
const setMeta = s => [s.subject, s.grade, s.topic].filter(Boolean).join(" · ") || "Chưa phân loại";
const setTotal = s => { const d = parseSet(s); return SECS.reduce((a, x) => a + d[x.k].length, 0); };
const pad2 = n => String(n).padStart(2, "0");
const todayStr = (off = 0) => { const d = new Date(); d.setDate(d.getDate() + off); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
function fmtDate(iso, rel = true) {
  if (!iso) return "";
  if (rel) { if (iso === todayStr()) return "Hôm nay"; if (iso === todayStr(1)) return "Ngày mai"; if (iso === todayStr(-1)) return "Hôm qua"; }
  const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`;
}
/* đọc ngày từ ô Excel: 15/10/2026, 2026-10-15, hoặc số ngày kiểu Excel */
function parseDateCell(v) {
  v = String(v || "").trim(); if (!v) return "";
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
  m = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/); if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${pad2(m[2])}-${pad2(m[1])}`; }
  if (/^\d{5}(,\d+)?$/.test(v)) { const d = new Date(Date.UTC(1899, 11, 30) + parseInt(v) * 864e5); return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`; }
  return "";
}
function subjectColor(name) {
  if (!name) return "var(--faint)";
  let hsh = 0; for (const ch of name) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
  return ["var(--amber)", "var(--violet)", "var(--rose)", "var(--lime)", "var(--fuchsia)", "var(--teal)", "var(--emerald)"][hsh % 7];
}

/* ---------------- helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickN = (a, n) => shuffle(a).slice(0, n);
const COLORS = ["var(--amber)", "var(--violet)", "var(--rose)", "var(--lime)", "var(--teal)", "var(--fuchsia)"];
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v; else if (k === "style") el.style.cssText = v; else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) { if (c == null || c === false) continue; el.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return el;
}
/* on(): chạy khi chọn bằng tay (gselect) hoặc bằng chuột / bàn phím (click) */
function on(el, fn) { el.addEventListener("gselect", fn); el.addEventListener("click", fn); return el; }
const fmtTime = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const baseChar = ch => ch.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toUpperCase();
const vi = n => n.toLocaleString("vi-VN");
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} window.__cloudTouch?.(k); }
};
let toastT;
function toast(msg, ms = 3000) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms); }
function reshake(el) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }

const I = { // biểu tượng trò chơi (nét vẽ 48×48)
  quiz: '<svg viewBox="0 0 48 48"><rect x="6" y="6" width="15" height="15" rx="4"/><rect x="27" y="6" width="15" height="15" rx="4"/><rect x="6" y="27" width="15" height="15" rx="4"/><path d="M29 35l4 4 8-9"/></svg>',
  tf: '<svg viewBox="0 0 48 48"><path d="M5 25l6 6 11-15"/><path d="M29 17l13 13M42 17L29 30"/></svg>',
  tiles: '<svg viewBox="0 0 48 48"><rect x="5" y="7" width="16" height="14" rx="3"/><rect x="27" y="7" width="16" height="14" rx="3"/><rect x="5" y="27" width="16" height="14" rx="3"/><rect x="27" y="27" width="16" height="14" rx="3"/><path d="M33 31l2 3 3-1-1 3 2 2h-3l-1 3-1-3h-3l2-2z"/></svg>',
  match: '<svg viewBox="0 0 48 48"><circle cx="9" cy="12" r="4"/><circle cx="9" cy="36" r="4"/><circle cx="39" cy="12" r="4"/><circle cx="39" cy="36" r="4"/><path d="M13 12C26 12 22 36 35 36M13 36C26 36 22 12 35 12"/></svg>',
  memory: '<svg viewBox="0 0 48 48"><rect x="5" y="9" width="17" height="24" rx="3"/><path d="M26 12l14 3-4 22-14-3"/><path d="M11 21h5M13.5 18.5v5"/></svg>',
  sort: '<svg viewBox="0 0 48 48"><path d="M5 28h15l-2 14H7z"/><path d="M28 28h15l-2 14H30z"/><rect x="17" y="5" width="14" height="10" rx="3"/><path d="M24 15v8M20 20l4 4 4-4"/></svg>',
  order: '<svg viewBox="0 0 48 48"><rect x="4" y="8" width="11" height="11" rx="3"/><rect x="18.5" y="8" width="11" height="11" rx="3"/><rect x="33" y="8" width="11" height="11" rx="3"/><path d="M8 32h32M33 26l7 6-7 6"/></svg>',
  bubble: '<svg viewBox="0 0 48 48"><circle cx="16" cy="30" r="11"/><circle cx="34" cy="15" r="8"/><circle cx="37" cy="37" r="5"/><path d="M11 26a6 6 0 0 1 5-4"/></svg>',
  slice: '<svg viewBox="0 0 48 48"><circle cx="20" cy="28" r="13"/><path d="M6 42L42 6"/><path d="M20 15c1-4 4-6 7-6"/></svg>',
  catch: '<svg viewBox="0 0 48 48"><path d="M6 30h36l-4 12H10z"/><path d="M10 30c0-6 6-10 14-10s14 4 14 10"/><rect x="20" y="4" width="10" height="8" rx="2"/></svg>',
  word: '<svg viewBox="0 0 48 48"><path d="M5 40h9M19 40h9M33 40h9"/><path d="M6 33l3.5-17L13 33M7.5 27h4M23.5 16v17M34 16h8l-8 17h8"/></svg>',
  scramble: '<svg viewBox="0 0 48 48"><rect x="4" y="16" width="12" height="14" rx="3"/><rect x="18" y="10" width="12" height="14" rx="3" transform="rotate(10 24 17)"/><rect x="32" y="18" width="12" height="14" rx="3" transform="rotate(-8 38 25)"/><path d="M8 40h32"/></svg>',
  tug: '<svg viewBox="0 0 48 48"><path d="M4 26h40"/><circle cx="8" cy="14" r="4"/><circle cx="40" cy="14" r="4"/><path d="M8 18v8l-4 10M8 26l4 10M40 18v8l4 10M40 26l-4 10"/><rect x="21" y="21" width="6" height="10" rx="2"/></svg>',
  millionaire: '<svg viewBox="0 0 48 48"><path d="M12 7h24l8 11-20 24L4 18z"/><path d="M4 18h40M18 7l-3 11 9 24 9-24-3-11"/></svg>',
  wheel: '<svg viewBox="0 0 48 48"><circle cx="24" cy="27" r="17"/><path d="M24 10v34M7 27h34M12 15l24 24M36 15L12 39"/><path d="M19 3h10l-5 7z"/></svg>',
  race: '<svg viewBox="0 0 48 48"><path d="M9 29l4-10a4 4 0 0 1 3.7-2.5h14.6A4 4 0 0 1 35 19l4 10"/><rect x="5" y="29" width="38" height="9" rx="3"/><circle cx="14" cy="39" r="3.5"/><circle cx="34" cy="39" r="3.5"/><path d="M4 9h8M8 14h6M36 9h8"/></svg>',
  bingo: '<svg viewBox="0 0 48 48"><rect x="6" y="6" width="36" height="36" rx="5"/><path d="M18 6v36M30 6v36M6 18h36M6 30h36"/><circle cx="12" cy="12" r="2.6"/><circle cx="24" cy="24" r="2.6"/><circle cx="36" cy="36" r="2.6"/></svg>',
  mole: '<svg viewBox="0 0 48 48"><path d="M4 42h40"/><path d="M12 42c0-9 5-15 12-15s12 6 12 15"/><circle cx="20" cy="34" r="1.4"/><circle cx="28" cy="34" r="1.4"/><rect x="28" y="4" width="16" height="8" rx="2" transform="rotate(35 36 8)"/><path d="M33 13l-8 9"/></svg>',
  hoop: '<svg viewBox="0 0 48 48"><rect x="9" y="4" width="30" height="17" rx="2"/><path d="M15 21h18M17 21l3 11h8l3-11M21 21l2 11M27 21l-2 11"/><circle cx="37" cy="38" r="7"/><path d="M30 38h14M37 31v14"/></svg>',
  tower: '<svg viewBox="0 0 48 48"><rect x="13" y="35" width="22" height="8" rx="2"/><rect x="11" y="26" width="22" height="8" rx="2"/><rect x="15" y="17" width="22" height="8" rx="2"/><path d="M26 3v9M22 8l4 4 4-4"/></svg>',
  search: '<svg viewBox="0 0 48 48"><rect x="4" y="4" width="30" height="30" rx="4"/><path d="M10 11h18M10 19h10M10 27h6"/><circle cx="33" cy="33" r="8"/><path d="M39 39l6 6"/></svg>',
  buzz: '<svg viewBox="0 0 48 48"><path d="M12 33V23a12 12 0 0 1 24 0v10l4 5H8z"/><path d="M20 42a4 4 0 0 0 8 0"/><path d="M24 4v4M7 12l4 3M41 12l-4 3"/></svg>',
  bomb: '<svg viewBox="0 0 48 48"><circle cx="21" cy="29" r="14"/><path d="M31 19l4-4"/><path d="M35 15c2-5 5-5 8-9"/><path d="M41 3l1 2M45 8h-2"/><path d="M14 25a7 7 0 0 1 6-6"/></svg>'
};
const TFI = { yes: '<svg viewBox="0 0 48 48"><path d="M8 25l10 10L40 12"/></svg>', no: '<svg viewBox="0 0 48 48"><path d="M12 12l24 24M36 12L12 36"/></svg>' };
const HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg>';
const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';

/* ---------------- trạng thái ---------------- */
const DEF = { mode: "both", dwellMs: 1100, margin: 0.14, hands: 2, qCount: 10, qTime: 20, sound: true, showCam: false,
  handStyle: "auto", handSize: 1, handOpacity: 0.92, smooth: 1.4, bgCam: 0.12, pinchOn: 0.3,
  view: "ar", bgDim: 0.16, grab: true, theme: "dark", calibrated: false, tts: false, ttsOpts: true, ttsRate: 1, ttsVoice: "", ttsEngine: "auto" };
const S = Object.assign({}, DEF, store.get("lhvt2.settings", {}));
let SETS = store.get("lhvt2.sets", null) || store.get("lhvt.sets", null);
if (!Array.isArray(SETS) || !SETS.length) SETS = JSON.parse(JSON.stringify(SAMPLE_SETS));
SETS.forEach(s => { SECS.forEach(x => { if (typeof s[x.k] !== "string") s[x.k] = (SAMPLE_SETS.find(o => o.id === s.id) || {})[x.k] || ""; }); });
SETS.forEach(migrateSet);
let currentId = store.get("lhvt2.current", SETS[0].id);
if (!SETS.find(s => s.id === currentId)) currentId = SETS[0].id;
const saveS = () => store.set("lhvt2.settings", S);
const saveSets = () => { store.set("lhvt2.sets", SETS); store.set("lhvt2.current", currentId); };
/* lớp học: danh sách học sinh + bảng điểm buổi học */
const CLS = migrateCls(store.get("lhvt4.class", {}));
/* CLS.roster / CLS.scores luôn trỏ tới lớp đang chọn (giữ tương thích với mã cũ) */
Object.defineProperties(CLS, {
  roster: { get: () => curClass().roster, set: v => { curClass().roster = v; }, enumerable: false },
  scores: { get: () => curClass().scores, set: v => { curClass().scores = v; }, enumerable: false }
});
const saveCls = () => store.set("lhvt4.class", CLS);
function creditPlayer(name, score, game) {
  if (!name) return;
  const r = CLS.scores[name] || (CLS.scores[name] = { score: 0, plays: 0, best: {} });
  r.score += score; r.plays++; r.best[game] = Math.max(r.best[game] || 0, score); saveCls();
}
const curSet = () => SETS.find(s => s.id === currentId) || SETS[0];

/* ---------------- âm thanh ---------------- */
const Sfx = {
  ctx: null,
  unlock() { try { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === "suspended") this.ctx.resume(); } catch (e) {} },
  tone(f, d, type = "sine", vol = .13, when = 0, f2) {
    if (!S.sound || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .05);
  },
  noise(d = .18, vol = .12, hp = 1800) {
    if (!S.sound || !this.ctx) return;
    const c = this.ctx, b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), a = b.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "highpass"; f.frequency.value = hp; g.gain.value = vol; s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start();
  },
  tick() { this.tone(1200, .05, "triangle", .06); },
  touch() { this.tone(1800, .025, "sine", .025); },
  grab() { this.tone(300, .08, "triangle", .08, 0, 520); },
  drop() { this.tone(520, .09, "triangle", .07, 0, 280); },
  right() { this.tone(660, .12, "triangle"); this.tone(990, .22, "triangle", .13, .1); },
  wrong() { this.tone(220, .26, "sawtooth", .06, 0, 150); },
  pop() { this.tone(700, .07, "square", .05, 0, 300); },
  swish() { this.noise(.16, .1, 2500); },
  flip() { this.noise(.07, .06, 3500); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .25, "triangle", .12, i * .12)); }
};
addEventListener("pointerdown", () => Sfx.unlock(), { capture: true });
addEventListener("keydown", () => Sfx.unlock(), { capture: true });

/* ---------------- hiệu ứng pháo giấy ---------------- */
const FX = {
  cv: $("#fx"), ctx: null, parts: [],
  cols: ["#0066FF", "#38bdf8", "#fb7185", "#a3e635", "#a78bfa", "#2dd4bf", "#eef3fc"],
  burst(x, y, n = 26) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) n = Math.min(n, 8);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = rand(180, 500);
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, r: Math.random() * 6, vr: rand(-6, 6), s: rand(5, 12), c: this.cols[i % 7], life: 1.4 }); }
  },
  rain() { for (let i = 0; i < 150; i++) this.parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * .6, vx: rand(-40, 40), vy: rand(60, 180), r: Math.random() * 6, vr: rand(-5, 5), s: rand(6, 14), c: this.cols[i % 7], life: 4 }); },
  burstEl(el, n) { const r = el.getBoundingClientRect(); this.burst(r.left + r.width / 2, r.top + r.height / 2, n); },
  step(dt) {
    const c = this.ctx; if (!c) return;
    c.clearRect(0, 0, innerWidth, innerHeight);
    this.parts = this.parts.filter(p => (p.life -= dt) > 0 && p.y < innerHeight + 40);
    for (const p of this.parts) {
      p.vy += 700 * dt; p.vx *= .99; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.globalAlpha = Math.min(1, p.life * 2); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore();
    }
  }
};
const HL = { cv: $("#handLayer"), ctx: null };
function resizeCanvases() {
  const d = Math.min(devicePixelRatio || 1, 1.5);
  for (const o of [FX, HL]) { o.cv.width = innerWidth * d; o.cv.height = innerHeight * d; o.ctx = o.cv.getContext("2d"); o.ctx.setTransform(d, 0, 0, d, 0, 0); }
}
resizeCanvases(); addEventListener("resize", resizeCanvases);


/* ==========================================================
   BỘ NHẬN DIỆN & TƯƠNG TÁC TAY
   - MediaPipe Hand Landmarker: 21 khớp / bàn tay
   - MediaPipe Image Segmenter (selfie multiclass): tách vùng da để cắt bàn tay thật chính xác
   - Cử chỉ: trỏ (đầu ngón trỏ), chụm (cái + trỏ), nắm (cả bàn tay)
   - Chống bấm nhầm: lấy vị trí trước lúc chụm, neo theo lòng bàn tay khi đang giữ
   - Nút "hút" con trỏ, nút cần giữ (data-hold), kéo – thả có quán tính lò xo
   ========================================================== */
const VISION_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

class LowPass { constructor() { this.y = null; } f(x, a) { this.y = this.y == null ? x : a * x + (1 - a) * this.y; return this.y; } }
class OneEuro {
  constructor(beta = .012, dCut = 1, minCut = null) { this.beta = beta; this.dCut = dCut; this.minCut = minCut; this.x = new LowPass(); this.dx = new LowPass(); this.t = null; }
  a(cut, dt) { const tau = 1 / (2 * Math.PI * cut); return 1 / (1 + tau / dt); }
  f(v, t) {
    if (this.t == null) { this.t = t; return this.x.f(v, 1); }
    const dt = Math.max(.001, (t - this.t) / 1000); this.t = t;
    const d = (v - this.x.y) / dt, ed = this.dx.f(d, this.a(this.dCut, dt));
    return this.x.f(v, this.a((this.minCut ?? S.smooth) + this.beta * Math.abs(ed), dt));
  }
  snap(v) { this.x.y = v; this.dx.y = 0; }
}

const Input = { last: { x: -999, y: -999, t: 0 }, mouse: { id: "mouse", x: -999, y: -999, vx: 0, vy: 0, t: 0 } };
const Hands = new Map();
const frameHooks = new Set();
const DET = { n: 0, fps: 0, t0: performance.now(), hands: 0, slow: 0, light: 0, dist: 0 };
const PROBE = [[0, 0], [14, 0], [-14, 0], [0, 14], [0, -14], [11, 11], [-11, -11], [11, -11], [-11, 11]];

function usable(t) { return t && !t.disabled && !t.classList.contains("is-locked"); }
function hitAt(x, y) {
  for (const [dx, dy] of PROBE) {
    const el = document.elementFromPoint(x + dx, y + dy), t = el && el.closest("[data-hit],[data-drag]");
    if (usable(t)) return t;
  }
  return null;
}
function fire(el, type = "gselect") {
  el.classList.remove("g-press"); void el.offsetWidth; el.classList.add("g-press");
  Sfx.tick(); el.dispatchEvent(new CustomEvent(type));
}
function unpress(el) { if (el) { el.classList.remove("pressing"); el.style.removeProperty("--press"); } }

/* ---------- kéo – thả có quán tính ---------- */
const Drags = new Set();
function startDrag(el, x, y) {
  const r = el.getBoundingClientRect(), ph = h("div", { class: "drag-ph", style: `width:${r.width}px;height:${r.height}px` });
  el.after(ph); el.classList.add("dragging"); Sfx.grab();
  Object.assign(el.style, { position: "fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", zIndex: 80, margin: 0, transform: "scale(1.06)" });
  const d = { el, ph, ox: x - r.left, oy: y - r.top, sx: x, sy: y, moved: 0, over: null, cx: r.left, cy: r.top, tx: r.left, ty: r.top, vx: 0, vy: 0, rot: 0 };
  Drags.add(d); return d;
}
function moveDrag(d, x, y) {
  d.moved = Math.max(d.moved, Math.hypot(x - d.sx, y - d.sy));
  d.tx = x - d.ox; d.ty = y - d.oy;
  const z = document.elementFromPoint(x, y)?.closest("[data-drop]") || null;
  if (z !== d.over) { d.over?.classList.remove("drop-over"); z?.classList.add("drop-over"); d.over = z; if (z) Sfx.touch(); }
}
function stepDrags(dt) {
  const K = 560, C = 2 * Math.sqrt(K) * .6; dt = Math.min(dt, .033);
  for (const d of Drags) {
    d.vx += (K * (d.tx - d.cx) - C * d.vx) * dt; d.vy += (K * (d.ty - d.cy) - C * d.vy) * dt;
    d.cx += d.vx * dt; d.cy += d.vy * dt;
    d.rot += (clamp(d.vx * .014, -16, 16) - d.rot) * .18;
    const lift = 1.06 + Math.min(.04, Math.hypot(d.vx, d.vy) / 30000);
    d.el.style.left = d.cx + "px"; d.el.style.top = d.cy + "px"; d.el.style.transform = `rotate(${d.rot}deg) scale(${lift})`;
  }
}
function endDrag(d, x, y, cancel) {
  Drags.delete(d); d.over?.classList.remove("drop-over");
  const zone = cancel ? null : document.elementFromPoint(x, y)?.closest("[data-drop]");
  const from = d.el.getBoundingClientRect(), rot = d.rot;
  d.el.classList.remove("dragging");
  ["position", "left", "top", "width", "zIndex", "margin", "transform"].forEach(k => d.el.style[k] = "");
  d.ph.remove();
  if (!cancel) { if (d.moved < 14) fire(d.el); else { Sfx.drop(); d.el.dispatchEvent(new CustomEvent("gdrop", { detail: { zone } })); } }
  if (d.el.isConnected && !d.el.hidden && d.el.animate) {
    const to = d.el.getBoundingClientRect(), dx = from.left - to.left, dy = from.top - to.top;
    if (Math.abs(dx) + Math.abs(dy) > 2) d.el.animate([{ transform: `translate(${dx}px,${dy}px) rotate(${rot}deg) scale(1.06)` }, { transform: "none" }], { duration: 480, easing: "cubic-bezier(.2,1.35,.35,1)" });
  }
}

/* ---------- chuột / cảm ứng (dùng chung hệ thống) ---------- */
let mouseDrag = null, mouseLink = null;
addEventListener("pointermove", e => {
  const now = performance.now(), m = Input.mouse, dt = Math.max(.008, (now - m.t) / 1000);
  if (now - m.t < 120) { m.vx = (e.clientX - m.x) / dt; m.vy = (e.clientY - m.y) / dt; } else { m.vx = m.vy = 0; }
  m.x = e.clientX; m.y = e.clientY; m.t = now; Input.last = { x: m.x, y: m.y, t: now };
  if (mouseDrag) moveDrag(mouseDrag, e.clientX, e.clientY);
});
addEventListener("pointerdown", e => {
  const t = e.target.closest?.("[data-drag]");
  if (usable(t)) { e.preventDefault(); mouseDrag = startDrag(t, e.clientX, e.clientY); return; }
  const lk = e.target.closest?.("[data-link]"); mouseLink = usable(lk) ? lk : null;
});
addEventListener("pointerup", e => {
  if (mouseDrag) { const d = mouseDrag; mouseDrag = null; endDrag(d, e.clientX, e.clientY); }
  if (mouseLink) {
    const t = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-link]");
    if (usable(t) && t !== mouseLink) { mouseLink.dispatchEvent(new CustomEvent("glinkstart")); t.dispatchEvent(new CustomEvent("glinkend")); }
    mouseLink = null;
  }
});
addEventListener("pointercancel", () => { if (mouseDrag) { endDrag(mouseDrag, 0, 0, true); mouseDrag = null; } mouseLink = null; });

function allPointers(now) {
  const list = [];
  for (const p of Hands.values()) list.push({ id: p.id, x: p.x, y: p.y, vx: p.vx, vy: p.vy });
  if (now - Input.mouse.t < 1500) list.push({ ...Input.mouse });
  return list;
}
function primaryPointer(now) { const f = Hands.values().next().value; if (f) return f; return now - Input.mouse.t < 3000 ? Input.mouse : null; }

/* ==========================================================
   CAMERA & MÔ HÌNH
   ========================================================== */
const video = $("#video"), camCv = $("#camCanvas"), camCtx = camCv.getContext("2d");
const Cam = { running: false, loading: false, step: "", lm: null, seg: null, segLoading: false, segPaused: false, stream: null,
  lastTime: -1, lastTs: 0, err: "", newFrame: false, segTick: 0, skinT: 0, vision: null, files: null };
const CONN = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const isAR = () => Cam.running && S.view === "ar";
const frameCv = document.createElement("canvas"), frameCtx = frameCv.getContext("2d", { willReadFrequently: false }); frameCv.width = frameCv.height = 2;
const lumCv = document.createElement("canvas"), lumCtx = lumCv.getContext("2d", { willReadFrequently: true }); lumCv.width = 32; lumCv.height = 18;

function camNote() {
  if (Cam.loading) return Cam.step || "Đang khởi động camera…";
  if (Cam.running) return isAR() ? "Camera đang bật. Nhìn tay mình trên màn hình, đưa đầu ngón trỏ vào nút như chạm màn hình cảm ứng." : "Camera đang bật. Bàn tay trên màn hình cử động theo tay bạn.";
  if (Cam.err) return Cam.err;
  return "Chưa bật camera. Vẫn chơi được bằng chuột hoặc màn hình cảm ứng.";
}
function setStep(t) { Cam.step = t; camUI(); }
async function startCamera() {
  if (Cam.running || Cam.loading) return;
  Sfx.unlock(); Cam.loading = true; Cam.err = ""; camUI();
  try {
    if (!window.isSecureContext && location.protocol !== "file:") throw Object.assign(new Error("insecure"), { name: "Insecure" });
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("nomedia"), { name: "NoMedia" });
    if (!Cam.lm) {
      setStep("Bước 1/2 · Đang tải bộ nhận diện bàn tay (lần đầu cần Internet)…");
      try { Cam.vision = await import(/* @vite-ignore */ VISION_URL); } catch (e) { throw Object.assign(new Error("lib"), { name: "LibError" }); }
      Cam.files = await Cam.vision.FilesetResolver.forVisionTasks(WASM_URL);
      const opts = d => ({ baseOptions: { modelAssetPath: HAND_MODEL, delegate: d }, runningMode: "VIDEO", numHands: S.hands,
        minHandDetectionConfidence: .6, minHandPresenceConfidence: .55, minTrackingConfidence: .55 });
      try { Cam.lm = await Cam.vision.HandLandmarker.createFromOptions(Cam.files, opts("GPU")); Cam.gpu = true; }
      catch (e) { Cam.lm = await Cam.vision.HandLandmarker.createFromOptions(Cam.files, opts("CPU")); Cam.gpu = false; }
    }
    setStep("Bước 2/2 · Đang mở camera. Hãy bấm Cho phép nếu trình duyệt hỏi.");
    Cam.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 }, facingMode: "user" }, audio: false });
    video.srcObject = Cam.stream; await video.play();
    camCv.width = video.videoWidth || 640; camCv.height = video.videoHeight || 480;
    Cam.running = true; Cam.lastTs = 0; DET.slow = 0; Cam.segPaused = false;
    scheduleFrame();
    toast("Camera đã bật. Giơ tay lên để điều khiển!");
  } catch (e) {
    const n = e && e.name;
    Cam.err = n === "NotAllowedError" ? "Trình duyệt đang chặn camera. Bấm biểu tượng camera trên thanh địa chỉ, chọn Cho phép rồi bật lại."
      : n === "NotFoundError" || n === "OverconstrainedError" ? "Không tìm thấy camera. Hãy kiểm tra webcam của laptop."
      : n === "NotReadableError" ? "Camera đang bị ứng dụng khác dùng (Zoom, Meet…). Tắt ứng dụng đó rồi thử lại."
      : n === "LibError" ? "Không tải được bộ nhận diện bàn tay. Hãy kết nối Internet rồi thử lại."
      : n === "NoMedia" ? "Trình duyệt này không cho dùng camera. Hãy mở trang bằng Chrome hoặc Edge."
      : n === "Insecure" ? "Trang cần mở qua https hoặc mở trực tiếp tệp trên máy để dùng camera."
      : "Không bật được camera (" + (e && e.message || n) + ").";
    toast(Cam.err, 6500); Cam.stream?.getTracks().forEach(t => t.stop()); Cam.stream = null;
  }
  Cam.loading = false; Cam.step = ""; camUI();
  if (Cam.running) onCameraReady();
}
function stopCamera() {
  Cam.stream?.getTracks().forEach(t => t.stop()); Cam.stream = null; Cam.running = false;
  for (const p of Hands.values()) dropHand(p); Hands.clear();
  camCtx.clearRect(0, 0, camCv.width, camCv.height); camUI();
}
const toggleCam = () => Cam.running ? stopCamera() : startCamera();

/* xử lý từng khung hình camera (đồng bộ theo khung hình thật, không theo màn hình) */
function scheduleFrame() {
  if (!Cam.running || !video.requestVideoFrameCallback) return;
  if (Cam.rv) video.cancelVideoFrameCallback(Cam.rv);
  Cam.rv = video.requestVideoFrameCallback(() => { Cam.rv = 0; processFrame(); scheduleFrame(); });
}
function processFrame() {
  if (!Cam.running || !Cam.lm || document.hidden) return;
  const vw = video.videoWidth, vh = video.videoHeight; if (!vw) return;
  const ts = Math.max(Cam.lastTs + 1, performance.now()); Cam.lastTs = ts;
  if (frameCv.width !== vw || frameCv.height !== vh) { frameCv.width = vw; frameCv.height = vh; }
  frameCtx.drawImage(video, 0, 0); Cam.newFrame = true;
  let res; try { res = Cam.lm.detectForVideo(video, ts); } catch (e) { return; }
  onHands(res, ts); drawSkeleton(res); DET.n++;
  if ((DET.n & 15) === 0) { lumCtx.drawImage(video, 0, 0, 32, 18); const d = lumCtx.getImageData(0, 0, 32, 18).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; DET.light = s / (d.length / 4); }
}
/* ---------- cử chỉ tay ---------- */
function camMap(vw, vh) { const W = innerWidth, H = innerHeight, sc = Math.max(W / vw, H / vh); return { sc, offX: (W - vw * sc) / 2, offY: (H - vh * sc) / 2 }; }
function newHand(id) {
  return { id, x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0, fx: new OneEuro(), fy: new OneEuro(),
    lf: Array.from({ length: 21 }, () => [new OneEuro(.03, 1, 2.6), new OneEuro(.03, 1, 2.6)]), cam: null, ptrCam: null, k: 0, close: 0, ringR: 16,
    pinch: false, grab: false, hold: false, prevHold: false, wasHold: false, pf: 0, gf: 0, pinchVal: 1, curled: 0, hist: [], off: null,
    seen: 0, hover: null, dwellDone: false, progress: 0, cooldown: 0, drag: null, link: null, ripple: 0, slot: Hands.size % 2 };
}
function dropHand(p) { if (p.drag) endDrag(p.drag, 0, 0, true); unpress(p.hover); }
function onHands(res, now) {
  const lms = res.landmarks || [], hd = res.handedness || res.handednesses || [];
  const vw = video.videoWidth || (frameCv.width > 2 ? frameCv.width : 640), vh = video.videoHeight || (frameCv.height > 2 ? frameCv.height : 480), used = new Set(), ar = isAR(), M = camMap(vw, vh);
  const map = (cx, cy) => ar ? { x: M.offX + cx * M.sc, y: M.offY + cy * M.sc }
    : { x: clamp((cx / vw - S.margin) / (1 - 2 * S.margin), 0, 1) * innerWidth, y: clamp((cy / vh - S.margin) / (1 - 2 * S.margin), 0, 1) * innerHeight };
  lms.forEach((lm, idx) => {
    let id = hd[idx]?.[0]?.categoryName || "Tay"; if (used.has(id)) id += "2"; used.add(id);
    let p = Hands.get(id); if (!p) { p = newHand(id); p.born = now; Hands.set(id, p); }
    // MediaPipe gắn nhãn theo ảnh đã lật gương; khung hình webcam chưa lật nên đảo lại
    const cat = hd[idx]?.[0]; p.label = cat?.categoryName === "Left" ? "TAY PHẢI" : cat?.categoryName === "Right" ? "TAY TRÁI" : "TAY"; p.score = cat?.score ?? p.score;
    const X = i => (1 - lm[i].x) * vw, Y = i => lm[i].y * vh, Z = i => lm[i].z * vw;
    const d3 = (a, b) => Math.hypot(X(a) - X(b), Y(a) - Y(b), Z(a) - Z(b));
    const palm = (d3(0, 5) + d3(5, 17) + d3(0, 17)) / 3 || 1;
    // chụm (ngón cái chạm ngón trỏ) – trễ 2 khung hình chống rung
    const pv = d3(4, 8) / palm; p.pinchVal = pv;
    const wantP = p.pinch ? pv < S.pinchOn * 1.5 : pv < S.pinchOn;
    if (wantP !== p.pinch) { if (++p.pf >= 2) { p.pinch = wantP; p.pf = 0; } } else p.pf = 0;
    // nắm (4 ngón gập)
    let curled = 0; for (const [tip, pip] of [[8, 6], [12, 10], [16, 14], [20, 18]]) if (d3(tip, 0) < d3(pip, 0) * 1.05) curled++;
    p.curled = curled;
    const wantG = S.grab && (p.grab ? curled >= 3 : curled >= 4);
    if (wantG !== p.grab) { if (++p.gf >= 3) { p.grab = wantG; p.gf = 0; } } else p.gf = 0;
    p.hold = p.pinch || p.grab;
    p.close = clamp((S.pinchOn * 3.2 - pv) / (S.pinchOn * 2.2), 0, 1);
    // 21 khớp đã làm mượt (tọa độ camera, đã lật gương) – dùng để vẽ
    p.cam = lm.map((_, i) => ({ x: p.lf[i][0].f(X(i), now), y: p.lf[i][1].f(Y(i), now) }));
    // điểm trỏ: đầu ngón trỏ, dịch dần về giữa hai ngón khi sắp chụm
    const close = clamp((.95 - pv) / .6, 0, 1);
    const pcx = X(8) + ((X(4) + X(8)) / 2 - X(8)) * close, pcy = Y(8) + ((Y(4) + Y(8)) / 2 - Y(8)) * close;
    const P = map(pcx, pcy);
    const C = map((X(0) + X(5) + X(9) + X(13) + X(17)) / 5, (Y(0) + Y(5) + Y(9) + Y(13) + Y(17)) / 5);
    let T;
    if (p.hold && !p.wasHold) {
      // lúc bắt đầu chụm/nắm: lấy vị trí trước khi ngón tay kéo lệch, rồi neo theo lòng bàn tay
      let k = p.hist.length - 3; while (k > 0 && now - p.hist[k].t < 110) k--;
      const back = p.hist[Math.max(0, k)] || P;
      p.off = { x: back.x - C.x, y: back.y - C.y }; T = back; p.fx.snap(back.x); p.fy.snap(back.y); p.ripple = 1;
    } else if (p.hold && p.off) T = { x: C.x + p.off.x, y: C.y + p.off.y };
    else { T = P; p.off = null; p.hist.push({ t: now, x: P.x, y: P.y }); while (p.hist.length > 5 && now - p.hist[0].t > 400) p.hist.shift(); }
    p.wasHold = p.hold;
    const ox = p.x, oy = p.y, ot = p.seen || now;
    p.x = p.fx.f(T.x, now); p.y = p.fy.f(T.y, now);
    const dt = Math.max(.016, (now - ot) / 1000); p.vx = (p.x - ox) / dt; p.vy = (p.y - oy) / dt;
    // cỡ bàn tay (cho chế độ không có nền camera)
    const palmLen = Math.max(Math.hypot(X(0) - X(9), Y(0) - Y(9)), Math.hypot(X(5) - X(17), Y(5) - Y(17)) * 1.25) || 1;
    const k = 128 * S.handSize / palmLen; p.k = p.k ? p.k + (k - p.k) * .2 : k;
    const c8 = p.cam[8], c4 = p.cam[4];
    p.ptrCam = { x: c8.x + ((c4.x + c8.x) / 2 - c8.x) * close, y: c8.y + ((c4.y + c8.y) / 2 - c8.y) * close };
    p.seen = now;
    DET.dist = palmLen / vh;
  });
  DET.hands = lms.length;
  $("#camInfo").textContent = lms.length ? `Thấy ${lms.length} tay` : "Chưa thấy tay";
}

/* ---------- tương tác mỗi khung hình màn hình ---------- */
let lastTouch = 0;
function updateHands(now, dt) {
  const hovered = new Set();
  for (const [id, p] of Hands) {
    if (now - p.seen > (p.drag ? 900 : 400)) { dropHand(p); Hands.delete(id); continue; }
    processPointer(p, now, dt);
    if (p.hover) hovered.add(p.hover);
    p.prevHold = p.hold; Input.last = { x: p.x, y: p.y, t: now };
  }
  $$(".g-hover").forEach(el => { if (!hovered.has(el)) { el.classList.remove("g-hover"); unpress(el); } });
  hovered.forEach(el => el.classList.add("g-hover"));
}
function stickyTarget(p, x, y) {
  const cur = p.hover;
  if (cur && cur.isConnected && usable(cur)) {
    const r = cur.getBoundingClientRect(), m = Math.min(20, Math.min(r.width, r.height) * .15 + 8);
    if (x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m) return cur;
  }
  return hitAt(x, y);
}
function processPointer(p, now, dt) {
  if (p.drag) {
    moveDrag(p.drag, p.x, p.y); p.progress = 0;
    if (!p.hold) { const d = p.drag; p.drag = null; p.cooldown = now + 350; endDrag(d, p.x, p.y); }
    return;
  }
  const target = stickyTarget(p, p.x, p.y);
  if (target !== p.hover) {
    unpress(p.hover); p.hover = target; p.dwellDone = false; p.progress = 0;
    if (target && now - lastTouch > 90) { Sfx.touch(); lastTouch = now; }
  }
  if (p.link && !p.hold) {
    if (target && target !== p.link && target.hasAttribute("data-link")) { fire(target, "glinkend"); p.dwellDone = true; }
    p.link = null;
  }
  const onset = p.hold && !p.prevHold, isHoldEl = target && target.hasAttribute("data-hold");
  if (onset && now > p.cooldown && target && !isHoldEl) {
    if (target.hasAttribute("data-drag")) { unpress(target); p.drag = startDrag(target, p.x, p.y); p.hover = null; return; }
    if (target.hasAttribute("data-link")) { fire(target, "glinkstart"); p.link = target; p.cooldown = now + 300; p.dwellDone = true; }
    else if (S.mode !== "dwell") { fire(target); p.cooldown = now + 450; p.dwellDone = true; }
  }
  // tiến trình: giữ yên (dwell) hoặc nút cần giữ (data-hold)
  let rate = 0;
  if (target && !p.dwellDone) {
    if (isHoldEl) rate = p.hold ? 1 / 650 : S.mode !== "pinch" ? 1 / 1600 : 0;
    else if (!p.hold && S.mode !== "pinch" && !target.hasAttribute("data-nodwell")) rate = 1 / S.dwellMs;
  }
  if (rate) { p.progress += dt * 1000 * rate; if (p.progress >= 1) { p.progress = 0; p.dwellDone = true; fire(target); p.ripple = 1; } }
  else if (!target || p.dwellDone) p.progress = 0;
  if (target) {
    const press = p.hold && !isHoldEl ? 1 : clamp(p.progress, 0, 1);
    if (press > 0) { target.classList.add("pressing"); target.style.setProperty("--press", press.toFixed(3)); } else unpress(target);
  }
}

/* ==========================================================
   VẼ BÀN TAY
   - Có nền camera: bàn tay thật hiện rõ phía sau giao diện kính mờ;
     chỉ vẽ vòng trỏ ở đầu ngón trỏ + dây nối ngón cái–ngón trỏ báo độ chụm.
   - Không nền camera: vẽ "bàn tay kính mờ" hoặc "khung xương phát sáng" theo 21 khớp.
   ========================================================== */
const HAND_STYLES = { auto: "Tự động", ai: "Quét AI", pointer: "Chỉ vòng trỏ", skeleton: "Khung xương phát sáng", ghost: "Bàn tay kính mờ" };
const FINGERS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const FW = [.27, .215, .225, .21, .18];
const handStyle = () => S.handStyle in HAND_STYLES && S.handStyle !== "auto" ? S.handStyle : "ai";
function handPts(p) {
  if (!p.cam) return null;
  if (isAR()) { const M = camMap(frameCv.width > 2 ? frameCv.width : video.videoWidth || 640, frameCv.height > 2 ? frameCv.height : video.videoHeight || 480); return p.cam.map(q => ({ x: M.offX + q.x * M.sc, y: M.offY + q.y * M.sc })); }
  return p.cam.map(q => ({ x: p.x + (q.x - p.ptrCam.x) * p.k, y: p.y + (q.y - p.ptrCam.y) * p.k }));
}
function silhouette(ctx, P, s, ws) {
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); [0, 1, 2, 5, 9, 13, 17].forEach((i, j) => j ? ctx.lineTo(P[i].x, P[i].y) : ctx.moveTo(P[i].x, P[i].y)); ctx.closePath();
  ctx.lineWidth = s * .26 * ws; ctx.fill(); ctx.stroke();
  FINGERS.forEach((ids, f) => { ctx.beginPath(); ctx.moveTo(P[ids[0]].x, P[ids[0]].y); for (let j = 1; j < ids.length; j++) ctx.lineTo(P[ids[j]].x, P[ids[j]].y); ctx.lineWidth = FW[f] * s * ws; ctx.stroke(); });
}
const GH = document.createElement("canvas"), gh = GH.getContext("2d");
function drawGhostHand(c, P, p) {
  const s = Math.hypot(P[0].x - P[9].x, P[0].y - P[9].y) || 100, pad = s * .45;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const q of P) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
  x0 = Math.floor(x0 - pad); y0 = Math.floor(y0 - pad); const w = Math.ceil(x1 + pad) - x0, hh = Math.ceil(y1 + pad) - y0;
  if (w <= 0 || hh <= 0 || w > 4000 || hh > 4000) return;
  GH.width = w; GH.height = hh; gh.save(); gh.translate(-x0, -y0); gh.fillStyle = gh.strokeStyle = "#fff"; silhouette(gh, P, s, 1); gh.restore();
  const op = S.handOpacity;
  c.save();
  c.globalAlpha = .28 * op; c.filter = `blur(${Math.round(s * .12)}px) brightness(0)`; c.drawImage(GH, x0 + s * .08, y0 + s * .16);   // bóng đổ
  c.filter = "none"; c.globalAlpha = .2 * op; c.drawImage(GH, x0, y0);                                                                  // thân kính mờ
  gh.globalCompositeOperation = "destination-out"; gh.filter = "blur(5px)"; gh.save(); gh.translate(-x0, -y0); silhouette(gh, P, s, .72); gh.restore();
  gh.filter = "none"; gh.globalCompositeOperation = "source-over";
  c.globalAlpha = .9 * op; c.drawImage(GH, x0, y0);                                                                                     // viền sáng
  c.restore();
  // nếp ngón tay nhẹ để thấy từng ngón
  c.save(); c.globalAlpha = .35 * op; c.strokeStyle = "#fff"; c.lineWidth = 1.2; c.lineCap = "round";
  for (const ids of FINGERS.slice(1)) { c.beginPath(); c.moveTo(P[ids[0]].x, P[ids[0]].y); for (let j = 1; j < 4; j++) c.lineTo(P[ids[j]].x, P[ids[j]].y); c.stroke(); }
  c.restore();
}
function drawSkeletonHand(c, P, p) {
  const s = clamp((Math.hypot(P[0].x - P[9].x, P[0].y - P[9].y) || 100) / 110, .6, 1.8), rgb = p.slot ? "56,189,248" : "45,212,191";
  c.save(); c.globalAlpha = S.handOpacity; c.lineCap = "round"; c.lineJoin = "round";
  c.fillStyle = `rgba(${rgb},.12)`; c.beginPath(); [0, 1, 5, 9, 13, 17].forEach((i, j) => j ? c.lineTo(P[i].x, P[i].y) : c.moveTo(P[i].x, P[i].y)); c.closePath(); c.fill();
  c.shadowColor = `rgba(${rgb},.95)`; c.shadowBlur = 14 * s; c.strokeStyle = "rgba(255,255,255,.92)"; c.lineWidth = 3.2 * s;
  c.beginPath(); for (const [a, b] of CONN) { c.moveTo(P[a].x, P[a].y); c.lineTo(P[b].x, P[b].y); } c.stroke();
  c.shadowBlur = 8 * s;
  P.forEach((q, i) => { const tip = i % 4 === 0 && i > 0; c.fillStyle = tip ? `rgb(${rgb})` : "#fff"; c.beginPath(); c.arc(q.x, q.y, (tip ? 6 : 3.4) * s, 0, 7); c.fill();
    if (tip) { c.strokeStyle = "#fff"; c.lineWidth = 1.6 * s; c.stroke(); } });
  c.restore();
}
function drawPointer(c, p, P) {
  const col = p.slot ? "#a78bfa" : "#0066FF", x = p.x, y = p.y;
  // dây nối ngón cái – ngón trỏ: ngắn dần, sáng dần khi chụm
  if (P && !p.drag && (p.close > .1 || p.hold)) {
    const t = P[4], i = P[8], cl = p.hold ? 1 : p.close;
    c.save(); c.lineCap = "round"; c.shadowColor = col; c.shadowBlur = 4 + 10 * cl;
    c.strokeStyle = p.hold ? col : `rgba(255,255,255,${.3 + .55 * cl})`; c.lineWidth = 2 + 2.5 * cl;
    c.beginPath(); c.moveTo(t.x, t.y); c.lineTo(i.x, i.y); c.stroke();
    c.fillStyle = c.strokeStyle; for (const q of [t, i]) { c.beginPath(); c.arc(q.x, q.y, 3 + 2 * cl, 0, 7); c.fill(); }
    c.restore();
  }
  c.save();
  if (p.hover || p.drag) { // ánh sáng tại điểm chạm
    const g = c.createRadialGradient(x, y, 0, x, y, 80);
    g.addColorStop(0, p.hold ? "rgba(0,102,255,.38)" : "rgba(102,163,255,.22)"); g.addColorStop(1, "rgba(0,102,255,0)");
    c.globalCompositeOperation = "lighter"; c.fillStyle = g; c.beginPath(); c.arc(x, y, 80, 0, 7); c.fill(); c.globalCompositeOperation = "source-over";
  }
  const R = p.hold ? 12 : p.hover ? 21 : 15; p.ringR += (R - p.ringR) * .35;
  c.shadowColor = "rgba(0,0,0,.55)"; c.shadowBlur = 8;
  if (p.hold) { c.fillStyle = col; c.globalAlpha = .92; c.beginPath(); c.arc(x, y, p.ringR, 0, 7); c.fill(); c.globalAlpha = 1; }
  c.strokeStyle = p.hover && !p.hold ? col : "rgba(255,255,255,.95)"; c.lineWidth = p.hover ? 3 : 2.4;
  c.beginPath(); c.arc(x, y, p.ringR, 0, 7); c.stroke();
  c.shadowBlur = 0;
  if (p.progress > 0) {
    c.strokeStyle = "rgba(0,0,0,.35)"; c.lineWidth = 6; c.beginPath(); c.arc(x, y, p.ringR + 8, 0, 7); c.stroke();
    c.strokeStyle = col; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.arc(x, y, p.ringR + 8, -Math.PI / 2, -Math.PI / 2 + p.progress * Math.PI * 2); c.stroke();
  }
  if (p.ripple > 0) { c.globalAlpha = p.ripple; c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(x, y, p.ringR + (1 - p.ripple) * 36, 0, 7); c.stroke(); c.globalAlpha = 1; p.ripple = Math.max(0, p.ripple - .07); }
  c.fillStyle = p.hold ? "#fff" : col; c.beginPath(); c.arc(x, y, p.hold ? 3.5 : 4, 0, 7); c.fill();
  c.restore();
}
/* ---------- kiểu "Quét AI": viền sáng ôm dáng tay, vệt quét, lưới khớp, khung ngắm + nhãn cử chỉ ---------- */
const GS = document.createElement("canvas"), gs = GS.getContext("2d"), GE = document.createElement("canvas"), ge = GE.getContext("2d");
const MESH = [[1, 5], [2, 5], [0, 9], [0, 13], [5, 9], [9, 13], [13, 17], [6, 10], [10, 14], [14, 18]];
function gestureLabel(p) { return p.drag ? "ĐANG CẦM" : p.grab ? "NẮM TAY" : p.pinch ? "CHỤM" : p.close > .45 ? "SẮP CHỤM" : p.hover ? "CHẠM" : "TRỎ"; }
function drawAIHand(c, P, p, now) {
  const rgb = p.slot ? "167,139,250" : "26,117,255", col = `rgb(${rgb})`, op = S.handOpacity;
  const s = Math.hypot(P[0].x - P[9].x, P[0].y - P[9].y) || 100, pad = s * .5;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const q of P) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
  const bx0 = x0, by0 = y0, bx1 = x1, by1 = y1;
  x0 = Math.floor(x0 - pad); y0 = Math.floor(y0 - pad); const w = Math.ceil(x1 + pad) - x0, hh = Math.ceil(y1 + pad) - y0;
  if (w <= 0 || hh <= 0 || w > 4000 || hh > 4000) return;
  // 1) khối bàn tay (tô màu) – dùng làm mặt nạ
  GH.width = GS.width = GE.width = w; GH.height = GS.height = GE.height = hh;
  gh.save(); gh.translate(-x0, -y0); gh.fillStyle = gh.strokeStyle = "#fff"; silhouette(gh, P, s, 1.1); gh.restore();
  gh.globalCompositeOperation = "source-in"; gh.fillStyle = col; gh.fillRect(0, 0, w, hh); gh.globalCompositeOperation = "source-over";
  c.save(); c.globalAlpha = .1 * op; c.drawImage(GH, x0, y0);
  // 2) vệt quét chạy từ cổ tay lên đầu ngón
  const ph = (now / 1500) % 1, band = s * .5, yb = (by1 + pad * .3) - ph * (by1 - by0 + pad * .6 + band) - y0;
  gs.drawImage(GH, 0, 0); gs.globalCompositeOperation = "source-in";
  const g = gs.createLinearGradient(0, yb - band, 0, yb + band * .15);
  g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(.85, `rgba(${rgb},.55)`); g.addColorStop(1, "rgba(255,255,255,.9)");
  gs.fillStyle = g; gs.fillRect(0, 0, w, hh); gs.globalCompositeOperation = "source-over";
  c.globalCompositeOperation = "lighter"; c.globalAlpha = .5 * op; c.drawImage(GS, x0, y0);
  // 3) viền sáng ôm theo dáng tay
  ge.drawImage(GH, 0, 0); ge.globalCompositeOperation = "destination-out"; ge.save(); ge.translate(-x0, -y0); ge.fillStyle = ge.strokeStyle = "#000"; silhouette(ge, P, s, .97); ge.restore(); ge.globalCompositeOperation = "source-over";
  c.globalAlpha = op; c.shadowColor = col; c.shadowBlur = 14; c.drawImage(GE, x0, y0); c.drawImage(GE, x0, y0);
  c.restore();
  // 4) lưới khớp
  c.save(); c.globalAlpha = op; c.lineCap = "round";
  c.strokeStyle = `rgba(${rgb},.45)`; c.lineWidth = 1.1; c.beginPath();
  for (const [a, b] of MESH) { c.moveTo(P[a].x, P[a].y); c.lineTo(P[b].x, P[b].y); } c.stroke();
  c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 1.6; c.beginPath();
  for (const [a, b] of CONN) { c.moveTo(P[a].x, P[a].y); c.lineTo(P[b].x, P[b].y); } c.stroke();
  const pulse = .5 + .5 * Math.sin(now / 260);
  P.forEach((q, i) => {
    const tip = i % 4 === 0 && i > 0;
    if (tip) { c.strokeStyle = col; c.lineWidth = 1.8; c.beginPath(); c.arc(q.x, q.y, 5.5 + pulse * 1.5, 0, 7); c.stroke(); }
    c.fillStyle = tip ? "#fff" : `rgba(${rgb},.95)`; c.beginPath(); c.arc(q.x, q.y, tip ? 2.4 : 2.1, 0, 7); c.fill();
  });
  // 5) khung ngắm "khóa mục tiêu" + nhãn
  const born = clamp((now - p.born) / 380, 0, 1), e = 1 - Math.pow(1 - born, 3), grow = (1 - e) * s * .5;
  const m = s * .22 + grow, L = Math.max(14, s * .16);
  const a0 = bx0 - m, b0 = by0 - m, a1 = bx1 + m, b1 = by1 + m;
  c.globalAlpha = op * (.35 + .65 * e); c.strokeStyle = col; c.lineWidth = 2.4; c.shadowColor = col; c.shadowBlur = 8; c.beginPath();
  for (const [cx, cy, dx, dy] of [[a0, b0, 1, 1], [a1, b0, -1, 1], [a0, b1, 1, -1], [a1, b1, -1, -1]]) { c.moveTo(cx, cy + dy * L); c.lineTo(cx, cy); c.lineTo(cx + dx * L, cy); }
  c.stroke(); c.shadowBlur = 0;
  const txt = `${p.label || "TAY"} ${Math.round((p.score || .95) * 100)}% · ${gestureLabel(p)}`;
  c.font = "700 12px 'Be Vietnam Pro', system-ui, sans-serif"; const tw = c.measureText(txt).width;
  const lx = a0, ly = b0 - 26;
  c.globalAlpha = op * e; c.fillStyle = "rgba(6,12,24,.78)"; c.strokeStyle = `rgba(${rgb},.9)`; c.lineWidth = 1.2;
  c.beginPath(); c.roundRect ? c.roundRect(lx, ly, tw + 22, 20, 6) : c.rect(lx, ly, tw + 22, 20); c.fill(); c.stroke();
  c.fillStyle = col; c.beginPath(); c.arc(lx + 9, ly + 10, 3 * (.7 + .3 * pulse), 0, 7); c.fill();
  c.fillStyle = "#e6fbff"; c.textBaseline = "middle"; c.fillText(txt, lx + 16, ly + 10.5);
  c.restore();
}
function drawHands() {
  const c = HL.ctx, now = performance.now(); c.clearRect(0, 0, innerWidth, innerHeight);
  const style = handStyle();
  for (const p of Hands.values()) {
    const P = handPts(p);
    if (P) { if (style === "ai") drawAIHand(c, P, p, now); else if (style === "skeleton") drawSkeletonHand(c, P, p); else if (style === "ghost") drawGhostHand(c, P, p); }
    drawPointer(c, p, P);
  }
}
const bgCv = $("#bgCanvas"), bgx = bgCv.getContext("2d", { alpha: false });
function drawBg() {
  const W = innerWidth, H = innerHeight; if (bgCv.width !== W || bgCv.height !== H) { bgCv.width = W; bgCv.height = H; }
  const vw = frameCv.width, vh = frameCv.height, M = camMap(vw, vh);
  bgx.setTransform(-M.sc, 0, 0, M.sc, M.offX + vw * M.sc, M.offY); bgx.drawImage(frameCv, 0, 0); bgx.setTransform(1, 0, 0, 1, 0, 0);
  if (isAR()) {
    const dark = S.theme === "light" ? "245,247,252" : "5,10,20";
    const g = bgx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgba(${dark},${S.bgDim + .1})`); g.addColorStop(.35, `rgba(${dark},${S.bgDim})`); g.addColorStop(1, `rgba(${dark},${S.bgDim * .7})`); bgx.fillStyle = g; bgx.fillRect(0, 0, W, H);
  }
}
function drawSkeleton(res) {
  if (!S.showCam) return;
  const W = camCv.width, H = camCv.height; camCtx.clearRect(0, 0, W, H);
  (res.landmarks || []).forEach((lm, i) => {
    camCtx.strokeStyle = i ? "#a78bfa" : "#0066FF"; camCtx.lineWidth = Math.max(2, W / 200); camCtx.beginPath();
    for (const [a, b] of CONN) { camCtx.moveTo(lm[a].x * W, lm[a].y * H); camCtx.lineTo(lm[b].x * W, lm[b].y * H); }
    camCtx.stroke();
  });
}

/* ---------- vòng lặp chính (màn hình) ---------- */
let lastNow = performance.now();
function loop(now) {
  const dt = Math.min(.05, (now - lastNow) / 1000); lastNow = now;
  if (Cam.running && !video.requestVideoFrameCallback && video.readyState >= 2 && video.currentTime !== Cam.lastTime) { Cam.lastTime = video.currentTime; processFrame(); }
  if (Cam.newFrame && (isAR() || (Cam.running && S.bgCam > 0))) { drawBg(); Cam.newFrame = false; }
  if (now - DET.t0 > 1000) {
    DET.fps = DET.n; DET.n = 0; DET.t0 = now;
    if (Cam.running) {
      DET.slow = DET.fps < 12 ? DET.slow + 1 : 0;
      if (DET.slow === 5 && S.hands === 2 && DET.hands < 2) { toast("Máy hơi chậm. Nếu chỉ một người chơi, chọn nhận 1 tay trong Cài đặt để mượt hơn.", 5000); }
    }
    camStats();
  }
  updateHands(now, dt);
  for (const fn of [...frameHooks]) { try { fn(now, dt); } catch (e) { console.error(e); } }
  stepDrags(dt); FX.step(dt); drawHands();
  requestAnimationFrame(loop);
}

/* ---------------- dùng chung ---------------- */
function timerBar(sec, onEnd) {
  const fill = h("i"), el = h("div", { class: "tbar" }, fill); const t0 = performance.now(); let left = sec, stopped = false;
  const tick = now => { if (stopped) return; left = Math.max(0, sec - (now - t0) / 1000); fill.style.transform = `scaleX(${left / sec})`; el.classList.toggle("low", left <= 5);
    if (left <= 0) { stopped = true; frameHooks.delete(tick); onEnd(); } };
  frameHooks.add(tick);
  return { el, stop() { stopped = true; frameHooks.delete(tick); }, left: () => left };
}
function gameClock(gid, t0, onEnd) {
  const lim = (G(gid, "limit") || 0) * 60; let fired = false;
  return {
    label: now => lim ? `Còn <b>${fmtTime(Math.max(0, lim - (now - t0) / 1000))}</b>` : `Thời gian <b>${fmtTime((now - t0) / 1000)}</b>`,
    check(now) { if (lim && !fired && (now - t0) / 1000 >= lim) { fired = true; toast("Hết giờ!", 1500); Sfx.wrong(); onEnd(); } }
  };
}
function shuffleQ(q) { const idx = shuffle(q.opts.map((_, i) => i)); return { q: q.q, opts: idx.map(i => q.opts[i]), ans: idx.indexOf(q.ans) }; }
function answerButtons(q, onPick, prefix = "") {
  return q.opts.map((o, k) => { const b = h("button", { class: `ans ans-${k}`, "data-hit": true }, h("span", { class: "ans-key" }, "ABCD"[k]), h("span", {}, o)); on(b, () => onPick(k, b)); return b; });
}
function markAnswers(btns, ans, picked) {
  btns.forEach((b, j) => { b.classList.add("is-locked"); if (j === ans) b.classList.add("is-right"); else if (j === picked) b.classList.add("is-wrong"); else b.classList.add("is-dim"); });
}
const prog = (a, b, w = "Câu") => `${w} <b>${Math.min(a, b)}/${b}</b>`;

/* ==========================================================
   THỐNG KÊ TỪNG CÂU HỎI (v6.1)
   Mỗi lần học sinh trả lời trong trò chơi được ghi lại theo bộ đề:
   số lần đúng/sai, đáp án hay chọn nhầm, học sinh nào sai, trò nào đã hỏi.
   ========================================================== */
const QSTAT_KEY = "lhvt6.qstats";
let QSTATS = store.get(QSTAT_KEY, {});
if (!QSTATS || typeof QSTATS !== "object" || Array.isArray(QSTATS)) QSTATS = {};
let curGameId = "", qsaveT = 0;
const TYPE_LBL = { quiz: "Trắc nghiệm", tf: "Đúng / Sai", match: "Nối cặp", sort: "Phân loại", order: "Thứ tự", words: "Từ khóa", clue: "Bingo" };
function logAns(type, q, ok, extra = {}) {
  try {
    if (!q) return;
    const set = QSTATS[currentId] || (QSTATS[currentId] = {});
    const key = type + "|" + normTxt(String(q) + (extra.k ? "|" + extra.k : "")).slice(0, 200);
    const e = set[key] || (set[key] = { t: type, q: String(q), a: "", r: 0, w: 0, p: {}, g: {}, pl: {}, last: 0 });
    if (extra.a != null) e.a = String(extra.a);
    if (extra.o) e.o = extra.o.slice();
    if (extra.h) e.h = extra.h;
    if (extra.seq) e.seq = extra.seq.slice();
    ok ? e.r++ : e.w++; e.last = Date.now();
    if (!ok && extra.pick) { const pk = String(extra.pick).slice(0, 80); e.p[pk] = (e.p[pk] || 0) + 1; }
    if (curGameId) e.g[curGameId] = (e.g[curGameId] || 0) + 1;
    if (Play.player) { const pp = e.pl[Play.player] || (e.pl[Play.player] = { r: 0, w: 0 }); ok ? pp.r++ : pp.w++; }
    clearTimeout(qsaveT); qsaveT = setTimeout(() => store.set(QSTAT_KEY, QSTATS), 400);
  } catch (err) { console.error(err); }
}
function logQuiz(q, k) {
  const ok = k === q.ans, pick = k >= 0 ? q.opts[k] : "Hết giờ";
  if (q.tf) logAns("tf", q.q, ok, { a: q.opts[q.ans], pick });
  else logAns("quiz", q.q, ok, { a: q.opts[q.ans], o: q.opts, pick });
}

/* ==========================================================
   ĐỌC CÂU HỎI THÀNH TIẾNG (v6.1) — dùng giọng đọc có sẵn của trình duyệt
   ========================================================== */
const TTS = {
  ok: true, // luôn có giọng trực tuyến; giọng của máy là tùy chọn
  local: typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined",
  last: "", noted: false, audio: null, queue: [], gen: 0,
  voices() { try { return this.local ? speechSynthesis.getVoices() : []; } catch (e) { return []; } },
  viVoices() { return this.voices().filter(v => /^vi/i.test(v.lang) || /vietnam|tiếng việt/i.test(v.name)); },
  voice() {
    const vi = this.viVoices(), pref = S.ttsVoice && vi.find(v => v.voiceURI === S.ttsVoice);
    return pref || vi.find(v => /natural|online|neural/i.test(v.name)) || vi.find(v => /google/i.test(v.name)) || vi[0] || null;
  },
  /* chọn nguồn: giọng tiếng Việt có sẵn trên máy, nếu không có thì dùng giọng trực tuyến */
  engine() {
    const want = S.ttsEngine || "auto";
    if (want === "online") return "online";
    if (want === "local") return this.local && this.voice() ? "local" : "online";
    return this.local && this.voice() ? "local" : "online";
  },
  clean(t) {
    return String(t)
      .replace(/×/g, " nhân ").replace(/÷/g, " chia ")
      .replace(/(\d)\s*:\s*(\d)/g, "$1 chia $2")
      .replace(/(\d)\s*\+\s*(\d)/g, "$1 cộng $2")
      .replace(/=\s*\?/g, " bằng bao nhiêu?").replace(/=/g, " bằng ")
      .replace(/_{2,}/g, " chỗ trống ")
      .replace(/°\s*C/g, " độ C").replace(/%/g, " phần trăm").replace(/²/g, " bình phương").replace(/³/g, " lập phương")
      .replace(/→|>/g, ", ").replace(/\s+/g, " ").trim();
  },
  /* cắt câu dài thành từng đoạn ≤ 180 ký tự (giới hạn của giọng trực tuyến) */
  chunks(t) {
    const out = []; let cur = "";
    for (const part of t.split(/(?<=[.?!;:,])\s+/)) {
      if ((cur + " " + part).trim().length <= 180) { cur = (cur + " " + part).trim(); continue; }
      if (cur) out.push(cur);
      if (part.length <= 180) cur = part;
      else { const words = part.split(" "); cur = ""; for (const w of words) { if ((cur + " " + w).length > 180) { out.push(cur.trim()); cur = w; } else cur += " " + w; } cur = cur.trim(); }
    }
    if (cur) out.push(cur);
    return out;
  },
  mark(on_) { $$(".tts-btn").forEach(b => b.classList.toggle("speaking", on_)); },
  say(text, force) {
    if (!text || (!S.tts && !force)) return;
    this.stop();
    const t = this.clean(text), eng = this.engine(), my = ++this.gen;
    if (eng === "local") {
      try {
        const u = new SpeechSynthesisUtterance(t), v = this.voice();
        u.voice = v; u.lang = v.lang; u.rate = S.ttsRate || 1;
        u.onstart = () => this.mark(true); u.onend = u.onerror = () => this.mark(false);
        setTimeout(() => { if (my === this.gen) speechSynthesis.speak(u); }, 60); // Chrome đôi khi bỏ câu nói ngay sau cancel()
        return;
      } catch (e) {}
    }
    if (!this.noted && this.local && !this.voice()) { this.noted = true; toast("Máy chưa có giọng tiếng Việt, đang dùng giọng đọc trực tuyến (cần Internet).", 3500); }
    this.queue = this.chunks(t); this.playNext(my);
  },
  playNext(my) {
    if (my !== this.gen) return;
    const part = this.queue.shift(); if (!part) { this.mark(false); return; }
    const a = new Audio(); this.audio = a;
    a.referrerPolicy = "no-referrer"; a.preload = "auto";
    a.src = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&ttsspeed=1&q=" + encodeURIComponent(part);
    a.playbackRate = clamp(S.ttsRate || 1, .6, 1.6); a.preservesPitch = true;
    a.onplay = () => this.mark(true);
    a.onended = () => this.playNext(my);
    a.onerror = () => { this.mark(false); if (my === this.gen) toast("Không tải được giọng đọc trực tuyến. Kiểm tra kết nối Internet, hoặc mở trang bằng Microsoft Edge để dùng giọng tiếng Việt có sẵn.", 5000); };
    a.play().catch(err => { this.mark(false); if (err && err.name === "NotAllowedError") toast("Trình duyệt chặn phát âm thanh. Bấm vào trang một lần rồi thử lại.", 3000); });
  },
  stop() {
    this.gen++; this.queue = [];
    try { if (this.local) speechSynthesis.cancel(); } catch (e) {}
    if (this.audio) { try { this.audio.pause(); this.audio.src = ""; } catch (e) {} this.audio = null; }
    this.mark(false);
  }
};
if (TTS.local) try { speechSynthesis.onvoiceschanged = () => { if (screenName === "settings") $("#tts-voice-slot") && paintVoiceSel(); }; } catch (e) {}
const SPEAK_IC = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const MUTE_IC = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
/* lấy nội dung câu hỏi đang hiện trên màn chơi */
function readableQ() {
  const qel = stage.querySelector(".qcard .qtext, .qcard .hint, .tw-card b");
  if (!qel) return null;
  const q = qel.textContent.trim(); if (!q) return null;
  const seen = new Set(), opts = [];
  if (S.ttsOpts) for (const el of stage.querySelectorAll(".ans, .bopt, .gate, .hoop .board")) {
    if (el.classList.contains("is-gone")) continue;
    const key = (el.querySelector(".ans-key, b")?.textContent || "").trim();
    const txt = el.textContent.trim().slice(key.length).trim();
    if (!key || seen.has(key) || !txt) continue; seen.add(key); opts.push(`${key}: ${txt}`);
  }
  const qq = /[.?!…:]$/.test(q) ? q : q + ".";
  return opts.length ? `${qq} ${opts.join(". ")}.` : qq;
}
function ttsReplayBtn() {
  const card = stage.querySelector(".qcard"); if (!card || !TTS.ok || card.querySelector(".tts-btn")) return;
  const b = on(h("button", { class: "tts-btn", "data-hit": true, title: "Đọc lại câu hỏi", "aria-label": "Đọc lại câu hỏi", html: SPEAK_IC }), () => { const t = readableQ(); if (t) TTS.say(t, true); });
  card.append(b);
}
let ttsObsT = 0;
function ttsAuto() {
  if (screenName !== "game") return;
  ttsReplayBtn();
  const t = readableQ(); if (!t || t === TTS.last) return;
  TTS.last = t; if (S.tts) TTS.say(t);
}
function paintTTSBtn() {
  const b = $("#ttsBtn"); if (!b) return;
  b.hidden = !TTS.ok; b.innerHTML = S.tts ? SPEAK_IC : MUTE_IC; b.classList.toggle("on", !!S.tts);
  b.title = S.tts ? "Đang tự đọc câu hỏi (bấm để tắt)" : "Tự đọc câu hỏi thành tiếng (bấm để bật)";
}
function toggleTTS() {
  S.tts = !S.tts; saveS(); paintTTSBtn();
  if (S.tts) { toast("Đã bật đọc câu hỏi thành tiếng", 1600); TTS.last = ""; if (screenName === "game") ttsAuto(); else TTS.say("Đã bật đọc câu hỏi thành tiếng."); }
  else { TTS.stop(); toast("Đã tắt đọc câu hỏi", 1400); }
}
function paintVoiceSel() {
  const slot = $("#tts-voice-slot"); if (!slot) return;
  slot.innerHTML = "";
  const vi = TTS.viVoices(), eng = S.ttsEngine || "auto";
  const engSel = h("select", { id: "tts-engine", "aria-label": "Nguồn giọng đọc" },
    [["auto", "Tự động (ưu tiên giọng của máy)"], ["online", "Giọng trực tuyến của Google (cần Internet)"], ["local", "Chỉ dùng giọng có sẵn trên máy"]].map(([v, l]) => h("option", { value: v, selected: eng === v }, l)));
  engSel.addEventListener("change", () => { S.ttsEngine = engSel.value; saveS(); paintVoiceSel(); TTS.say("Xin chào các em. Câu hỏi số một.", true); });
  slot.append(h("label", { class: "field", for: "tts-engine" }, h("span", {}, "Nguồn giọng đọc"), engSel));
  const status = TTS.engine() === "local"
    ? h("small", { class: "tts-ok" }, `Đang dùng giọng có sẵn trên máy: ${TTS.voice()?.name || ""}`)
    : h("small", { class: "tts-warn" }, vi.length
        ? "Đang dùng giọng trực tuyến của Google (cần Internet)."
        : "Máy này chưa có giọng tiếng Việt, nên web dùng giọng trực tuyến của Google (cần Internet). Muốn đọc được cả khi mất mạng: mở trang bằng Microsoft Edge (có sẵn giọng HoaiMy, NamMinh), hoặc vào Cài đặt Windows → Thời gian và ngôn ngữ → Giọng nói → Thêm giọng → Tiếng Việt.");
  slot.append(status);
  if (vi.length && TTS.engine() === "local") {
    const cur = TTS.voice();
    const sel = h("select", { id: "tts-voice", "aria-label": "Giọng đọc" }, vi.map(v => h("option", { value: v.voiceURI, selected: cur && v.voiceURI === cur.voiceURI }, v.name.replace(/^Microsoft\s+/, "").replace(/\s+Online.*$/, " (trực tuyến)"))));
    sel.addEventListener("change", () => { S.ttsVoice = sel.value; saveS(); TTS.say("Xin chào các em. Câu hỏi số một.", true); });
    slot.append(h("label", { class: "field", for: "tts-voice", style: "margin-top:10px" }, h("span", {}, "Giọng đọc trên máy"), sel));
  }
}
function ttsSettings(range, check) {
  const box = h("div", { class: "stack", style: "gap:14px;padding-top:6px;border-top:1px solid var(--border)" },
    h("b", {}, "Đọc câu hỏi thành tiếng"),
    check("tts", "Tự đọc câu hỏi khi chuyển câu", "Bật / tắt nhanh bằng nút loa trên thanh trên cùng. Trong màn chơi luôn có nút đọc lại ở góc câu hỏi.", !!S.tts, v => { S.tts = v; paintTTSBtn(); }),
    check("ttsopts", "Đọc cả các đáp án A, B, C, D", "", S.ttsOpts !== false, v => S.ttsOpts = v),
    range("ttsrate", "Tốc độ đọc", .6, 1.4, .05, S.ttsRate || 1, v => v < .85 ? "Chậm, hợp lớp nhỏ" : v <= 1.1 ? "Vừa" : "Nhanh", v => S.ttsRate = v),
    h("div", { id: "tts-voice-slot" }),
    h("div", { class: "row" }, on(h("button", { class: "btn sm", "data-hit": true }, h("span", { class: "ico", html: SPEAK_IC }), "Nghe thử"), () => TTS.say("Câu một. Bảy nhân tám bằng bao nhiêu? A: năm mươi sáu. B: năm mươi tư.", true))));
  setTimeout(paintVoiceSel, 0);
  return box;
}

/* ================= 1. TRẮC NGHIỆM NHANH ================= */
function gameQuiz(st, data, g) {
  const qs = pickN(data.quiz, Math.min(G("quiz", "count"), data.quiz.length)).map(shuffleQ), QT = G("quiz", "time"), BONUS = G("quiz", "bonus");
  let i = 0, score = 0, correct = 0, streak = 0, locked = false, timer, btns; const ts = [];
  const root = h("div", { class: "game" }); st.append(root);
  const upd = () => hud({ progress: prog(i + 1, qs.length), score, extra: streak >= 2 ? `Chuỗi đúng <b>${streak}</b>` : "" });
  function render() {
    const q = qs[i]; locked = false; root.innerHTML = ""; upd();
    btns = answerButtons(q, k => choose(k)); timer = timerBar(QT, () => choose(-1));
    root.append(h("div", { class: "qcard" }, h("div", { class: "qmeta" }, `Câu ${i + 1} / ${qs.length}`), h("h2", { class: "qtext" }, q.q)), timer.el, h("div", { class: "answers" }, btns));
  }
  function choose(k) {
    if (locked) return; locked = true; timer.stop(); const q = qs[i]; markAnswers(btns, q.ans, k); logQuiz(q, k);
    if (k === q.ans) { correct++; streak++; score += 100 + (BONUS ? Math.round(50 * timer.left() / QT) + Math.min(streak - 1, 5) * 10 : 0); Sfx.right(); FX.burstEl(btns[k]); }
    else { streak = 0; Sfx.wrong(); if (k >= 0) reshake(btns[k]); else toast("Hết giờ!", 1200); }
    upd(); ts.push(setTimeout(() => { i++; i >= qs.length ? Result(g, { score, correct, total: qs.length }) : render(); }, 1600));
  }
  render(); return () => { timer?.stop(); ts.forEach(clearTimeout); };
}

/* ================= 2. ĐÚNG HAY SAI ================= */
function gameTF(st, data, g) {
  const qs = pickN(data.tf, Math.min(G("tf", "count"), data.tf.length)), QT = G("tf", "time");
  let i = 0, score = 0, correct = 0, locked = false, timer, yes, no; const ts = [];
  const root = h("div", { class: "game" }); st.append(root);
  const upd = () => hud({ progress: prog(i + 1, qs.length), score });
  function render() {
    const q = qs[i]; locked = false; root.innerHTML = ""; upd();
    yes = on(h("button", { class: "tfz", "data-hit": true }, h("span", { html: TFI.yes }), "ĐÚNG"), () => choose(true, yes));
    no = on(h("button", { class: "tfz no", "data-hit": true }, h("span", { html: TFI.no }), "SAI"), () => choose(false, no));
    timer = timerBar(QT, () => choose(null));
    root.append(h("div", { class: "qcard" }, h("div", { class: "qmeta" }, `Phát biểu ${i + 1} / ${qs.length}`), h("h2", { class: "qtext" }, q.s)), timer.el, h("div", { class: "tfz-wrap" }, yes, no));
  }
  function choose(v, el) {
    if (locked) return; locked = true; timer.stop(); const q = qs[i], right = q.v ? yes : no; logAns("tf", q.s, v === q.v, { a: q.v ? "Đúng" : "Sai", pick: v == null ? "Hết giờ" : v ? "Đúng" : "Sai" });
    [yes, no].forEach(b => b.classList.add("is-locked")); (q.v ? no : yes).classList.add("is-dim");
    if (v === q.v) { correct++; score += 100 + Math.round(50 * timer.left() / QT); Sfx.right(); FX.burstEl(el); }
    else { Sfx.wrong(); if (el) reshake(el); else toast("Hết giờ!", 1200); }
    right.style.boxShadow = "0 0 0 5px var(--text)"; upd();
    ts.push(setTimeout(() => { i++; i >= qs.length ? Result(g, { score, correct, total: qs.length }) : render(); }, 1400));
  }
  render(); return () => { timer?.stop(); ts.forEach(clearTimeout); };
}

/* ================= 3. Ô CỬA BÍ MẬT ================= */
function gameTiles(st, data, g) {
  const n = Math.min(G("tiles", "count"), data.quiz.length), qs = pickN(data.quiz, n).map(shuffleQ), QT = G("tiles", "time");
  const pts = qs.map(() => [100, 200, 300][Math.random() * 3 | 0]), star = G("tiles", "double") ? Math.random() * n | 0 : -1, state = qs.map(() => null);
  let score = 0, correct = 0, timer; const ts = [];
  const root = h("div", { class: "game" }); st.append(root);
  const opened = () => state.filter(Boolean).length;
  const upd = () => hud({ progress: `Đã mở <b>${opened()}/${n}</b>`, score });
  function board() {
    root.innerHTML = ""; upd();
    const cols = n <= 4 ? n : n <= 6 ? 3 : n <= 8 ? 4 : n <= 10 ? 5 : 6;
    const grid = h("div", { class: "tiles", style: `--cols:${cols}` });
    qs.forEach((q, k) => {
      const t = h("button", { class: "tile" + (k === star ? " star" : "") + (state[k] ? " is-locked " + state[k] : ""), "data-hit": true, disabled: !!state[k] },
        h("b", {}, state[k] === "ok" ? "✓" : state[k] === "bad" ? "✕" : k + 1), h("small", {}, `${pts[k]} điểm`));
      on(t, () => { if (!state[k]) open(k); }); grid.append(t);
    });
    root.append(h("p", { class: "tip" }, star >= 0 ? "Chọn một ô cửa để mở câu hỏi. Có một ô bí mật được nhân đôi điểm!" : "Chọn một ô cửa để mở câu hỏi."), grid);
    if (opened() === n) ts.push(setTimeout(() => Result(g, { score, correct, total: n }), 700));
  }
  function open(k) {
    const q = qs[k], double = k === star; let locked = false; root.innerHTML = "";
    const btns = answerButtons(q, j => pick(j));
    timer = timerBar(QT, () => pick(-1));
    root.append(h("div", { class: "qcard" }, h("div", { class: "qmeta" }, `Ô số ${k + 1} · ${pts[k]} điểm${double ? " · Ô NHÂN ĐÔI!" : ""}`), h("h2", { class: "qtext" }, q.q)), timer.el, h("div", { class: "answers" }, btns));
    if (double) { toast("Ô bí mật! Trả lời đúng được nhân đôi điểm", 1800); Sfx.win(); }
    function pick(j) {
      if (locked) return; locked = true; timer.stop(); markAnswers(btns, q.ans, j); logQuiz(q, j);
      if (j === q.ans) { state[k] = "ok"; correct++; score += pts[k] * (double ? 2 : 1); Sfx.right(); FX.burstEl(btns[j], 40); } else { state[k] = "bad"; Sfx.wrong(); if (j >= 0) reshake(btns[j]); }
      upd(); ts.push(setTimeout(board, 1500));
    }
  }
  board(); return () => { timer?.stop(); ts.forEach(clearTimeout); };
}

/* ================= 4. NỐI CẶP ================= */
function gameMatch(st, data, g) {
  const all = pickN(data.match, Math.min(data.match.length, G("match", "count"))), chunks = [], PER = G("match", "per");
  for (let k = 0; k < all.length; k += PER) chunks.push(all.slice(k, k + PER));
  if (chunks.length > 1 && chunks.at(-1).length === 1) chunks.at(-1).unshift(chunks.at(-2).pop());
  let ci = 0, score = 0, correct = 0, mistakes = 0, sel = null, links = [], matched = 0; const t0 = performance.now(), ts = [];
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "mlines");
  const L = h("div", { class: "mcol" }), R = h("div", { class: "mcol r" }), board = h("div", { class: "mboard" }, svg, L, R), info = h("p", { class: "tip" });
  st.append(h("div", { class: "game" }, info, board));
  const mk = (o, side) => { const b = h("button", { class: "mitem", "data-hit": true, "data-link": true }, o.t); b._k = o.k; b._side = side;
    b.addEventListener("glinkstart", () => { if (b.classList.contains("is-locked")) return; if (sel !== b) { sel?.classList.remove("sel"); sel = b; b.classList.add("sel"); } });
    b.addEventListener("glinkend", () => { if (sel && sel !== b) pick(b); });
    return on(b, () => pick(b)); };
  function round() {
    L.innerHTML = R.innerHTML = ""; links = []; sel = null; matched = 0; const pairs = chunks[ci];
    shuffle(pairs.map((p, k) => ({ t: p.a, k }))).forEach(o => L.append(mk(o, "L")));
    shuffle(pairs.map((p, k) => ({ t: p.b, k }))).forEach(o => R.append(mk(o, "R")));
    info.textContent = `Nối ${pairs.length} cặp: chụm tay vào một ô, kéo sợi dây sang ô tương ứng rồi thả tay. Hoặc chọn lần lượt hai ô.`;
  }
  function pick(el) {
    if (el.classList.contains("is-locked")) return;
    if (!sel) { sel = el; el.classList.add("sel"); return; }
    if (sel === el) { el.classList.remove("sel"); sel = null; return; }
    if (sel._side === el._side) { sel.classList.remove("sel"); sel = el; el.classList.add("sel"); return; }
    const a = sel._side === "L" ? sel : el, b = a === sel ? el : sel; sel.classList.remove("sel"); sel = null;
    if (a._k === b._k) { logAns("match", a.textContent, true, { a: chunks[ci][a._k].b });
      const color = COLORS[links.length % 6];
      [a, b].forEach(x => { x.classList.add("is-locked", "matched"); x.style.setProperty("--mc", color); });
      links.push({ a, b, color }); correct++; score += 100; Sfx.right(); FX.burstEl(b, 16);
      if (++matched === chunks[ci].length) ts.push(setTimeout(() => { ci++; ci < chunks.length ? round() : Result(g, { score, correct, total: correct + mistakes, label: "Nối đúng / lần nối", note: `Hoàn thành ${all.length} cặp trong ${fmtTime((performance.now() - t0) / 1000)}` }); }, 900));
    } else { logAns("match", a.textContent, false, { a: chunks[ci][a._k].b, pick: b.textContent }); mistakes++; score = Math.max(0, score - 20); Sfx.wrong(); reshake(a); reshake(b); }
  }
  const curve = (x1, y1, x2, y2) => { const mx = (x1 + x2) / 2; return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`; };
  const clock = gameClock("match", t0, () => Result(g, { score, correct, total: correct + mistakes, label: "Nối đúng / lần nối", note: `Hết giờ: nối được ${correct}/${all.length} cặp` }));
  frameHooks.add(now => {
    hud({ progress: `Lượt <b>${ci + 1}/${chunks.length}</b>`, score, extra: clock.label(now) }); clock.check(now);
    const br = board.getBoundingClientRect(); let s = "";
    for (const ln of links) { const ra = ln.a.getBoundingClientRect(), rb = ln.b.getBoundingClientRect();
      s += `<path d="${curve(ra.right - br.left, ra.top + ra.height / 2 - br.top, rb.left - br.left, rb.top + rb.height / 2 - br.top)}" stroke="${ln.color}" stroke-width="5" fill="none" stroke-linecap="round"/>`; }
    if (sel && now - Input.last.t < 2000) { const r = sel.getBoundingClientRect();
      s += `<path d="${curve((sel._side === "L" ? r.right : r.left) - br.left, r.top + r.height / 2 - br.top, Input.last.x - br.left, Input.last.y - br.top)}" stroke="var(--amber)" stroke-width="4" stroke-dasharray="10 8" fill="none" stroke-linecap="round"/>`; }
    svg.innerHTML = s;
  });
  round(); return () => ts.forEach(clearTimeout);
}

/* ================= 5. LẬT THẺ TRÍ NHỚ ================= */
function gameMemory(st, data, g) {
  const pairs = pickN(data.match, Math.min(G("memory", "count"), data.match.length)), PEEK = G("memory", "peek") * 1000;
  const cards = shuffle(pairs.flatMap((p, k) => [{ t: p.a, k }, { t: p.b, k }]));
  const cols = cards.length <= 8 ? 4 : cards.length <= 10 ? 5 : cards.length <= 12 ? 4 : 4;
  let open = [], found = 0, moves = 0, busy = false; const t0 = performance.now(), ts = [];
  const grid = h("div", { class: "mem", style: `--cols:${cols}` });
  const els = cards.map((c, idx) => {
    const el = h("button", { class: "mcard", "data-hit": true, "aria-label": "Thẻ úp" },
      h("div", { class: "mc-in" }, h("div", { class: "mc-f", html: '<svg viewBox="0 0 48 48"><path d="M16 26V13a3 3 0 0 1 6 0v10M22 22v-3a3 3 0 0 1 6 0v4M28 22a3 3 0 0 1 6 0v8a12 12 0 0 1-12 12h-2a12 12 0 0 1-10-5.5L7 31a3 3 0 0 1 5-3.4L16 32"/></svg>' }), h("div", { class: "mc-b" }, c.t)));
    el._c = c; on(el, () => flip(el)); grid.append(el); return el;
  });
  st.append(h("div", { class: "game" }, h("p", { class: "tip" }, "Lật hai thẻ mỗi lượt. Tìm thẻ và nội dung khớp với nó."), grid));
  function flip(el) {
    if (busy || el.classList.contains("open")) return;
    el.classList.add("open"); Sfx.flip(); open.push(el);
    if (open.length < 2) return;
    moves++; const [a, b] = open;
    if (a._c.k === b._c.k) {
      const col = COLORS[found % 6]; [a, b].forEach(x => { x.classList.add("done", "is-locked"); x.style.setProperty("--c", col); });
      open = []; found++; Sfx.right(); FX.burstEl(b, 18);
      if (found === pairs.length) ts.push(setTimeout(() => {
        const extra = moves - pairs.length, score = Math.max(100, pairs.length * 150 - extra * 20);
        Result(g, { score, correct: pairs.length, total: moves, label: "Cặp tìm được / lượt lật", stars: extra <= 2 ? 3 : extra <= 6 ? 2 : 1, note: `Tìm hết ${pairs.length} cặp sau ${moves} lượt, ${fmtTime((performance.now() - t0) / 1000)}` });
      }, 900));
    } else { busy = true; Sfx.wrong(); ts.push(setTimeout(() => { a.classList.remove("open"); b.classList.remove("open"); open = []; busy = false; }, PEEK)); }
  }
  const clock = gameClock("memory", t0, () => { busy = true; Result(g, { score: found * 100, correct: found, total: pairs.length, label: "Cặp tìm được", note: `Hết giờ: tìm được ${found}/${pairs.length} cặp sau ${moves} lượt` }); });
  frameHooks.add(now => { hud({ progress: `Cặp <b>${found}/${pairs.length}</b>`, score: null, extra: `Lượt <b>${moves}</b> · ${clock.label(now)}` }); if (found < pairs.length) clock.check(now); });
  return () => ts.forEach(clearTimeout);
}

/* ================= 6. PHÂN LOẠI (kéo – thả) ================= */
function gameSort(st, data, g) {
  const cats = data.sort.slice(0, 4); let pool = [];
  cats.forEach((c, ci) => c.items.forEach(t => pool.push({ t, ci }))); pool = pickN(pool, Math.min(pool.length, G("sort", "count")));
  let score = 0, correct = 0, mistakes = 0, placed = 0, sel = null; const t0 = performance.now(), ts = [];
  const tray = h("div", { class: "tray" }), buckets = h("div", { class: "buckets", style: `--n:${cats.length}` });
  cats.forEach((c, ci) => { const b = h("div", { class: "bucket", "data-drop": true, "data-hit": true, "data-nodwell": true, "data-cat": ci, style: `--c:${COLORS[ci % 6]}` }, h("div", { class: "bname" }, c.name), h("div", { class: "bitems" }));
    on(b, () => { if (sel) place(sel, b); }); buckets.append(b); });
  pool.forEach(it => {
    const chip = h("div", { class: "chip", "data-drag": true, tabindex: "0", role: "button" }, it.t); chip._ci = it.ci;
    chip.addEventListener("gselect", () => select(chip));
    chip.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(chip); } });
    chip.addEventListener("gdrop", e => { if (e.detail.zone) place(chip, e.detail.zone); });
    tray.append(chip);
  });
  st.append(h("div", { class: "game" }, h("p", { class: "tip" }, "Chụm tay vào thẻ để nhặt, kéo tới nhóm đúng rồi mở tay để thả. Hoặc chọn thẻ rồi chọn nhóm."), tray, buckets));
  function select(chip) { if (chip.classList.contains("is-locked")) return; if (sel === chip) { chip.classList.remove("sel"); sel = null; return; } sel?.classList.remove("sel"); sel = chip; chip.classList.add("sel"); }
  function place(chip, zone) {
    const ci = +zone.dataset.cat;
    if (ci === chip._ci) { logAns("sort", chip.textContent, true, { a: cats[chip._ci].name });
      chip.classList.remove("sel"); if (sel === chip) sel = null;
      chip.removeAttribute("data-drag"); chip.removeAttribute("tabindex"); chip.classList.add("is-locked", "placed"); chip.style.setProperty("--c", COLORS[ci % 6]);
      zone.querySelector(".bitems").append(chip); correct++; placed++; score += 100; Sfx.right(); FX.burstEl(zone, 16);
      if (placed === pool.length) { const sec = (performance.now() - t0) / 1000;
        ts.push(setTimeout(() => Result(g, { score: score + Math.max(0, 300 - Math.round(sec) * 3), correct, total: correct + mistakes, label: "Thả đúng / lần thả", note: `Xếp xong ${pool.length} thẻ trong ${fmtTime(sec)} (có thưởng điểm tốc độ)` }), 900)); }
    } else { logAns("sort", chip.textContent, false, { a: cats[chip._ci].name, pick: cats[ci].name }); mistakes++; score = Math.max(0, score - 20); Sfx.wrong(); reshake(chip); reshake(zone); }
  }
  const clock = gameClock("sort", t0, () => Result(g, { score, correct, total: correct + mistakes, label: "Thả đúng / lần thả", note: `Hết giờ: xếp đúng ${placed}/${pool.length} thẻ` }));
  frameHooks.add(now => { hud({ progress: `Đã xếp <b>${placed}/${pool.length}</b>`, score, extra: clock.label(now) }); if (placed < pool.length) clock.check(now); });
  return () => ts.forEach(clearTimeout);
}

/* ---------- dùng chung cho Sắp xếp thứ tự & Xếp chữ ---------- */
function seqBoard({ answer, letters, gapsAfter = new Set(), onSolved, onMistake, hintBtn }) {
  const slotsWrap = h("div", { class: "seq-slots" }), pool = h("div", { class: "seq-pool" });
  const wrap = h("div", { class: "stack" + (letters ? " letters" : "") }, slotsWrap, pool);
  const vals = answer.map(() => null), lockedPos = answer.map(() => false); let done = false;
  const slots = answer.map((_, i) => {
    const s = h("button", { class: "seq-slot", "data-hit": true, "data-drop": true, "data-slot": i }, h("span", { class: "num" }, i + 1), h("span", { class: "sv" }));
    on(s, () => { if (done || lockedPos[i] || vals[i] == null) return; returnTok(i); });
    slotsWrap.append(s); if (gapsAfter.has(i)) slotsWrap.append(h("span", { class: "seq-gap" }));
    else if (!letters && i < answer.length - 1) slotsWrap.append(h("span", { class: "seq-arrow" }, "→"));
    return s;
  });
  const toks = shuffle(answer.map((t, i) => ({ t, i })));
  if (answer.length > 1 && toks.every((o, j) => o.t === answer[j])) toks.push(toks.shift());
  const tokEls = toks.map(o => { const b = h("button", { class: "tok", "data-drag": true }, o.t); b._t = o.t;
    b.addEventListener("gselect", () => place(b));
    b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); place(b); } });
    b.addEventListener("gdrop", e => { const z = e.detail.zone; if (z && z.dataset.slot != null) placeAt(b, +z.dataset.slot); });
    pool.append(b); return b; });
  function placeAt(b, i) {
    if (done || lockedPos[i]) { Sfx.wrong(); return; }
    if (vals[i]) returnTok(i);
    vals[i] = b; b.hidden = true; paint(i); slots[i].animate?.([{ transform: "scale(1.12)" }, { transform: "none" }], { duration: 300, easing: "cubic-bezier(.2,1.4,.4,1)" });
    if (vals.every(Boolean)) check();
  }
  function paint(i) { const s = slots[i]; s.querySelector(".sv").textContent = vals[i] ? vals[i]._t : ""; s.classList.toggle("filled", !!vals[i]); }
  function place(b) {
    if (done) return; const i = vals.findIndex(v => v == null); if (i < 0) return;
    vals[i] = b; b.hidden = true; paint(i); Sfx.tick();
    if (vals.every(Boolean)) check();
  }
  function returnTok(i) { vals[i].hidden = false; vals[i] = null; slots[i].classList.remove("bad"); paint(i); }
  function check() {
    const okAll = vals.every((v, i) => v._t === answer[i]);
    vals.forEach((v, i) => { const ok = v._t === answer[i]; slots[i].classList.toggle("ok", ok); slots[i].classList.toggle("bad", !ok); if (ok) { lockedPos[i] = true; slots[i].classList.add("is-locked"); } });
    if (okAll) { done = true; Sfx.right(); FX.burstEl(slotsWrap, 40); onSolved(); return; }
    Sfx.wrong(); onMistake(); reshake(slotsWrap);
    setTimeout(() => vals.forEach((v, i) => { if (!lockedPos[i] && v) returnTok(i); }), 900);
  }
  function hint() {
    if (done) return false; const i = answer.findIndex((a, j) => !lockedPos[j]); if (i < 0) return false;
    if (vals[i]) returnTok(i);
    const b = tokEls.find(t => !t.hidden && t._t === answer[i]) || tokEls.find(t => t._t === answer[i] && !vals.includes(t));
    if (!b) return false;
    const j = vals.indexOf(b); if (j >= 0) returnTok(j);
    vals[i] = b; b.hidden = true; lockedPos[i] = true; paint(i); slots[i].classList.add("ok", "is-locked");
    if (vals.every(Boolean)) check(); return true;
  }
  return { el: wrap, hint };
}

/* ================= 7. SẮP XẾP THỨ TỰ ================= */
function gameOrder(st, data, g) {
  const rounds = pickN(data.order, Math.min(G("order", "count"), data.order.length)), RT = G("order", "time");
  let i = 0, score = 0, correct = 0, mistakes = 0, tries = 0, timer = null, solved = false; const ts = [], t0 = performance.now();
  const root = h("div", { class: "game" }); st.append(root);
  function render() {
    const r = rounds[i]; root.innerHTML = ""; tries = 0; solved = false; timer?.stop(); timer = null;
    const b = seqBoard({ answer: r.seq, onSolved: () => { logAns("order", r.title, tries === 0, { a: r.seq.join(" → "), seq: r.seq, k: r.seq.join(">") }); solved = true; timer?.stop(); correct++; score += Math.max(40, 150 - tries * 30) + (timer ? Math.round(30 * timer.left() / RT) : 0); ts.push(setTimeout(next, 1300)); }, onMistake: () => { tries++; mistakes++; } });
    if (RT) timer = timerBar(RT, () => { if (solved) return; logAns("order", r.title, false, { a: r.seq.join(" → "), seq: r.seq, k: r.seq.join(">"), pick: "Hết giờ" }); mistakes++; Sfx.wrong(); toast(`Hết giờ! Thứ tự đúng: ${r.seq.join(" → ")}`, 2600); ts.push(setTimeout(next, 2600)); });
    root.append(h("div", { class: "qcard" }, h("div", { class: "qmeta" }, `Dãy ${i + 1} / ${rounds.length} · ${r.seq.length} mục`), h("h2", { class: "qtext" }, r.title)),
      timer ? timer.el : "", h("p", { class: "tip" }, "Chụm tay nhặt thẻ rồi thả vào ô số, hoặc chọn lần lượt các thẻ theo thứ tự. Chọn một ô đã xếp để trả thẻ về. Ô xanh là đã đúng vị trí."), b.el);
  }
  function next() { i++; i >= rounds.length ? Result(g, { score, correct, total: correct + mistakes, label: "Đúng ngay / số lần nộp", stars: mistakes === 0 ? 3 : mistakes <= rounds.length ? 2 : 1, note: `Hoàn thành ${rounds.length} dãy trong ${fmtTime((performance.now() - t0) / 1000)}` }) : render(); }
  frameHooks.add(now => hud({ progress: prog(i + 1, rounds.length, "Dãy"), score, extra: `Thời gian <b>${fmtTime((now - t0) / 1000)}</b>` }));
  render(); return () => { timer?.stop(); ts.forEach(clearTimeout); };
}

/* ================= 8. CHẠM BONG BÓNG ================= */
function gameBubble(st, data, g) {
  const qs = pickN(data.quiz, Math.min(G("bubble", "count"), data.quiz.length)).map(shuffleQ), QT = G("bubble", "time"), LIVES = G("bubble", "lives"), SPD = SPEED_F[G("bubble", "speed")] || 1;
  let i = 0, score = 0, correct = 0, lives = LIVES, bubbles = [], qStart = 0, busy = true; const ts = [];
  const qText = h("h2", { class: "qtext" }), qMeta = h("div", { class: "qmeta" }), arena = h("div", { class: "arena" });
  st.append(h("div", { class: "game" }, h("div", { class: "qcard" }, qMeta, qText), arena));
  function spawn() {
    bubbles.forEach(b => b.el.remove()); bubbles = [];
    const q = qs[i], W = arena.clientWidth, H = arena.clientHeight, n = q.opts.length, lanes = shuffle([...Array(n).keys()]), speed = SPD * H / (7.5 - Math.min(3, i * .25));
    qMeta.textContent = `Câu ${i + 1} / ${qs.length}`; qText.textContent = q.q;
    q.opts.forEach((txt, k) => {
      const d = clamp(90 + txt.length * 5, 120, Math.min(210, W / n - 8)), el = h("div", { class: "bubble", style: `width:${d}px;height:${d}px;--c:${COLORS[k % 6]}` }, txt);
      arena.append(el); bubbles.push({ k, d, el, x0: (lanes[k] + .5) * W / n, x: 0, y: H + d / 2 + k * 90 + Math.random() * 60, vy: speed * rand(.85, 1.15), ph: Math.random() * 6, alive: true });
    });
    qStart = performance.now(); busy = false;
  }
  function next(delay) { busy = true; ts.push(setTimeout(() => { i++; if (lives <= 0 || i >= qs.length) Result(g, { score, correct, total: qs.length, note: lives <= 0 ? `Hết mạng ở câu ${i}/${qs.length}` : `Còn lại ${lives} mạng` }); else spawn(); }, delay)); }
  const reveal = () => bubbles.forEach(o => o.el.classList.add(o.k === qs[i].ans ? "reveal" : "fade"));
  function hit(b) {
    const q = qs[i]; logQuiz(q, b.k); b.alive = false; b.el.classList.add("popped"); Sfx.pop(); FX.burstEl(b.el, b.k === q.ans ? 30 : 10);
    if (b.k === q.ans) { correct++; score += 100 + Math.round(60 * Math.max(0, 1 - (performance.now() - qStart) / 1000 / QT)); Sfx.right(); bubbles.forEach(o => o.alive && o.el.classList.add("fade")); next(900); }
    else { lives--; Sfx.wrong(); reshake(arena); arena.classList.remove("hurt"); void arena.offsetWidth; arena.classList.add("hurt"); if (lives <= 0) { reveal(); next(1500); } }
  }
  frameHooks.add((now, dt) => {
    const left = busy ? 0 : Math.max(0, QT - (now - qStart) / 1000);
    hud({ progress: prog(i + 1, qs.length), score, extra: `${heartHTML(lives, LIVES)} <b>${busy ? "" : Math.ceil(left) + "s"}</b>` });
    const H = arena.clientHeight, ar = arena.getBoundingClientRect(), ptrs = allPointers(now);
    for (const b of bubbles) {
      if (!b.alive) continue;
      b.y -= b.vy * dt * (busy ? .3 : 1); if (b.y < -b.d / 2) b.y = H + b.d / 2 + Math.random() * 80;
      b.x = b.x0 + Math.sin(now / 800 + b.ph) * 22; b.el.style.transform = `translate(${b.x - b.d / 2}px,${b.y - b.d / 2}px)`;
      if (busy || b.y > H - b.d * .35) continue;
      for (const p of ptrs) if (Math.hypot(p.x - ar.left - b.x, p.y - ar.top - b.y) < b.d / 2) { hit(b); break; }
      if (busy) break;
    }
    if (!busy && left <= 0) { lives--; Sfx.wrong(); toast("Hết giờ! Mất một mạng", 1200); logQuiz(qs[i], -1); reveal(); next(1500); }
  });
  ts.push(setTimeout(spawn, 60)); return () => ts.forEach(clearTimeout);
}

/* ================= 9. CHÉM ĐÁP ÁN ================= */
function gameSlice(st, data, g) {
  const qs = pickN(data.quiz, Math.min(G("slice", "count"), data.quiz.length)).map(shuffleQ), QT = G("slice", "time"), LIVES = G("slice", "lives"), SPD = SPEED_F[G("slice", "speed")] || 1;
  let i = 0, score = 0, correct = 0, lives = LIVES, fruits = [], qStart = 0, busy = true; const ts = [], trails = new Map(), last = new Map();
  const qText = h("h2", { class: "qtext" }), qMeta = h("div", { class: "qmeta" }), cv = h("canvas", { class: "trail" }), arena = h("div", { class: "arena" }, cv);
  st.append(h("div", { class: "game" }, h("div", { class: "qcard" }, qMeta, qText), arena));
  const cx = cv.getContext("2d");
  function launch(f, now, delay = 0) {
    const W = arena.clientWidth, H = arena.clientHeight, grav = H * 1.25;
    f.g = grav; f.x = rand(.18, .82) * W; f.y = H + f.d / 2; f.vx = (W / 2 - f.x) * rand(.25, .6); f.vy = -Math.sqrt(2 * grav * H * rand(.62, .85)); f.start = now + delay; f.rot = rand(-1, 1);
  }
  function spawn() {
    fruits.forEach(f => f.el.remove()); fruits = []; const q = qs[i], now = performance.now();
    qMeta.textContent = `Câu ${i + 1} / ${qs.length}`; qText.textContent = q.q;
    q.opts.forEach((txt, k) => {
      const d = clamp(96 + txt.length * 4, 120, 190), el = h("div", { class: "fruit", style: `width:${d}px;height:${d}px;--c:${["#f97316", "#84cc16", "#ef4444", "#eab308"][k % 4]}` }, txt);
      arena.append(el); const f = { k, d, el, alive: true }; launch(f, now, k * 550); fruits.push(f);
    });
    qStart = now; busy = false;
  }
  function next(delay) { busy = true; ts.push(setTimeout(() => { i++; if (lives <= 0 || i >= qs.length) Result(g, { score, correct, total: qs.length, note: lives <= 0 ? `Hết mạng ở câu ${i}/${qs.length}` : `Còn lại ${lives} mạng` }); else spawn(); }, delay)); }
  function cut(f) {
    logQuiz(qs[i], f.k); f.alive = false; f.el.style.setProperty("--t", f.el.style.transform); f.el.classList.add("cut"); Sfx.swish(); FX.burstEl(f.el, 22);
    if (f.k === qs[i].ans) { correct++; score += 100 + Math.round(60 * Math.max(0, 1 - (performance.now() - qStart) / 1000 / QT)); Sfx.right(); next(1000); }
    else { lives--; Sfx.wrong(); arena.classList.remove("hurt"); void arena.offsetWidth; arena.classList.add("hurt"); if (lives <= 0) { fruits.forEach(o => o.k === qs[i].ans && o.el.classList.add("reveal")); next(1500); } }
  }
  const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1, t = clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1); return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
  frameHooks.add((now, dt) => {
    const left = busy ? 0 : Math.max(0, QT - (now - qStart) / 1000);
    hud({ progress: prog(i + 1, qs.length), score, extra: `${heartHTML(lives, LIVES)} <b>${busy ? "" : Math.ceil(left) + "s"}</b>` });
    const W = arena.clientWidth, H = arena.clientHeight, ar = arena.getBoundingClientRect();
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    for (const f of fruits) {
      if (!f.alive || now < f.start) { if (f.alive) f.el.style.transform = `translate(-500px,-500px)`; continue; }
      const fdt = dt * SPD; f.vy += f.g * fdt; f.x += f.vx * fdt; f.y += f.vy * fdt;
      if (f.y > H + f.d && f.vy > 0) launch(f, now, rand(200, 900));
      f.el.style.transform = `translate(${f.x - f.d / 2}px,${f.y - f.d / 2}px) rotate(${(now - f.start) / 1000 * f.rot * 60}deg)`;
    }
    cx.clearRect(0, 0, W, H);
    for (const p of allPointers(now)) {
      const x = p.x - ar.left, y = p.y - ar.top, prev = last.get(p.id); last.set(p.id, { x, y, t: now });
      const tr = trails.get(p.id) || []; tr.push({ x, y, t: now }); while (tr.length && now - tr[0].t > 180) tr.shift(); trails.set(p.id, tr);
      if (!prev || now - prev.t > 150) continue;
      const sp = Math.hypot(x - prev.x, y - prev.y) / Math.max(.008, (now - prev.t) / 1000);
      if (sp > 650 && tr.length > 1) {
        cx.lineCap = "round"; cx.lineJoin = "round";
        for (let j = 1; j < tr.length; j++) { const a = j / tr.length; cx.strokeStyle = `rgba(255,255,255,${a * .9})`; cx.lineWidth = 2 + a * 9; cx.shadowColor = "#7dd3fc"; cx.shadowBlur = 14; cx.beginPath(); cx.moveTo(tr[j - 1].x, tr[j - 1].y); cx.lineTo(tr[j].x, tr[j].y); cx.stroke(); }
        if (!busy) for (const f of fruits) if (f.alive && now >= f.start && f.y < H - f.d * .2 && segDist(f.x, f.y, prev.x, prev.y, x, y) < f.d / 2) { cut(f); if (busy) break; }
      }
    }
    if (!busy && left <= 0) { lives--; Sfx.wrong(); toast("Hết giờ! Mất một mạng", 1200); logQuiz(qs[i], -1); fruits.forEach(o => o.k === qs[i].ans && o.el.classList.add("reveal")); next(1500); }
  });
  ts.push(setTimeout(spawn, 60)); return () => ts.forEach(clearTimeout);
}

/* ================= 10. HỨNG RỔ ================= */
function gameCatch(st, data, g) {
  const cats = data.sort, rounds = pickN(cats.map((_, k) => k), Math.min(G("catch", "count"), cats.length)), ROUND = G("catch", "time"), SPD = SPEED_F[G("catch", "speed")] || 1;
  const pool = cats.flatMap((c, ci) => c.items.map(t => ({ t, ci })));
  let r = 0, score = 0, good = 0, bad = 0, items = [], rStart = 0, lastSpawn = 0, bx = null, busy = true; const ts = [];
  const banner = h("div", { class: "target-banner" }), arena = h("div", { class: "arena" }), basket = h("div", { class: "basket" }, "RỔ");
  arena.append(basket); st.append(h("div", { class: "game" }, h("div", { class: "qcard" }, h("div", { class: "qmeta" }, "Hứng các thẻ thuộc nhóm"), banner), arena));
  function startRound() {
    items.forEach(o => o.el.remove()); items = []; const c = cats[rounds[r]];
    banner.innerHTML = ""; banner.append(h("span", { class: "pill" }, c.name), h("span", { class: "muted" }, `Vòng ${r + 1}/${rounds.length} · tránh thẻ của nhóm khác`));
    rStart = performance.now(); lastSpawn = 0; busy = false; toast(`Vòng ${r + 1}: hứng thẻ nhóm “${c.name}”`, 1800);
  }
  function endRound() { busy = true; items.forEach(o => o.el.remove()); items = []; r++;
    ts.push(setTimeout(() => r >= rounds.length ? Result(g, { score, correct: good, total: good + bad, label: "Hứng đúng / tổng hứng", note: `Hứng đúng ${good} thẻ, hứng nhầm ${bad} thẻ` }) : startRound(), 900)); }
  frameHooks.add((now, dt) => {
    const left = busy ? 0 : Math.max(0, ROUND - (now - rStart) / 1000);
    hud({ progress: `Vòng <b>${Math.min(r + 1, rounds.length)}/${rounds.length}</b>`, score, extra: `Còn <b>${Math.ceil(left)}s</b>` });
    const W = arena.clientWidth, H = arena.clientHeight, ar = arena.getBoundingClientRect(), bw = clamp(W * .2, 150, 240);
    basket.style.width = bw + "px";
    const pp = primaryPointer(now); const tx = pp ? clamp(pp.x - ar.left, bw / 2, W - bw / 2) : W / 2;
    bx = bx == null ? tx : bx + (tx - bx) * .5; basket.style.transform = `translateX(${bx - bw / 2}px)`;
    if (busy) return;
    const target = rounds[r];
    if (now - lastSpawn > (950 - Math.min(400, (now - rStart) * .012)) / SPD) {
      lastSpawn = now;
      const src = Math.random() < .5 ? pool.filter(o => o.ci === target) : pool.filter(o => o.ci !== target), it = src[Math.random() * src.length | 0];
      const el = h("div", { class: "fall" }, it.t); arena.append(el);
      items.push({ ...it, el, x: rand(.08, .92) * W, y: -30, vy: SPD * H / rand(3.2, 4.6), w: 0 });
    }
    const top = H - 12 - 74;
    for (const o of items) {
      if (!o.el) continue;
      o.y += o.vy * dt; if (!o.w) o.w = o.el.offsetWidth;
      o.el.style.transform = `translate(${o.x - o.w / 2}px,${o.y}px)`;
      if (o.y + 40 >= top && o.y < top + 20 && Math.abs(o.x - bx) < bw / 2 + o.w * .3) {
        if (o.ci === target) { good++; score += 50; Sfx.right(); basket.classList.add("flash-ok"); FX.burst(ar.left + o.x, ar.top + top, 12); }
        else { bad++; score = Math.max(0, score - 30); Sfx.wrong(); basket.classList.add("flash-bad"); }
        setTimeout(() => basket.classList.remove("flash-ok", "flash-bad"), 250);
        o.el.remove(); o.el = null;
      } else if (o.y > H) { o.el.remove(); o.el = null; }
    }
    items = items.filter(o => o.el);
    if (left <= 0) endRound();
  });
  ts.push(setTimeout(startRound, 60)); return () => ts.forEach(clearTimeout);
}

/* ================= 11. Ô CHỮ BÍ ẨN ================= */
function gameWord(st, data, g) {
  const ws = pickN(data.words, Math.min(G("word", "count"), data.words.length)), MAXW = G("word", "wrong"), WT = G("word", "time"); let timer = null;
  let i = 0, score = 0, correct = 0, wrong = 0, guessed, done = false, slots = [], keys = {}, pips; const ts = [];
  const root = h("div", { class: "game" }); st.append(root);
  const upd = () => hud({ progress: prog(i + 1, ws.length, "Từ"), score });
  function render() {
    root.innerHTML = ""; guessed = new Set(); wrong = 0; done = false; keys = {}; upd(); const w = ws[i];
    timer?.stop(); timer = WT ? timerBar(WT, () => { if (!done) { toast("Hết giờ!", 1200); finish(false); } }) : null;
    const sw = h("div", { class: "slots" });
    slots = [...w.w].map(c => { const b = baseChar(c), isL = /[A-Z]/.test(b); const el = isL ? h("div", { class: "slot" }) : c === " " ? h("div", { class: "slot gap" }) : h("div", { class: "slot open" }, c); el._c = c; el._b = isL ? b : null; sw.append(el); return el; });
    pips = h("div", { class: "pips" }); const kb = h("div", { class: "kb" });
    ["ABCDEFGHI", "JKLMNOPQR", "STUVWXYZ"].forEach(row => { const r = h("div", { class: "kb-row" }); [...row].forEach(ch => { const k = on(h("button", { class: "key", "data-hit": true }, ch), () => guess(ch)); keys[ch] = k; r.append(k); }); kb.append(r); });
    root.append(h("div", { class: "qcard" }, h("div", { class: "qmeta" }, `Ô chữ ${i + 1} / ${ws.length} · ${slots.filter(s => s._b).length} chữ cái`), h("div", { class: "hint" }, "Gợi ý: " + w.hint)),
      timer ? timer.el : "", sw, pips, kb, h("div", { class: "row", style: "justify-content:center" }, on(h("button", { class: "btn sm", "data-hit": true }, "Bỏ qua từ này"), () => { if (!done) finish(false); })));
    drawPips();
  }
  function drawPips() { pips.innerHTML = "Lượt sai còn lại " + [...Array(MAXW)].map((_, k) => `<i class="${k < MAXW - wrong ? "" : "off"}"></i>`).join(""); }
  function guess(ch) {
    if (done || guessed.has(ch)) return; guessed.add(ch); const k = keys[ch]; k.disabled = true;
    const hits = slots.filter(s => s._b === ch);
    if (hits.length) { k.classList.add("hit"); Sfx.right(); hits.forEach(s => { s.textContent = s._c; s.classList.add("open"); }); if (slots.every(s => !s._b || s.classList.contains("open"))) finish(true); }
    else { k.classList.add("miss"); wrong++; Sfx.wrong(); drawPips(); if (wrong >= MAXW) finish(false); }
  }
  function finish(ok) {
    done = true; timer?.stop(); Object.values(keys).forEach(k => k.disabled = true); logAns("words", ws[i].hint, ok, { a: ws[i].w, h: ws[i].hint, k: ws[i].w });
    slots.forEach(s => { if (s._b && !s.classList.contains("open")) { s.textContent = s._c; s.classList.add("miss"); } });
    if (ok) { correct++; score += 100 + (MAXW - wrong) * 15; FX.rain(); Sfx.win(); } else Sfx.wrong();
    upd(); ts.push(setTimeout(() => { i++; i >= ws.length ? Result(g, { score, correct, total: ws.length, label: "Giải được" }) : render(); }, 2000));
  }
  const kd = e => { if (screenName !== "game") return; const c = baseChar(e.key || ""); if (/^[A-Z]$/.test(c) && keys[c] && !keys[c].disabled) guess(c); };
  addEventListener("keydown", kd); render();
  return () => { timer?.stop(); ts.forEach(clearTimeout); removeEventListener("keydown", kd); };
}

/* ================= 12. XẾP CHỮ ================= */
function gameScramble(st, data, g) {
  const ws = pickN(data.words, Math.min(G("scramble", "count"), data.words.length)), WT = G("scramble", "time"), HINT = G("scramble", "hint");
  let i = 0, score = 0, correct = 0, mistakes = 0, pen = 0, timer = null, solved = false; const ts = [];
  const root = h("div", { class: "game" }); st.append(root);
  function render() {
    const w = ws[i]; root.innerHTML = ""; pen = 0; solved = false; timer?.stop();
    const letters = [], gaps = new Set();
    [...w.w].forEach(c => { if (c === " ") { if (letters.length) gaps.add(letters.length - 1); } else letters.push(c); });
    const b = seqBoard({ answer: letters, letters: true, gapsAfter: gaps, onSolved: () => { logAns("words", w.hint, pen === 0, { a: w.w, h: w.hint, k: w.w }); solved = true; timer?.stop(); correct++; score += Math.max(30, 120 + letters.length * 5 - pen); ts.push(setTimeout(next, 1400)); }, onMistake: () => { mistakes++; pen += 25; } });
    const hintB = HINT ? on(h("button", { class: "btn sm", "data-hit": true }, "Gợi ý một chữ (−20 điểm)"), () => { if (b.hint()) { pen += 20; Sfx.tick(); } }) : null;
    timer = WT ? timerBar(WT, () => { if (solved) return; logAns("words", w.hint, false, { a: w.w, h: w.hint, k: w.w, pick: "Hết giờ" }); mistakes++; Sfx.wrong(); toast(`Hết giờ! Từ đúng: ${w.w}`, 2400); ts.push(setTimeout(next, 2400)); }) : null;
    const skip = on(h("button", { class: "btn sm", "data-hit": true }, "Bỏ qua"), () => { timer?.stop(); logAns("words", w.hint, false, { a: w.w, h: w.hint, k: w.w, pick: "Bỏ qua" }); mistakes++; next(); });
    root.append(h("div", { class: "qcard" }, h("div", { class: "qmeta" }, `Từ ${i + 1} / ${ws.length} · ${letters.length} chữ cái`), h("div", { class: "hint" }, "Gợi ý: " + w.hint)), timer ? timer.el : "", b.el, h("div", { class: "row", style: "justify-content:center" }, hintB, skip));
  }
  function next() { i++; i >= ws.length ? Result(g, { score, correct, total: ws.length, label: "Ghép được" }) : render(); }
  frameHooks.add(() => hud({ progress: prog(i + 1, ws.length, "Từ"), score }));
  render(); return () => { timer?.stop(); ts.forEach(clearTimeout); };
}

/* ================= 13. KÉO CO 2 ĐỘI ================= */
function gameTug(st, data, g) {
  const qs = pickN(data.quiz, Math.min(G("tug", "count"), data.quiz.length)).map(shuffleQ), WIN = G("tug", "win"), QT = G("tug", "time");
  let i = 0, pos = 0, sc = { L: 0, R: 0 }, cor = { L: 0, R: 0 }, locked, done = false, timer; const ts = [];
  const root = h("div", { class: "game tug" }); st.append(root);
  const knot = h("div", { class: "knot", style: `--step:${40 / WIN}cqw` });
  const rope = h("div", { class: "rope-wrap" }, h("div", { class: "rope-zone l" }), h("div", { class: "rope-zone r" }), h("div", { class: "rope" }), h("div", { class: "midline" }), knot);
  const qbox = h("div", { class: "qcard" }), tb = h("div"), teams = h("div", { class: "teams" });
  root.append(rope, qbox, tb, teams);
  const upd = () => hud({ progress: prog(i + 1, qs.length), score: null, extra: `<span class="tx-l">Xanh <b>${sc.L}</b></span> · <span class="tx-r">Đỏ <b>${sc.R}</b></span>` });
  function render() {
    const q = qs[i]; locked = { L: false, R: false }; done = false; upd();
    qbox.innerHTML = ""; qbox.append(h("div", { class: "qmeta" }, `Câu ${i + 1} / ${qs.length} · kéo ${WIN} nấc để thắng`), h("h2", { class: "qtext" }, q.q));
    timer?.stop(); timer = timerBar(QT, () => resolve(null)); tb.innerHTML = ""; tb.append(timer.el);
    teams.innerHTML = "";
    ["L", "R"].forEach(side => {
      const btns = answerButtons(q, k => pick(side, k, btns));
      const panel = h("div", { class: "team " + side.toLowerCase() }, h("div", { class: "team-head" }, side === "L" ? "Đội Xanh" : "Đội Đỏ", h("b", {}, `${sc[side]} điểm`)), h("div", { class: "answers" }, btns));
      panel._btns = btns; teams.append(panel);
    });
  }
  function pick(side, k, btns) {
    if (done || locked[side]) return; const q = qs[i];
    if (k === q.ans) { resolve(side, k); return; }
    locked[side] = true; btns[k].classList.add("is-wrong"); reshake(btns[k]); Sfx.wrong();
    teams.children[side === "L" ? 0 : 1].classList.add("locked"); btns.forEach(b => b.classList.add("is-locked"));
    if (locked.L && locked.R) resolve(null);
  }
  function resolve(side, k) {
    if (done) return; done = true; timer.stop(); const q = qs[i]; logAns("quiz", q.q, !!side, { a: q.opts[q.ans], o: q.opts, pick: side ? null : "Không đội nào đúng" });
    [...teams.children].forEach(p => markAnswers(p._btns, q.ans, -1));
    if (side) { sc[side] += 100; cor[side]++; pos += side === "L" ? -1 : 1; knot.style.setProperty("--pos", pos); Sfx.right(); Sfx.swish();
      const p = teams.children[side === "L" ? 0 : 1]; p.classList.add("win"); FX.burstEl(p._btns[k], 30); }
    else { toast(k === undefined ? "Hết giờ! Không đội nào ghi điểm" : "Cả hai đội đều sai", 1400); }
    upd();
    ts.push(setTimeout(() => { i++; if (Math.abs(pos) >= WIN || i >= qs.length) end(); else render(); }, 1700));
  }
  function end() {
    const w = pos < 0 ? "L" : pos > 0 ? "R" : sc.L > sc.R ? "L" : sc.R > sc.L ? "R" : null;
    Result(g, { score: Math.max(sc.L, sc.R), correct: cor.L + cor.R, total: i, stars: 3, noRecord: true,
      title: w ? `Đội ${w === "L" ? "Xanh" : "Cam"} chiến thắng!` : "Hai đội hòa nhau!",
      note: `Sau ${i} câu hỏi, sợi dây dừng ở nấc ${Math.abs(pos)} về phía ${pos < 0 ? "đội Xanh" : pos > 0 ? "đội Đỏ" : "giữa"}.`,
      stats: [["Đội Xanh", `${sc.L} điểm`], ["Đội Đỏ", `${sc.R} điểm`], ["Số câu", i]] });
  }
  render(); return () => { timer?.stop(); ts.forEach(clearTimeout); };
}


/* ==========================================================
   10 TRÒ CHƠI MỚI (bản 4.8)
   14 Ai là triệu phú · 15 Vòng quay may mắn · 16 Đua xe tri thức · 17 Bingo
   18 Đập chuột · 19 Ném bóng rổ · 20 Xây tháp · 21 Tìm chữ · 22 Bấm chuông · 23 Bom hẹn giờ
   ========================================================== */
const hurt = el => { el.classList.remove("hurt"); void el.offsetWidth; el.classList.add("hurt"); };
const tfAsQ = t => ({ q: t.s, opts: ["Đúng", "Sai"], ans: t.v ? 0 : 1, tf: true });
/* các cặp “gợi ý → đáp án” gom từ trắc nghiệm, nối cặp và từ khóa (dùng cho Bingo) */
function clueItems(d) {
  const seen = new Set(), out = [];
  const add = (c, a) => { const k = normTxt(a).toLowerCase(); if (!c || !a || seen.has(k) || a.length > 40) return; seen.add(k); out.push({ c, a }); };
  d.quiz.forEach(q => add(q.q, q.opts[q.ans])); d.match.forEach(m => add(m.b, m.a)); d.words.forEach(w => add(w.hint, w.w));
  return out;
}

/* ================= 14. AI LÀ TRIỆU PHÚ ================= */
const LADDER = [100, 200, 300, 500, 800, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6500, 8000, 10000];
function gameMillionaire(st, data, g) {
  const N = Math.min(G("millionaire", "count"), data.quiz.length), pool = pickN(data.quiz, data.quiz.length).map(shuffleQ);
  const qs = pool.slice(0, N), spare = pool.slice(N), QT = G("millionaire", "time"), LIFE = G("millionaire", "life");
  const ladder = LADDER.slice(0, N), safeAt = new Set(ladder.map((_, k) => k).filter(k => (k + 1) % 5 === 0 && k < N - 1));
  let lv = 0, locked = false, timer = null, btns = [], over = false; const used = { half: !LIFE, poll: !LIFE, swap: !LIFE || !spare.length }, ts = [];
  const main = h("div", { class: "mil-main" }), lad = h("ol", { class: "mil-ladder" });
  st.append(h("div", { class: "game mil" }, main, lad));
  const safe = () => { let s = 0; for (let k = 0; k < lv; k++) if (safeAt.has(k)) s = ladder[k]; return s; };
  const won = () => lv ? ladder[lv - 1] : 0;
  function paintLadder() {
    lad.innerHTML = "";
    ladder.forEach((v, k) => lad.prepend(h("li", { class: (k === lv ? "cur " : "") + (k < lv ? "done " : "") + (safeAt.has(k) || k === N - 1 ? "safe" : "") }, h("span", {}, k + 1), h("b", {}, vi(v)))));
  }
  const upd = () => hud({ progress: prog(lv + 1, N), score: won(), extra: `Mốc an toàn <b>${vi(safe())}</b>` });
  function render() {
    const q = qs[lv]; locked = false; main.innerHTML = ""; paintLadder(); upd();
    btns = answerButtons(q, k => choose(k));
    timer?.stop(); timer = QT ? timerBar(QT, () => choose(-1)) : null;
    const life = (key, label, title, fn) => { const b = on(h("button", { class: "life", "data-hit": true, title, disabled: used[key] }, label), () => { if (locked || used[key]) return; used[key] = true; b.disabled = true; Sfx.swish(); fn(); }); return b; };
    const poll = h("div", { class: "poll", hidden: true });
    main.append(
      h("div", { class: "qcard" }, h("div", { class: "qmeta" }, `Câu ${lv + 1} / ${N} · trị giá ${vi(ladder[lv])} điểm${safeAt.has(lv) ? " · MỐC AN TOÀN" : ""}`), h("h2", { class: "qtext" }, q.q)),
      timer ? timer.el : "", poll, h("div", { class: "answers" }, btns),
      h("div", { class: "mil-tools" },
        life("half", "50 : 50", "Bỏ đi hai đáp án sai", () => {
          shuffle(btns.map((_, k) => k).filter(k => k !== q.ans)).slice(0, Math.max(0, q.opts.length - 2)).forEach(k => btns[k].classList.add("is-locked", "is-gone"));
        }),
        life("poll", "Hỏi ý kiến lớp", "Xem cả lớp bình chọn", () => {
          const alive = btns.map((b, k) => k).filter(k => !btns[k].classList.contains("is-gone"));
          const w = alive.map(k => k === q.ans ? rand(45, 75) : rand(5, 30)), sum = w.reduce((a, b) => a + b, 0);
          poll.hidden = false; poll.innerHTML = "";
          alive.forEach((k, j) => { const pct = Math.round(w[j] / sum * 100); poll.append(h("div", { class: "pbar" }, h("i", { style: `height:${pct}%;--c:${COLORS[k]}` }), h("b", {}, pct + "%"), h("small", {}, "ABCD"[k]))); });
        }),
        life("swap", "Đổi câu hỏi", "Đổi sang một câu hỏi khác cùng mức", () => { qs[lv] = spare.shift(); render(); }),
        h("span", { class: "grow" }),
        on(h("button", { class: "btn", "data-hit": true, "data-hold": true, title: "Giữ tay trên nút để dừng" }, `Dừng cuộc chơi · giữ ${vi(won())} điểm`), () => { if (!locked) finish("stop"); })));
  }
  function choose(k) {
    if (locked) return; locked = true; timer?.stop(); const q = qs[lv]; logQuiz(q, k);
    if (k >= 0) { btns[k].classList.add("is-sel"); Sfx.tone(330, .5, "triangle", .08); }
    ts.push(setTimeout(() => {
      markAnswers(btns, q.ans, k);
      if (k === q.ans) { Sfx.right(); FX.burstEl(btns[k], 30); lv++; upd(); ts.push(setTimeout(() => lv >= N ? finish("win") : render(), 1500)); }
      else { Sfx.wrong(); if (k >= 0) reshake(btns[k]); else toast("Hết giờ!", 1200); ts.push(setTimeout(() => finish("lose"), 1900)); }
    }, k >= 0 ? 1100 : 0));
  }
  function finish(how) {
    if (over) return; over = true; timer?.stop();
    const score = how === "lose" ? safe() : won();
    Result(g, { score, correct: lv, total: N, label: "Vượt qua", stars: how === "win" ? 3 : lv >= N * .6 ? 2 : lv > 0 ? 1 : 0,
      title: how === "win" ? "Chinh phục đỉnh cao!" : how === "stop" ? "Dừng cuộc chơi an toàn" : undefined,
      note: how === "win" ? `Trả lời đúng cả ${N} câu, giành ${vi(score)} điểm.` : how === "stop" ? `Dừng ở câu ${lv + 1}, giữ ${vi(score)} điểm.` : `Dừng ở câu ${lv + 1}. Nhận điểm mốc an toàn: ${vi(score)}.` });
  }
  render(); return () => { timer?.stop(); ts.forEach(clearTimeout); };
}

/* ================= 15. VÒNG QUAY MAY MẮN ================= */
function gameWheel(st, data, g) {
  const N = Math.min(G("wheel", "count"), data.quiz.length), qs = pickN(data.quiz, N).map(shuffleQ), QT = G("wheel", "time"), RISK = G("wheel", "risk");
  const segs = (RISK ? [100, 300, 200, 500, "lose", 400, 200, "x2", 300, "star"] : [100, 300, 200, 500, 250, 400, 200, 600, 300, "star"]);
  const segLabel = v => v === "lose" ? "MẤT LƯỢT" : v === "x2" ? "×2" : v === "star" ? "★ 1000" : String(v);
  const SEG = 360 / segs.length, R = 160;
  let i = 0, score = 0, correct = 0, ang = Math.random() * 360, vel = 0, settle = null, phase = "wheel", lastIdx = -1, timer = null; const ts = [];
  const pt = (a, r) => [200 + r * Math.sin(a * Math.PI / 180), 200 - r * Math.cos(a * Math.PI / 180)];
  let paths = "";
  segs.forEach((v, k) => {
    const a0 = k * SEG, a1 = a0 + SEG, [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), [tx, ty] = pt(a0 + SEG / 2, R * .6);
    const fill = v === "lose" ? "#1f2937" : v === "x2" ? "#a855f7" : v === "star" ? "#facc15" : ["#38bdf8", "#fb7185", "#a3e635", "#a78bfa", "#2dd4bf", "#0066FF"][k % 6];
    paths += `<path d="M200 200L${x0} ${y0}A${R} ${R} 0 0 1 ${x1} ${y1}Z" fill="${fill}" stroke="#0b1220" stroke-width="3"/>`;
    paths += `<text x="${tx}" y="${ty}" transform="rotate(${a0 + SEG / 2 - 90} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" fill="${v === "lose" ? "#fff" : "#0b1220"}" font-size="${String(segLabel(v)).length > 5 ? 16 : 24}" font-weight="800" font-family="Lexend,sans-serif">${segLabel(v)}</text>`;
  });
  for (let k = 0; k < segs.length; k++) { const [x, y] = pt(k * SEG, R + 9); paths += `<circle cx="${x}" cy="${y}" r="4.5" fill="#fff"/>`; }
  const disc = h("div", { class: "wheel-disc", html: `<svg viewBox="0 0 400 400"><circle cx="200" cy="200" r="${R + 16}" fill="#0b1220"/>${paths}<circle cx="200" cy="200" r="30" fill="#0b1220" stroke="#fff" stroke-width="4"/></svg>` });
  const wheel = h("div", { class: "wheel" }, disc, h("div", { class: "wheel-ptr" }));
  const spinBtn = on(h("button", { class: "btn primary lg", "data-hit": true }, "Quay"), () => spin(rand(720, 1100) * (Math.random() < .5 ? 1 : -1)));
  const info = h("div", { class: "wheel-info" });
  const stage = h("div", { class: "wheel-stage" }, wheel, h("div", { class: "wheel-side" }, info, h("p", { class: "tip" }, "Vuốt tay thật nhanh qua vòng quay để quay, hoặc chọn nút Quay."), spinBtn));
  const qbox = h("div", { class: "game", hidden: true }), root = h("div", { class: "game" }, stage);
  st.append(root, qbox);
  const upd = () => hud({ progress: prog(i + 1, N, "Lượt"), score });
  function showWheel() {
    phase = "wheel"; root.hidden = false; qbox.hidden = true; spinBtn.disabled = false; upd();
    info.innerHTML = ""; info.append(h("div", { class: "qmeta" }, `Lượt ${i + 1} / ${N}`), h("h2", {}, "Quay để chọn giá trị câu hỏi"), h("p", { class: "muted" }, RISK ? "Có ô ×2 tổng điểm, ô ★ 1000 điểm và ô MẤT LƯỢT." : "Có ô ★ 1000 điểm."));
  }
  function spin(v) { if (phase !== "wheel") return; phase = "spin"; vel = clamp(Math.abs(v), 600, 1500) * Math.sign(v || 1); spinBtn.disabled = true; Sfx.swish(); }
  function land() {
    const idx = Math.floor((((-ang) % 360 + 360) % 360) / SEG) % segs.length, v = segs[idx];
    phase = "landed"; Sfx.win();
    info.innerHTML = ""; info.append(h("div", { class: "qmeta" }, "Kết quả vòng quay"), h("h2", { class: "wheel-res" }, segLabel(v)));
    if (v === "lose") { toast("MẤT LƯỢT! Câu hỏi này bị bỏ qua", 1800); Sfx.wrong(); ts.push(setTimeout(next, 1800)); return; }
    ts.push(setTimeout(() => ask(v), 1000));
  }
  function ask(v) {
    phase = "q"; root.hidden = true; qbox.hidden = false; qbox.innerHTML = ""; const q = qs[i]; let locked = false;
    const worth = v === "star" ? 1000 : v === "x2" ? Math.max(200, score) : v;
    const btns = answerButtons(q, k => pick(k)); timer = timerBar(QT, () => pick(-1));
    qbox.append(h("div", { class: "qcard" }, h("div", { class: "qmeta" }, `Lượt ${i + 1} / ${N} · ${v === "x2" ? `×2: đúng thì nhân đôi tổng điểm (+${vi(worth)})` : `trị giá ${vi(worth)} điểm`}`), h("h2", { class: "qtext" }, q.q)), timer.el, h("div", { class: "answers" }, btns));
    function pick(k) {
      if (locked) return; locked = true; timer.stop(); markAnswers(btns, q.ans, k); logQuiz(q, k);
      if (k === q.ans) { correct++; score += worth; Sfx.right(); FX.burstEl(btns[k], 36); } else { Sfx.wrong(); if (k >= 0) reshake(btns[k]); else toast("Hết giờ!", 1200); }
      upd(); ts.push(setTimeout(next, 1500));
    }
  }
  function next() { i++; if (i >= N) Result(g, { score, correct, total: N }); else showWheel(); }
  frameHooks.add((now, dt) => {
    if (phase === "wheel") {
      const r = disc.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      for (const p of allPointers(now)) {
        const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
        if (d > r.width / 2 || d < r.width * .12 || p.vx == null) continue;
        const w = (dx * p.vy - dy * p.vx) / (d * d) * 180 / Math.PI; // vận tốc góc (độ/giây)
        if (Math.abs(w) > 260) { spin(w * 1.6); break; }
      }
    }
    if (phase === "spin") {
      ang += vel * dt; vel *= Math.exp(-dt * .8); if (Math.abs(vel) < 90) vel *= Math.exp(-dt * 2);
      const idx = Math.floor((((-ang) % 360 + 360) % 360) / SEG);
      if (idx !== lastIdx) { lastIdx = idx; Sfx.tone(1400, .03, "square", .04); }
      if (Math.abs(vel) < 12) { vel = 0; const idx2 = Math.floor((((-ang) % 360 + 360) % 360) / SEG); settle = ang + ((((-ang) % 360 + 360) % 360) - (idx2 + .5) * SEG); land(); }
    } else if (settle != null) { ang += (settle - ang) * Math.min(1, dt * 8); if (Math.abs(settle - ang) < .05) { ang = settle; settle = null; } }
    disc.style.transform = `rotate(${ang}deg)`;
  });
  showWheel(); return () => { timer?.stop(); ts.forEach(clearTimeout); };
}

/* ================= 16. ĐUA XE TRI THỨC ================= */
const CAR_SVG = '<svg viewBox="0 0 60 100"><rect x="6" y="6" width="48" height="88" rx="18" fill="var(--car,#fb7185)"/><rect x="13" y="24" width="34" height="20" rx="6" fill="#0b1220" opacity=".8"/><rect x="13" y="62" width="34" height="14" rx="5" fill="#0b1220" opacity=".6"/><rect x="0" y="16" width="8" height="18" rx="3" fill="#111"/><rect x="52" y="16" width="8" height="18" rx="3" fill="#111"/><rect x="0" y="66" width="8" height="18" rx="3" fill="#111"/><rect x="52" y="66" width="8" height="18" rx="3" fill="#111"/><circle cx="17" cy="9" r="3.5" fill="#fef9c3"/><circle cx="43" cy="9" r="3.5" fill="#fef9c3"/></svg>';
function gameRace(st, data, g) {
  const qs = pickN(data.quiz, Math.min(G("race", "count"), data.quiz.length)).map(shuffleQ), QT = G("race", "time"), LIVES = G("race", "lives"), SPD = SPEED_F[G("race", "speed")] || 1;
  let i = 0, score = 0, correct = 0, streak = 0, lives = LIVES, gy = 0, busy = true, carX = null, lane = 0, road = 0, keyLane = null, qStart = 0; const ts = [];
  const qMeta = h("div", { class: "qmeta" }), qText = h("h2", { class: "qtext" });
  const gates = h("div", { class: "gates" }), car = h("div", { class: "car", html: CAR_SVG }), arena = h("div", { class: "arena road" }, gates, car);
  st.append(h("div", { class: "game" }, h("div", { class: "qcard" }, qMeta, qText), arena));
  function spawn() {
    const q = qs[i]; qMeta.textContent = `Câu ${i + 1} / ${qs.length} · lái xe vào làn có đáp án đúng`; qText.textContent = q.q;
    gates.innerHTML = ""; gates.style.setProperty("--n", q.opts.length); $$(".lane-line", arena).forEach(x => x.remove());
    for (let k = 1; k < q.opts.length; k++) arena.prepend(h("div", { class: "lane-line", style: `left:${k / q.opts.length * 100}%` }));
    q.opts.forEach((o, k) => gates.append(h("div", { class: `gate ans-${k}` }, h("span", { class: "ans-key" }, "ABCD"[k]), h("span", {}, o))));
    gy = -gates.offsetHeight - 10; gates.classList.remove("pass-ok", "pass-bad"); busy = false; qStart = performance.now();
  }
  function judge() {
    busy = true; const q = qs[i], ok = lane === q.ans, gEls = [...gates.children]; logQuiz(q, lane);
    gEls[q.ans].classList.add("is-right"); if (!ok) gEls[lane]?.classList.add("is-wrong");
    if (ok) { correct++; streak++; score += 100 + Math.min(streak - 1, 5) * 20; Sfx.right(); FX.burstEl(car, 26); }
    else { streak = 0; lives--; Sfx.wrong(); Sfx.noise?.(.3, .15, 600); hurt(arena); car.classList.remove("crash"); void car.offsetWidth; car.classList.add("crash"); }
    ts.push(setTimeout(() => { i++; if (lives <= 0 || i >= qs.length) Result(g, { score, correct, total: qs.length, note: lives <= 0 ? `Hết mạng ở câu ${i}/${qs.length}` : `Về đích, còn ${lives} mạng` }); else spawn(); }, 1300));
  }
  const kd = e => { if (screenName !== "game") return; const n = qs[i]?.opts.length || 4;
    if (/^[1-4]$/.test(e.key) && +e.key <= n) keyLane = +e.key - 1; else if (e.key === "ArrowLeft") keyLane = Math.max(0, (keyLane ?? lane) - 1); else if (e.key === "ArrowRight") keyLane = Math.min(n - 1, (keyLane ?? lane) + 1); };
  addEventListener("keydown", kd);
  frameHooks.add((now, dt) => {
    const W = arena.clientWidth, H = arena.clientHeight, ar = arena.getBoundingClientRect(), n = qs[i]?.opts.length || 4, lw = W / n, cw = clamp(lw * .34, 46, 70);
    const left = busy ? 0 : Math.max(0, QT / SPD - (now - qStart) / 1000);
    hud({ progress: prog(i + 1, qs.length), score, extra: `${heartHTML(lives, LIVES)} <b>${busy ? "" : Math.ceil(left) + "s"}</b>` });
    const pp = primaryPointer(now);
    if (pp && now - (pp.t ?? now) < 1500 && pp.x > ar.left - 40 && pp.x < ar.right + 40) keyLane = null;
    const laneOf = x => clamp(Math.floor(x / lw), 0, n - 1), tx = (keyLane != null ? keyLane : pp ? laneOf(pp.x - ar.left) : laneOf(carX ?? W / 2 - 1) + 0) * lw + lw / 2;
    carX = carX == null ? tx : carX + (tx - carX) * Math.min(1, dt * 12);
    lane = clamp(Math.floor(carX / lw), 0, n - 1);
    const tilt = clamp((tx - carX) * .25, -18, 18);
    car.style.width = cw + "px"; car.style.transform = `translate(${carX - cw / 2}px,0) rotate(${tilt}deg)`;
    [...gates.children].forEach((gEl, k) => gEl.classList.toggle("lane-on", k === lane && !busy));
    road += (busy ? 140 : 320 * SPD) * dt; arena.style.setProperty("--road", (road % 80) + "px");
    if (busy) return;
    const carTop = H - car.offsetHeight - 18, total = carTop + gates.offsetHeight;
    gy = -gates.offsetHeight + total * Math.min(1, (now - qStart) / 1000 / (QT / SPD));
    gates.style.transform = `translateY(${gy}px)`;
    if (gy + gates.offsetHeight >= carTop) judge();
  });
  ts.push(setTimeout(spawn, 80));
  return () => { ts.forEach(clearTimeout); removeEventListener("keydown", kd); };
}

/* ================= 17. BINGO ================= */
function gameBingo(st, data, g) {
  const all = clueItems(data); let N = +G("bingo", "size"); while (N > 3 && all.length < N * N) N--;
  const items = pickN(all, N * N), calls = shuffle(items.map((_, k) => k)), QT = G("bingo", "time");
  let c = 0, score = 0, correct = 0, mistakes = 0, locked = false, timer = null; const marked = new Set(), missed = new Set(), lines = new Set(), ts = [];
  const callBox = h("div", { class: "qcard bingo-call" }), tb = h("div"), board = h("div", { class: "bingo", style: `--n:${N}` });
  const cells = items.map((it, k) => { const b = h("button", { class: "bcell", "data-hit": true }, h("span", {}, it.a)); on(b, () => pick(k)); board.append(b); return b; });
  st.append(h("div", { class: "game" }, callBox, tb, board));
  const upd = () => hud({ progress: prog(c + 1, calls.length, "Lượt gọi"), score, extra: `BINGO <b>${lines.size}</b>` });
  function call() {
    locked = false; upd(); const it = items[calls[c]];
    callBox.innerHTML = ""; callBox.append(h("div", { class: "qmeta" }, `Lượt gọi ${c + 1} / ${calls.length} · tìm ô có đáp án`), h("h2", { class: "qtext" }, it.c));
    callBox.animate?.([{ transform: "scale(.96)", opacity: .4 }, { transform: "none", opacity: 1 }], { duration: 300, easing: "ease-out" });
    timer?.stop(); timer = timerBar(QT, () => { if (locked) return; locked = true; const k = calls[c]; logAns("clue", items[k].c, false, { a: items[k].a, pick: "Hết giờ" }); missed.add(k); cells[k].classList.add("is-locked", "missed"); Sfx.wrong(); toast("Hết giờ! Ô này bị bỏ lỡ", 1300); ts.push(setTimeout(next, 1400)); });
    tb.innerHTML = ""; tb.append(timer.el);
  }
  function pick(k) {
    if (locked || marked.has(k) || missed.has(k)) return;
    if (k !== calls[c]) { logAns("clue", items[calls[c]].c, false, { a: items[calls[c]].a, pick: items[k].a }); mistakes++; score = Math.max(0, score - 30); Sfx.wrong(); reshake(cells[k]); return; }
    locked = true; timer.stop(); logAns("clue", items[k].c, true, { a: items[k].a }); marked.add(k); correct++; score += 100 + Math.round(40 * timer.left() / QT);
    cells[k].classList.add("is-locked", "marked"); Sfx.right(); FX.burstEl(cells[k], 18);
    const got = checkLines(); if (got) { score += got * 300; Sfx.win(); FX.rain(); toast(got > 1 ? `BINGO ×${got}! +${got * 300} điểm` : "BINGO! +300 điểm", 1800); }
    upd(); ts.push(setTimeout(next, got ? 1500 : 800));
  }
  function checkLines() {
    const L = []; for (let r = 0; r < N; r++) { L.push([...Array(N)].map((_, j) => r * N + j)); L.push([...Array(N)].map((_, j) => j * N + r)); }
    L.push([...Array(N)].map((_, j) => j * N + j)); L.push([...Array(N)].map((_, j) => j * N + N - 1 - j));
    let got = 0; L.forEach(l => { const key = l.join(","); if (!lines.has(key) && l.every(k => marked.has(k))) { lines.add(key); got++; l.forEach(k => cells[k].classList.add("line")); } });
    return got;
  }
  function next() { c++; if (c >= calls.length) Result(g, { score, correct, total: calls.length, label: "Đánh dấu đúng", note: `Bảng ${N}×${N}: ${lines.size} hàng BINGO, chọn nhầm ${mistakes} lần` }); else call(); }
  call(); return () => { timer?.stop(); ts.forEach(clearTimeout); };
}

/* ================= 18. ĐẬP CHUỘT ================= */
const MOLE_SVG = '<svg viewBox="0 0 100 90"><ellipse cx="50" cy="60" rx="38" ry="40" fill="#a16207"/><ellipse cx="50" cy="70" rx="24" ry="22" fill="#fcd34d" opacity=".55"/><circle cx="36" cy="44" r="6" fill="#111"/><circle cx="64" cy="44" r="6" fill="#111"/><circle cx="38" cy="42" r="2" fill="#fff"/><circle cx="66" cy="42" r="2" fill="#fff"/><ellipse cx="50" cy="56" rx="8" ry="6" fill="#f472b6"/><path d="M28 58h-16M28 62l-14 4M72 58h16M72 62l14 4" stroke="#111" stroke-width="2"/></svg>';
function gameMole(st, data, g) {
  const qs = pickN(data.quiz, Math.min(G("mole", "count"), data.quiz.length)).map(shuffleQ), QT = G("mole", "time"), LIVES = G("mole", "lives"), SPD = SPEED_F[G("mole", "speed")] || 1;
  let i = 0, score = 0, correct = 0, lives = LIVES, busy = true, qStart = 0, nextPop = 0, sinceRight = 0; const ts = [], prevHole = new Map();
  const qMeta = h("div", { class: "qmeta" }), qText = h("h2", { class: "qtext" }), field = h("div", { class: "molefield" });
  const holes = [...Array(9)].map((_, k) => {
    const lab = h("div", { class: "mlabel" }), mole = h("div", { class: "mole" }, lab, h("div", { class: "mbody", html: MOLE_SVG }));
    const el = h("div", { class: "hole", "data-hit": true, "data-nodwell": true }, h("div", { class: "hback" }), h("div", { class: "hclip" }, mole), h("div", { class: "hfront" }));
    const o = { el, mole, lab, up: false, k: -1, until: 0, hit: false }; on(el, () => whack(o)); field.append(el); return o;
  });
  st.append(h("div", { class: "game" }, h("div", { class: "qcard" }, qMeta, qText), h("div", { class: "arena molearena" }, field)));
  function down(o) { o.up = false; o.el.classList.remove("up"); }
  function start() { const q = qs[i]; qMeta.textContent = `Câu ${i + 1} / ${qs.length} · đập chú chuột mang đáp án đúng`; qText.textContent = q.q; holes.forEach(o => { down(o); o.el.classList.remove("bonk", "bad"); }); busy = false; qStart = performance.now(); nextPop = qStart + 300; sinceRight = 0; }
  function pop(now) {
    const q = qs[i], free = holes.filter(o => !o.up && now > o.until), upNow = holes.filter(o => o.up);
    if (!free.length || upNow.length >= Math.min(3, q.opts.length)) return;
    const shown = new Set(upNow.map(o => o.k)), choices = q.opts.map((_, k) => k).filter(k => !shown.has(k));
    if (!choices.length) return;
    let k = choices[Math.random() * choices.length | 0];
    if (!shown.has(q.ans) && (sinceRight >= 1 || Math.random() < .4)) k = q.ans;
    sinceRight = k === q.ans ? 0 : sinceRight + 1;
    const o = free[Math.random() * free.length | 0]; o.k = k; o.hit = false; o.lab.textContent = q.opts[k]; o.up = true; o.until = now + rand(1700, 2500) / SPD;
    o.el.classList.remove("bonk", "bad"); o.el.classList.add("up");
  }
  function whack(o) {
    if (busy || !o.up || o.hit) return; o.hit = true; const q = qs[i]; logQuiz(q, o.k); o.el.classList.add("bonk"); Sfx.pop();
    if (o.k === q.ans) { busy = true; correct++; score += 100 + Math.round(60 * Math.max(0, 1 - (performance.now() - qStart) / 1000 / QT)); Sfx.right(); FX.burstEl(o.el, 26);
      holes.forEach(x => x !== o && down(x)); ts.push(setTimeout(() => { down(o); next(); }, 900)); }
    else { o.el.classList.add("bad"); lives--; Sfx.wrong(); hurt(field.parentNode); ts.push(setTimeout(() => down(o), 350));
      if (lives <= 0) { busy = true; ts.push(setTimeout(next, 1200)); } }
  }
  function next() { i++; if (lives <= 0 || i >= qs.length) Result(g, { score, correct, total: qs.length, note: lives <= 0 ? `Hết mạng ở câu ${i}/${qs.length}` : `Còn lại ${lives} mạng` }); else ts.push(setTimeout(start, 300)); }
  frameHooks.add(now => {
    const left = busy ? 0 : Math.max(0, QT - (now - qStart) / 1000);
    hud({ progress: prog(i + 1, qs.length), score, extra: `${heartHTML(lives, LIVES)} <b>${busy ? "" : Math.ceil(left) + "s"}</b>` });
    if (busy) return;
    for (const o of holes) if (o.up && !o.hit && now > o.until) { down(o); o.until = now + 250; }
    if (now >= nextPop) { pop(now); nextPop = now + rand(450, 800) / SPD; }
    for (const p of allPointers(now)) {
      const el = document.elementFromPoint(p.x, p.y)?.closest(".hole"), o = holes.find(x => x.el === el), before = prevHole.get(p.id);
      prevHole.set(p.id, o || null);
      if (o && o !== before && p.id !== "mouse") whack(o); // tay chạm vào hang là đập (chuột thì bấm)
    }
    if (left <= 0) { busy = true; lives--; Sfx.wrong(); toast("Hết giờ! Mất một mạng", 1200); logQuiz(qs[i], -1); holes.forEach(down); ts.push(setTimeout(next, 1000)); }
  });
  ts.push(setTimeout(start, 80)); return () => ts.forEach(clearTimeout);
}

/* ================= 19. NÉM BÓNG RỔ ================= */
function gameHoop(st, data, g) {
  const qs = pickN(data.quiz, Math.min(G("hoop", "count"), data.quiz.length)).map(shuffleQ), QT = G("hoop", "time"), LIVES = G("hoop", "lives"), MOVE = G("hoop", "move");
  let i = 0, score = 0, correct = 0, lives = LIVES, busy = true, qStart = 0; const ts = [];
  const qMeta = h("div", { class: "qmeta" }), qText = h("h2", { class: "qtext" }), hoops = h("div", { class: "hoops" });
  const ball = h("div", { class: "ball", "data-drag": true, title: "Chụm tay nhặt bóng, ném lên rổ đúng" });
  const arena = h("div", { class: "arena court" }, hoops, h("div", { class: "ball-spot" }, ball), h("p", { class: "court-tip" }, "Chụm tay nhặt bóng → đưa lên rổ đúng rồi thả, hoặc vung tay ném lên. Có thể chọn thẳng vào rổ."));
  st.append(h("div", { class: "game" }, h("div", { class: "qcard" }, qMeta, qText), arena));
  let hoopEls = [];
  function start() {
    const q = qs[i]; qMeta.textContent = `Câu ${i + 1} / ${qs.length} · ném bóng vào rổ có đáp án đúng`; qText.textContent = q.q;
    hoops.innerHTML = ""; hoops.style.setProperty("--n", q.opts.length);
    hoopEls = q.opts.map((o, k) => { const el = h("div", { class: `hoop ans-${k}`, "data-drop": true, "data-hit": true, "data-nodwell": true },
      h("div", { class: "board" }, h("span", { class: "ans-key" }, "ABCD"[k]), h("span", {}, o)), h("div", { class: "rim" }), h("div", { class: "net" }));
      el._k = k; el._ph = Math.random() * 6; on(el, () => shoot(el)); hoops.append(el); return el; });
    ball.hidden = false; busy = false; qStart = performance.now();
  }
  function shoot(hoop) {
    if (busy) return; busy = true; const q = qs[i], ok = hoop._k === q.ans; logQuiz(q, hoop._k);
    const b = ball.getBoundingClientRect(), rim = hoop.querySelector(".rim").getBoundingClientRect();
    const fly = h("div", { class: "ball fly", style: `left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px` }); document.body.append(fly); ball.hidden = true;
    const dx = rim.left + rim.width / 2 - (b.left + b.width / 2), dy = rim.top - (b.top + b.height / 2) - b.height * .2, peak = Math.min(dy - 120, -160);
    const kf = [0, .25, .5, .75, 1].map(t => ({ transform: `translate(${dx * t}px,${(1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * peak + t * t * dy}px) scale(${1 - t * .35}) rotate(${t * 540}deg)` }));
    if (!ok) kf.push({ transform: `translate(${dx + (dx > 0 ? 70 : -70)}px,${dy + 140}px) scale(.6) rotate(700deg)`, opacity: 0 });
    else kf.push({ transform: `translate(${dx}px,${dy + 70}px) scale(.6) rotate(600deg)`, opacity: 0 });
    Sfx.swish(); const an = fly.animate(kf, { duration: ok ? 900 : 1000, easing: "ease-in-out", fill: "forwards" });
    an.onfinish = () => fly.remove();
    ts.push(setTimeout(() => {
      hoopEls.forEach(x => x._k === q.ans ? x.classList.add("h-ok") : x !== hoop && x.classList.add("h-dim"));
      if (ok) { correct++; score += 100 + Math.round(60 * Math.max(0, 1 - (performance.now() - qStart) / 1000 / QT)); hoop.classList.add("swish"); Sfx.right(); FX.burstEl(hoop, 30); }
      else { hoop.classList.add("h-bad"); lives--; Sfx.wrong(); Sfx.tone(160, .2, "square", .08); hurt(arena); }
    }, 620));
    ts.push(setTimeout(next, 1900));
  }
  function next() { i++; if (lives <= 0 || i >= qs.length) Result(g, { score, correct, total: qs.length, note: lives <= 0 ? `Hết mạng ở câu ${i}/${qs.length}` : `Ném trúng ${correct}/${qs.length} rổ` }); else start(); }
  ball.addEventListener("gdrop", e => {
    if (busy) return; const z = e.detail.zone;
    if (z && z.classList.contains("hoop")) { shoot(z); return; }
    const p = primaryPointer(performance.now());
    if (p && p.vy < -500) { // vung tay ném: dự đoán điểm rơi theo hướng vung
      const b = ball.getBoundingClientRect(), hr = hoops.getBoundingClientRect(), t = (b.top - hr.bottom) / -p.vy, x = b.left + b.width / 2 + p.vx * t;
      const tgt = hoopEls.find(el => { const r = el.getBoundingClientRect(); return x >= r.left - 20 && x <= r.right + 20; });
      if (tgt) { shoot(tgt); return; }
    }
    toast("Bóng chưa tới rổ, thử lại nhé!", 1100);
  });
  ball.addEventListener("gselect", () => !busy && toast("Chụm tay giữ bóng rồi đưa lên rổ đúng", 1300));
  frameHooks.add(now => {
    const left = busy ? 0 : Math.max(0, QT - (now - qStart) / 1000);
    hud({ progress: prog(i + 1, qs.length), score, extra: `${heartHTML(lives, LIVES)} <b>${busy ? "" : Math.ceil(left) + "s"}</b>` });
    if (MOVE) hoopEls.forEach(el => { if (!busy) el.style.translate = `${Math.sin(now / 900 + el._ph) * 12}px 0`; });
    if (!busy && left <= 0) { busy = true; lives--; Sfx.wrong(); toast("Hết giờ! Mất một mạng", 1200); logQuiz(qs[i], -1); hoopEls.forEach(x => x._k === qs[i].ans && x.classList.add("h-ok")); ts.push(setTimeout(next, 1400)); }
  });
  ts.push(setTimeout(start, 80)); return () => { ts.forEach(clearTimeout); $$(".ball.fly").forEach(x => x.remove()); };
}

/* ================= 20. XÂY THÁP ĐÚNG – SAI ================= */
function gameTower(st, data, g) {
  const qs = pickN(data.tf, Math.min(G("tower", "count"), data.tf.length)), QT = G("tower", "time");
  let i = 0, score = 0, correct = 0, height = 0, best = 0, busy = false, timer = null; const ts = [];
  const cardWrap = h("div", { class: "tw-cardwrap" }), tb = h("div");
  const zone = (v, label, sub) => { const z = h("div", { class: "tw-zone " + (v ? "yes" : "no"), "data-drop": true, "data-hit": true, "data-nodwell": true, "data-v": v ? 1 : 0 }, h("span", { html: v ? TFI.yes : TFI.no }), h("b", {}, label), h("small", {}, sub)); on(z, () => answer(v, z)); return z; };
  const yes = zone(true, "ĐÚNG", "Thả vào đây"), no = zone(false, "SAI", "Thả vào đây");
  const stack = h("div", { class: "tw-stack" }), towerBox = h("div", { class: "tw-tower" }, h("div", { class: "tw-h" }), stack, h("div", { class: "tw-ground" }));
  st.append(h("div", { class: "game" }, cardWrap, tb, h("div", { class: "tw-row" }, yes, towerBox, no)));
  const upd = () => { hud({ progress: prog(i + 1, qs.length, "Phát biểu"), score, extra: `Tháp cao <b>${height}</b> tầng` }); towerBox.querySelector(".tw-h").textContent = `${height} tầng`; };
  function render() {
    busy = false; const q = qs[i]; cardWrap.innerHTML = ""; upd();
    const card = h("div", { class: "tw-card", "data-drag": true, tabindex: "0", role: "button" }, h("small", {}, `Phát biểu ${i + 1} / ${qs.length}`), h("b", {}, q.s));
    card.addEventListener("gdrop", e => { const z = e.detail.zone; if (z?.classList.contains("tw-zone")) answer(z.dataset.v === "1", z); });
    card.addEventListener("gselect", () => toast("Chụm tay giữ thẻ rồi thả vào ô ĐÚNG hoặc SAI (hoặc chọn thẳng vào ô)", 1600));
    cardWrap.append(card);
    timer?.stop(); timer = QT ? timerBar(QT, () => answer(null, null)) : null; tb.innerHTML = ""; if (timer) tb.append(timer.el);
  }
  function addBrick() {
    const b = h("div", { class: "brick", style: `--c:${COLORS[height % 6]};--x:${rand(-7, 7).toFixed(1)}px` }); stack.prepend(b); height++; best = Math.max(best, height);
    b.animate?.([{ transform: "translate(var(--x),-120px)", opacity: 0 }, { transform: "translate(var(--x),0)", opacity: 1 }], { duration: 420, easing: "cubic-bezier(.3,1.5,.5,1)" });
    stack.style.setProperty("--k", Math.min(1, 9 / Math.max(9, height)));
  }
  function dropBrick() {
    const b = stack.firstElementChild; towerBox.classList.remove("wobble"); void towerBox.offsetWidth; towerBox.classList.add("wobble");
    if (!b) return; height--; b.classList.add("fall"); ts.push(setTimeout(() => b.remove(), 600));
  }
  function answer(v, z) {
    if (busy) return; busy = true; timer?.stop(); const q = qs[i], ok = v === q.v, card = cardWrap.firstChild; logAns("tf", q.s, ok, { a: q.v ? "Đúng" : "Sai", pick: v == null ? "Hết giờ" : v ? "Đúng" : "Sai" });
    (q.v ? yes : no).classList.add("is-right");
    if (ok) { correct++; score += 100 + height * 10 + (timer ? Math.round(40 * timer.left() / QT) : 0); Sfx.right(); addBrick(); FX.burstEl(towerBox, 20); card?.classList.add("gone"); }
    else { Sfx.wrong(); if (z) reshake(z); else toast(`Hết giờ! Phát biểu này ${q.v ? "ĐÚNG" : "SAI"}`, 1500); dropBrick(); card?.classList.add("bad"); }
    upd(); ts.push(setTimeout(() => { yes.classList.remove("is-right"); no.classList.remove("is-right"); i++; i >= qs.length ? Result(g, { score, correct, total: qs.length, note: `Tháp cuối cùng cao ${height} tầng (cao nhất ${best} tầng)` }) : render(); }, 1300));
  }
  render(); return () => { timer?.stop(); ts.forEach(clearTimeout); };
}

/* ================= 21. TÌM CHỮ ================= */
function gameSearch(st, data, g) {
  const DIRS = { basic: [[0, 1], [1, 0]], diag: [[0, 1], [1, 0], [1, 1], [-1, 1]], all: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]] }[G("search", "dirs")] || [[0, 1], [1, 0]];
  const SHOW = G("search", "show");
  let words = pickN(data.words.map(w => ({ ...w, k: baseChar(w.w).replace(/[^A-Z]/g, "") })).filter(w => w.k.length >= 2 && w.k.length <= 12), G("search", "count"));
  const n = clamp(Math.max(8, ...words.map(w => w.k.length + 1)), 8, 12);
  let grid, placed;
  for (let attempt = 0; attempt < 30; attempt++) { // xếp các từ lên lưới
    grid = [...Array(n)].map(() => Array(n).fill("")); placed = [];
    for (const w of [...words].sort((a, b) => b.k.length - a.k.length)) {
      let ok = false;
      for (let t = 0; t < 200 && !ok; t++) {
        const [dr, dc] = DIRS[Math.random() * DIRS.length | 0], r0 = Math.random() * n | 0, c0 = Math.random() * n | 0, L = w.k.length;
        const r1 = r0 + dr * (L - 1), c1 = c0 + dc * (L - 1); if (r1 < 0 || r1 >= n || c1 < 0 || c1 >= n) continue;
        if ([...w.k].every((ch, j) => [ "", ch ].includes(grid[r0 + dr * j][c0 + dc * j]))) { [...w.k].forEach((ch, j) => grid[r0 + dr * j][c0 + dc * j] = ch); placed.push({ ...w, r0, c0, r1, c1 }); ok = true; }
      }
    }
    if (placed.length === words.length) break;
  }
  words = placed;
  const ABC = "ABCDEGHIKLMNOPQRSTUVXY";
  grid.forEach(row => row.forEach((ch, j) => { if (!ch) row[j] = ABC[Math.random() * ABC.length | 0]; }));
  let found = 0, sel = null, mistakes = 0, score = 0; const t0 = performance.now(), ts = [], hits = [];
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "ws-lines");
  const gridEl = h("div", { class: "ws-grid", style: `--n:${n}` });
  const cells = grid.map((row, r) => row.map((ch, c) => {
    const b = h("button", { class: "ws-cell", "data-hit": true, "data-link": true }, ch); b._r = r; b._c = c;
    b.addEventListener("glinkstart", () => { setSel(b); });
    b.addEventListener("glinkend", () => { if (sel && sel !== b) tryPick(sel, b); });
    on(b, () => { if (!sel) setSel(b); else if (sel === b) setSel(null); else tryPick(sel, b); });
    gridEl.append(b); return b;
  }));
  const list = h("div", { class: "ws-list" }), wordEls = words.map(w => { const el = h("div", { class: "ws-word" }, h("b", {}, SHOW ? w.w : `${w.k.length} chữ cái`), h("small", {}, w.hint)); list.append(el); return el; });
  st.append(h("div", { class: "game ws" }, h("div", { class: "ws-board" }, svg, gridEl), h("div", { class: "ws-side" }, h("p", { class: "tip" }, "Chụm tay vào chữ đầu, kéo tới chữ cuối rồi thả. Hoặc chọn chữ đầu rồi chọn chữ cuối. Từ có thể nằm ngang, dọc" + (DIRS.length > 2 ? ", chéo" : "") + (DIRS.length > 4 ? " hoặc ngược" : "") + "."), list)));
  function setSel(b) { sel?.classList.remove("sel"); sel = b; b?.classList.add("sel"); }
  function lineCells(a, b) {
    const dr = Math.sign(b._r - a._r), dc = Math.sign(b._c - a._c), L = Math.max(Math.abs(b._r - a._r), Math.abs(b._c - a._c));
    if (!(a._r === b._r || a._c === b._c || Math.abs(b._r - a._r) === Math.abs(b._c - a._c))) return null;
    return [...Array(L + 1)].map((_, j) => cells[a._r + dr * j][a._c + dc * j]);
  }
  function tryPick(a, b) {
    setSel(null); const line = lineCells(a, b); const s = line ? line.map(x => x.textContent).join("") : "";
    const k = words.findIndex((w, j) => !wordEls[j].classList.contains("found") && line &&
      ((w.r0 === a._r && w.c0 === a._c && w.r1 === b._r && w.c1 === b._c) || (w.r1 === a._r && w.c1 === a._c && w.r0 === b._r && w.c0 === b._c) || w.k === s || [...w.k].reverse().join("") === s));
    if (k < 0) { mistakes++; score = Math.max(0, score - 10); Sfx.wrong(); (line || [a, b]).forEach(reshake); return; }
    const col = COLORS[found % 6]; hits.push({ a: line[0], b: line.at(-1), col }); line.forEach(x => { x.classList.add("hit"); x.style.setProperty("--c", col); });
    found++; score += 100 + words[k].k.length * 10; wordEls[k].classList.add("found"); wordEls[k].style.setProperty("--c", col); wordEls[k].querySelector("b").textContent = words[k].w;
    Sfx.right(); FX.burstEl(line.at(-1), 20);
    if (found === words.length) { const sec = (performance.now() - t0) / 1000; ts.push(setTimeout(() => Result(g, { score: score + Math.max(0, 300 - Math.round(sec) * 2), correct: found, total: found + mistakes, label: "Tìm đúng / lần chọn", note: `Tìm đủ ${words.length} từ trong ${fmtTime(sec)}` }), 1000)); }
  }
  const clock = gameClock("search", t0, () => Result(g, { score, correct: found, total: words.length, label: "Từ tìm được", note: `Hết giờ: tìm được ${found}/${words.length} từ` }));
  frameHooks.add(now => {
    hud({ progress: `Đã tìm <b>${found}/${words.length}</b>`, score, extra: clock.label(now) }); if (found < words.length) clock.check(now);
    const br = gridEl.getBoundingClientRect(), cen = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2 - br.left, r.top + r.height / 2 - br.top]; };
    const w = cells[0][0].offsetWidth * .78; let s = "";
    for (const ht of hits) { const [x1, y1] = cen(ht.a), [x2, y2] = cen(ht.b); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ht.col}" stroke-width="${w}" stroke-linecap="round" opacity=".38"/>`; }
    if (sel && now - Input.last.t < 2000) { const [x1, y1] = cen(sel), x2 = clamp(Input.last.x - br.left, 0, br.width), y2 = clamp(Input.last.y - br.top, 0, br.height); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--amber)" stroke-width="${w}" stroke-linecap="round" opacity=".3"/>`; }
    svg.setAttribute("viewBox", `0 0 ${br.width} ${br.height}`); svg.innerHTML = s;
  });
  return () => ts.forEach(clearTimeout);
}

/* ================= 22. BẤM CHUÔNG GIÀNH QUYỀN (2 đội) ================= */
const BELL_SVG = '<svg viewBox="0 0 48 48"><path d="M12 32V22a12 12 0 0 1 24 0v10l4 5H8z"/><path d="M20 41a4 4 0 0 0 8 0"/></svg>';
function gameBuzz(st, data, g) {
  const qs = pickN(data.quiz, Math.min(G("buzz", "count"), data.quiz.length)).map(shuffleQ), QT = G("buzz", "time"), READ = G("buzz", "read");
  let i = 0, sc = { L: 0, R: 0 }, cor = { L: 0, R: 0 }, phase = "read", turn = null, tried = new Set(), timer = null, armAt = 0; const ts = [];
  const qbox = h("div", { class: "qcard" }), tb = h("div"), teams = h("div", { class: "teams buzz" });
  const panels = {};
  ["L", "R"].forEach(side => {
    const bell = h("button", { class: "bell", "data-hit": true, html: BELL_SVG + "<span>BẤM CHUÔNG</span>" }); on(bell, () => buzz(side));
    const body = h("div", { class: "team-body" }, bell);
    const head = h("div", { class: "team-head" }, side === "L" ? "Đội Xanh" : "Đội Đỏ", h("b", {}));
    panels[side] = { el: h("div", { class: "team " + side.toLowerCase() }, head, body), bell, body, head }; teams.append(panels[side].el);
  });
  st.append(h("div", { class: "game tug" }, qbox, tb, teams));
  const upd = () => { hud({ progress: prog(i + 1, qs.length), score: null, extra: `<span class="tx-l">Xanh <b>${sc.L}</b></span> · <span class="tx-r">Đỏ <b>${sc.R}</b></span>` }); ["L", "R"].forEach(s => panels[s].head.querySelector("b").textContent = `${sc[s]} điểm`); };
  function render() {
    const q = qs[i]; phase = "read"; turn = null; tried = new Set(); upd(); armAt = performance.now() + READ * 1000;
    qbox.innerHTML = ""; qbox.append(h("div", { class: "qmeta" }, `Câu ${i + 1} / ${qs.length} · đội nào bấm chuông trước được trả lời`), h("h2", { class: "qtext" }, q.q),
      h("div", { class: "buzz-opts" }, q.opts.map((o, k) => h("span", { class: `bopt ans-${k}` }, h("b", {}, "ABCD"[k]), o))));
    timer?.stop(); tb.innerHTML = ""; tb.append(h("div", { class: "buzz-state" }, READ ? "Đọc câu hỏi… chuông sẽ mở sau giây lát" : "BẤM CHUÔNG!"));
    ["L", "R"].forEach(s => { const p = panels[s]; p.el.classList.remove("win", "locked", "turn"); p.body.innerHTML = ""; p.body.append(p.bell); p.bell.disabled = !!READ; p.bell.classList.remove("rung"); });
    if (!READ) arm();
  }
  function arm() { phase = "buzz"; ["L", "R"].forEach(s => panels[s].bell.disabled = false); tb.innerHTML = ""; tb.append(h("div", { class: "buzz-state go" }, "BẤM CHUÔNG!")); Sfx.tone(880, .15, "square", .07); }
  function buzz(side) {
    if (phase !== "buzz" || tried.has(side)) return; phase = "answer"; turn = side;
    const p = panels[side]; p.bell.classList.add("rung"); Sfx.tone(1320, .35, "triangle", .14); Sfx.tone(1760, .3, "triangle", .08, .08);
    ts.push(setTimeout(() => giveTurn(side), 350));
  }
  function giveTurn(side) {
    const q = qs[i], p = panels[side], o = panels[side === "L" ? "R" : "L"];
    p.el.classList.add("turn"); o.el.classList.add("locked"); o.bell.disabled = true;
    const btns = answerButtons(q, k => pick(side, k, btns)); btns.forEach((b, k) => tried.has("x" + k) && b.classList.add("is-locked", "is-gone"));
    p.body.innerHTML = ""; p.body.append(h("div", { class: "answers" }, btns));
    timer?.stop(); timer = timerBar(QT, () => pick(side, -1, btns)); tb.innerHTML = ""; tb.append(h("div", { class: "buzz-state" }, `${side === "L" ? "Đội Xanh" : "Đội Đỏ"} trả lời${tried.size ? " (cướp quyền)" : ""}`), timer.el);
  }
  function pick(side, k, btns) {
    if (phase !== "answer" || turn !== side) return; timer.stop(); const q = qs[i], steal = tried.size > 0; logQuiz(q, k);
    if (k === q.ans) {
      phase = "done"; sc[side] += steal ? 50 : 100; cor[side]++; markAnswers(btns, q.ans, k); panels[side].el.classList.add("win"); Sfx.right(); FX.burstEl(btns[k], 30); upd();
      ts.push(setTimeout(next, 1700)); return;
    }
    if (k >= 0) { btns[k].classList.add("is-wrong"); reshake(btns[k]); tried.add("x" + k); } else toast("Hết giờ trả lời!", 1200);
    Sfx.wrong(); sc[side] = Math.max(0, sc[side] - 50); tried.add(side); upd();
    const other = side === "L" ? "R" : "L";
    if (!tried.has(other)) { phase = "answer"; turn = other; toast(`Đội ${other === "L" ? "Xanh" : "Cam"} được quyền cướp điểm!`, 1500);
      ts.push(setTimeout(() => { const p = panels[side]; p.el.classList.remove("turn"); p.el.classList.add("locked"); p.body.innerHTML = ""; panels[other].el.classList.remove("locked"); giveTurn(other); }, 900)); }
    else { phase = "done"; markAnswers(btns, q.ans, k); ts.push(setTimeout(next, 1800)); }
  }
  function next() { i++; i >= qs.length ? end() : render(); }
  function end() {
    const w = sc.L > sc.R ? "L" : sc.R > sc.L ? "R" : null;
    Result(g, { score: Math.max(sc.L, sc.R), correct: cor.L + cor.R, total: qs.length, stars: 3, noRecord: true, title: w ? `Đội ${w === "L" ? "Xanh" : "Cam"} chiến thắng!` : "Hai đội hòa nhau!",
      note: `Sau ${qs.length} câu hỏi giành quyền trả lời.`, stats: [["Đội Xanh", `${sc.L} điểm`], ["Đội Đỏ", `${sc.R} điểm`], ["Số câu", qs.length]] });
  }
  frameHooks.add(now => {
    if (phase === "read" && now >= armAt) arm();
    if (phase !== "buzz") return;
    for (const p of allPointers(now)) { if (p.id === "mouse") continue; // tay chạm vào chuông là bấm
      for (const s of ["L", "R"]) { const r = panels[s].bell.getBoundingClientRect(); if (p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom) { buzz(s); return; } } }
  });
  render(); return () => { timer?.stop(); ts.forEach(clearTimeout); };
}

/* ================= 23. BOM HẸN GIỜ ================= */
const BOMB_SVG = '<svg viewBox="0 0 120 120"><circle cx="54" cy="70" r="40" fill="#1f2937" stroke="#0b1220" stroke-width="4"/><path d="M34 54a24 24 0 0 1 18-16" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".35" fill="none"/><rect x="62" y="22" width="22" height="16" rx="4" transform="rotate(40 73 30)" fill="#374151"/></svg>';
function gameBomb(st, data, g) {
  const pool = shuffle([...pickN(data.quiz, data.quiz.length).map(shuffleQ), ...data.tf.map(tfAsQ)]).slice(0, G("bomb", "count"));
  const START = G("bomb", "start"), BONUS = G("bomb", "bonus"), PEN = 5;
  let i = 0, score = 0, correct = 0, wrong = 0, streak = 0, fuse = START, locked = false, over = false, lastSec = 0, btns = []; const ts = [];
  const big = h("b", { class: "bomb-t" }), fuseEl = h("div", { class: "fuse" }, h("i"), h("span", { class: "spark" }));
  const bomb = h("div", { class: "bomb" }, h("div", { class: "bomb-body", html: BOMB_SVG }, big), fuseEl);
  const qMeta = h("div", { class: "qmeta" }), qText = h("h2", { class: "qtext" }), ansBox = h("div", { class: "answers" }), combo = h("div", { class: "combo" });
  st.append(h("div", { class: "game bombgame" }, h("div", { class: "bomb-side" }, bomb, combo, h("p", { class: "muted", style: "text-align:center;font-size:14px" }, `Đúng +${BONUS} giây · Sai −${PEN} giây`)), h("div", { class: "bomb-main" }, h("div", { class: "qcard" }, qMeta, qText), ansBox)));
  const mult = () => 1 + Math.min(3, Math.floor(streak / 3));
  function render() {
    const q = pool[i]; locked = false; qMeta.textContent = `Câu ${i + 1} / ${pool.length} · trả lời thật nhanh để gỡ bom`; qText.textContent = q.q;
    btns = answerButtons(q, k => choose(k)); ansBox.innerHTML = ""; ansBox.append(...btns); ansBox.classList.toggle("two", q.opts.length === 2);
    combo.innerHTML = mult() > 1 ? `Chuỗi đúng ${streak} · <b>×${mult()} điểm</b>` : streak ? `Chuỗi đúng ${streak}` : "Đúng liên tiếp 3 câu để nhân điểm";
  }
  function bump(txt, good) { const t = h("span", { class: "bomb-pop " + (good ? "ok" : "bad") }, txt); bomb.append(t); ts.push(setTimeout(() => t.remove(), 900)); }
  function choose(k) {
    if (locked || over) return; locked = true; const q = pool[i]; markAnswers(btns, q.ans, k); logQuiz(q, k);
    if (k === q.ans) { correct++; streak++; score += 100 * mult(); fuse += BONUS; Sfx.right(); FX.burstEl(btns[k], 16); bump(`+${BONUS}s`, true); }
    else { wrong++; streak = 0; fuse = Math.max(0, fuse - PEN); Sfx.wrong(); reshake(btns[k]); bump(`−${PEN}s`, false); bomb.classList.remove("jolt"); void bomb.offsetWidth; bomb.classList.add("jolt"); }
    ts.push(setTimeout(() => { if (over) return; i++; if (i >= pool.length) defuse(); else render(); }, k === q.ans ? 450 : 900));
  }
  function defuse() { over = true; const bonus = Math.round(fuse) * 10; score += bonus; Sfx.win(); FX.rain(); bomb.classList.add("safe");
    ts.push(setTimeout(() => Result(g, { score, correct, total: correct + wrong, title: "Gỡ bom thành công!", stars: wrong <= 1 ? 3 : 2, note: `Trả lời hết ${pool.length} câu, còn dư ${Math.round(fuse)} giây (+${bonus} điểm thưởng)` }), 1200)); }
  function boom() {
    over = true; btns.forEach(b => b.classList.add("is-locked")); bomb.classList.add("boom"); Sfx.noise?.(.8, .3, 200); Sfx.tone(90, .7, "sawtooth", .15);
    const r = bomb.getBoundingClientRect(); for (let k = 0; k < 3; k++) ts.push(setTimeout(() => FX.burst(r.left + r.width / 2, r.top + r.height / 2, 60), k * 120));
    hurt(st.querySelector(".bombgame"));
    ts.push(setTimeout(() => Result(g, { score, correct, total: correct + wrong, title: "BÙM! Bom đã nổ", stars: correct >= pool.length * .6 ? 2 : correct ? 1 : 0, note: `Trả lời đúng ${correct} câu trước khi bom nổ (${i}/${pool.length} câu)` }), 1500));
  }
  frameHooks.add((now, dt) => {
    if (!over) fuse = Math.max(0, fuse - dt);
    const s = Math.ceil(fuse); big.textContent = s; bomb.classList.toggle("low", fuse <= 10);
    fuseEl.style.setProperty("--f", clamp(fuse / START, 0, 1.25).toFixed(3));
    if (!over && s !== lastSec) { lastSec = s; if (s <= 10 && s > 0) Sfx.tone(s <= 5 ? 1200 : 900, .05, "square", .06); }
    hud({ progress: prog(i + 1, pool.length), score, extra: `Bom còn <b>${s}s</b>${mult() > 1 ? ` · ×${mult()}` : ""}` });
    if (!over && fuse <= 0) boom();
  });
  render(); return () => ts.forEach(clearTimeout);
}

const CATS = ["Tất cả", "Trả lời", "Thử thách", "Ghi nhớ", "Sắp xếp", "Vận động", "Từ vựng", "Thi đấu đội"];
const GAMES = [
  { id: "quiz", name: "Trắc nghiệm nhanh", cat: "Trả lời", icon: I.quiz, color: "var(--amber)", who: "Cá nhân",
    desc: "Chọn 1 trong 4 đáp án trước khi hết giờ. Trả lời nhanh được thêm điểm.",
    how: "Mỗi câu có tối đa 4 đáp án. Đưa tay tới đáp án rồi chụm ngón cái với ngón trỏ, hoặc giữ yên cho vòng tròn chạy đầy.",
    ok: d => d.quiz.length > 0, count: d => `${d.quiz.length} câu`, run: gameQuiz },
  { id: "tf", name: "Đúng hay Sai", cat: "Trả lời", icon: I.tf, color: "var(--lime)", who: "Cá nhân",
    desc: "Đọc phát biểu, đưa tay sang ô ĐÚNG hoặc SAI.",
    how: "Đọc phát biểu trên màn hình. Đưa tay sang ô ĐÚNG bên trái hoặc SAI bên phải rồi chụm tay để chọn.",
    ok: d => d.tf.length > 0, count: d => `${d.tf.length} phát biểu`, run: gameTF },
  { id: "tiles", name: "Ô cửa bí mật", cat: "Trả lời", icon: I.tiles, color: "var(--indigo)", who: "Cả lớp",
    desc: "Chọn ô số, mở câu hỏi với điểm thưởng khác nhau. Có ô nhân đôi điểm.",
    how: "Chọn một ô cửa bất kỳ để mở câu hỏi. Mỗi ô có 100, 200 hoặc 300 điểm, một ô bí mật được nhân đôi. Trả lời hết các ô để kết thúc.",
    ok: d => d.quiz.length > 0, count: d => `${Math.min(12, d.quiz.length)} ô cửa`, run: gameTiles },
  { id: "match", name: "Nối cặp", cat: "Ghi nhớ", icon: I.match, color: "var(--sky)", who: "Cá nhân",
    desc: "Chọn một ô bên trái rồi nối với ô tương ứng bên phải.",
    how: "Chụm tay vào một ô, kéo sợi dây sang ô tương ứng ở cột bên kia rồi thả tay. Hoặc chạm chọn lần lượt hai ô. Nối đúng thì hai ô cùng màu.",
    ok: d => d.match.length > 1, count: d => `${d.match.length} cặp`, run: gameMatch },
  { id: "memory", name: "Lật thẻ trí nhớ", cat: "Ghi nhớ", icon: I.memory, color: "var(--teal)", who: "Cá nhân",
    desc: "Lật hai thẻ một lượt, tìm các cặp thẻ khớp nhau.",
    how: "Mỗi lượt lật hai thẻ. Hai thẻ khớp nhau thì giữ nguyên, không khớp thì úp lại. Tìm hết các cặp với ít lượt nhất.",
    ok: d => d.match.length > 1, count: d => `${Math.min(6, d.match.length)} cặp thẻ`, run: gameMemory },
  { id: "sort", name: "Phân loại", cat: "Sắp xếp", icon: I.sort, color: "var(--fuchsia)", who: "Cá nhân",
    desc: "Chụm tay nhặt thẻ, kéo sang đúng nhóm rồi thả tay.",
    how: "Chụm hai ngón hoặc nắm cả bàn tay vào một thẻ để nhặt lên, đưa tới nhóm đúng rồi mở tay để thả. Cách khác: chạm chọn thẻ, rồi chạm chọn nhóm.",
    ok: d => d.sort.length > 1, count: d => `${d.sort.length} nhóm · ${d.sort.reduce((a, c) => a + c.items.length, 0)} thẻ`, run: gameSort },
  { id: "order", name: "Sắp xếp thứ tự", cat: "Sắp xếp", icon: I.order, color: "var(--blue)", who: "Cá nhân",
    desc: "Xếp các bước, sự kiện hoặc con số theo đúng trình tự.",
    how: "Nhặt thẻ và thả vào đúng ô số, hoặc chạm lần lượt các thẻ theo thứ tự để thẻ bay vào ô trống tiếp theo. Chạm một ô đã xếp để trả thẻ về. Xếp đủ thì tự chấm.",
    ok: d => d.order.length > 0, count: d => `${d.order.length} dãy`, run: gameOrder },
  { id: "bubble", name: "Chạm bong bóng", cat: "Vận động", icon: I.bubble, color: "var(--rose)", who: "Cá nhân",
    desc: "Bong bóng mang đáp án bay lên. Chạm vào quả đúng.",
    how: "Bong bóng mang đáp án bay từ dưới lên. Chỉ cần đưa tay chạm vào bong bóng đúng, không cần chụm. Chạm nhầm mất một mạng.",
    ok: d => d.quiz.length > 0, count: d => `${d.quiz.length} câu`, run: gameBubble },
  { id: "slice", name: "Chém đáp án", cat: "Vận động", icon: I.slice, color: "var(--emerald)", who: "Cá nhân",
    desc: "Quả tung lên mang đáp án. Vung tay thật nhanh để chém quả đúng.",
    how: "Các quả tung lên từ dưới màn hình. Vung tay nhanh cắt ngang quả mang đáp án đúng. Chém nhầm hoặc hết giờ thì mất một mạng.",
    ok: d => d.quiz.length > 0, count: d => `${d.quiz.length} câu`, run: gameSlice },
  { id: "catch", name: "Hứng rổ", cat: "Vận động", icon: I.catch, color: "var(--amber)", who: "Cá nhân",
    desc: "Di tay để đưa rổ hứng đúng những thẻ thuộc nhóm được yêu cầu.",
    how: "Chiếc rổ chạy theo tay bạn. Mỗi vòng có một nhóm mục tiêu: hứng thẻ đúng nhóm được cộng điểm, hứng nhầm bị trừ điểm.",
    ok: d => d.sort.length > 1, count: d => `${Math.min(3, d.sort.length)} vòng`, run: gameCatch },
  { id: "word", name: "Ô chữ bí ẩn", cat: "Từ vựng", icon: I.word, color: "var(--indigo)", who: "Cá nhân",
    desc: "Đọc gợi ý, chọn từng chữ cái để lật ô chữ.",
    how: "Đọc gợi ý rồi chọn từng chữ cái. Chữ có dấu tính theo chữ gốc: Ă, Â → A; Đ → D; Ô, Ơ → O; Ư → U. Sai quá 6 lần thì ô chữ tự mở.",
    ok: d => d.words.length > 0, count: d => `${d.words.length} từ`, run: gameWord },
  { id: "scramble", name: "Xếp chữ", cat: "Từ vựng", icon: I.scramble, color: "var(--teal)", who: "Cá nhân",
    desc: "Các chữ cái bị xáo trộn. Chọn lần lượt để ghép lại thành từ đúng.",
    how: "Chọn các chữ cái theo đúng thứ tự để ghép thành từ khóa. Chọn một ô đã điền để trả chữ về. Nút Gợi ý mở giúp một chữ.",
    ok: d => d.words.length > 0, count: d => `${d.words.length} từ`, run: gameScramble },
  { id: "tug", name: "Kéo co 2 đội", cat: "Thi đấu đội", icon: I.tug, color: "var(--rose)", who: "2 đội",
    desc: "Hai đội cùng trả lời. Đội nhanh và đúng kéo dây về phía mình.",
    how: "Đội Xanh đứng bên trái, đội Đỏ bên phải, mỗi đội dùng một tay chọn đáp án ở nửa màn hình của mình. Đội đúng trước kéo dây một nấc; kéo đủ 3 nấc là thắng.",
    team: true, ok: d => d.quiz.length > 0, count: d => `${d.quiz.length} câu`, run: gameTug },
  { id: "millionaire", name: "Ai là triệu phú", cat: "Thử thách", icon: I.millionaire, color: "var(--violet)", who: "Cá nhân", isNew: true,
    desc: "Vượt qua từng nấc câu hỏi, có mốc an toàn và 3 quyền trợ giúp.",
    how: "Trả lời đúng để leo lên nấc điểm cao hơn. Sai một câu là dừng cuộc chơi và chỉ giữ điểm của mốc an toàn gần nhất. Có 3 quyền trợ giúp: 50:50, Hỏi ý kiến lớp, Đổi câu hỏi. Giữ tay trên nút Dừng cuộc chơi để bảo toàn điểm.",
    ok: d => d.quiz.length >= 3, count: d => `${Math.min(G("millionaire", "count"), d.quiz.length)} nấc`, run: gameMillionaire },
  { id: "wheel", name: "Vòng quay may mắn", cat: "Thử thách", icon: I.wheel, color: "var(--amber)", who: "Cả lớp", isNew: true,
    desc: "Vuốt tay quay bánh xe để chọn giá trị câu hỏi rồi trả lời.",
    how: "Vuốt tay thật nhanh qua vòng quay (hoặc chọn nút Quay). Ô dừng lại quyết định số điểm của câu hỏi: ô ★ được 1000 điểm, ô ×2 nhân đôi tổng điểm, ô MẤT LƯỢT bỏ qua câu đó.",
    ok: d => d.quiz.length > 0, count: d => `${Math.min(G("wheel", "count"), d.quiz.length)} lượt quay`, run: gameWheel },
  { id: "bomb", name: "Bom hẹn giờ", cat: "Thử thách", icon: I.bomb, color: "var(--red)", who: "Cá nhân", isNew: true,
    desc: "Trả lời liên tục thật nhanh. Đúng thì kéo dài ngòi bom, sai thì bom cháy nhanh hơn.",
    how: "Quả bom đếm ngược. Mỗi câu đúng được thêm giây, sai bị trừ 5 giây. Đúng liên tiếp 3 câu được nhân điểm. Trả lời hết câu hỏi trước khi bom nổ là gỡ bom thành công.",
    ok: d => d.quiz.length + d.tf.length > 0, count: d => `${Math.min(G("bomb", "count"), d.quiz.length + d.tf.length)} câu`, run: gameBomb },
  { id: "bingo", name: "Bingo kiến thức", cat: "Ghi nhớ", icon: I.bingo, color: "var(--fuchsia)", who: "Cả lớp", isNew: true,
    desc: "Nghe gợi ý, tìm ô đáp án trên bảng. Đủ một hàng là BINGO!",
    how: "Mỗi lượt hiện một câu hỏi hoặc gợi ý. Tìm và chọn ô chứa đáp án trên bảng. Đánh dấu đủ một hàng ngang, dọc hoặc chéo là BINGO, được thưởng 300 điểm.",
    ok: d => clueItems(d).length >= 9, count: d => { const n = clueItems(d).length; return `Bảng ${n >= 25 ? "5×5" : n >= 16 ? "4×4" : "3×3"} · ${n} đáp án`; }, run: gameBingo },
  { id: "tower", name: "Xây tháp Đúng – Sai", cat: "Sắp xếp", icon: I.tower, color: "var(--emerald)", who: "Cá nhân", isNew: true,
    desc: "Kéo thẻ phát biểu vào ô ĐÚNG hoặc SAI. Đúng thì tháp cao thêm một tầng.",
    how: "Chụm tay nhặt thẻ phát biểu, thả vào ô ĐÚNG bên trái hoặc SAI bên phải (hoặc chọn thẳng vào ô). Mỗi câu đúng xây thêm một tầng tháp, sai thì tháp rơi mất một tầng.",
    ok: d => d.tf.length > 0, count: d => `${d.tf.length} phát biểu`, run: gameTower },
  { id: "race", name: "Đua xe tri thức", cat: "Vận động", icon: I.race, color: "var(--sky)", who: "Cá nhân", isNew: true,
    desc: "Di tay lái xe sang làn có đáp án đúng trước khi cổng chạy tới.",
    how: "Chiếc xe chạy theo tay bạn. Các cổng đáp án tiến lại gần: lái xe vào đúng làn trước khi chạm cổng. Có thể dùng phím mũi tên hoặc phím 1–4.",
    ok: d => d.quiz.length > 0, count: d => `${d.quiz.length} câu`, run: gameRace },
  { id: "mole", name: "Đập chuột", cat: "Vận động", icon: I.mole, color: "var(--lime)", who: "Cá nhân", isNew: true,
    desc: "Chuột ngoi lên mang đáp án. Đập thật nhanh chú chuột đúng!",
    how: "Các chú chuột thay nhau ngoi lên khỏi hang, mỗi chú mang một đáp án. Đưa tay đập vào chú chuột mang đáp án đúng. Đập nhầm mất một mạng.",
    ok: d => d.quiz.length > 0, count: d => `${d.quiz.length} câu`, run: gameMole },
  { id: "hoop", name: "Ném bóng rổ", cat: "Vận động", icon: I.hoop, color: "var(--rose)", who: "Cá nhân", isNew: true,
    desc: "Nhặt bóng, ném vào rổ mang đáp án đúng.",
    how: "Chụm tay nhặt quả bóng, đưa lên rổ có đáp án đúng rồi thả tay. Hoặc vung tay lên thật nhanh rồi thả để ném. Ném trượt rổ không bị trừ, ném vào rổ sai mất một mạng.",
    ok: d => d.quiz.length > 0, count: d => `${d.quiz.length} câu`, run: gameHoop },
  { id: "search", name: "Tìm chữ", cat: "Từ vựng", icon: I.search, color: "var(--violet)", who: "Cá nhân", isNew: true,
    desc: "Tìm các từ khóa ẩn trong bảng chữ cái theo hàng ngang, dọc, chéo.",
    how: "Chụm tay vào chữ cái đầu của từ, kéo tới chữ cái cuối rồi thả tay. Hoặc chọn chữ đầu, rồi chọn chữ cuối. Chữ có dấu được viết không dấu (Ă, Â → A; Đ → D…).",
    ok: d => d.words.filter(w => baseChar(w.w).replace(/[^A-Z]/g, "").length >= 2).length >= 2, count: d => `${Math.min(G("search", "count"), d.words.length)} từ`, run: gameSearch },
  { id: "buzz", name: "Bấm chuông giành quyền", cat: "Thi đấu đội", icon: I.buzz, color: "var(--amber)", who: "2 đội", isNew: true, team: true,
    desc: "Hai đội thi bấm chuông. Đội nhanh tay được trả lời, sai thì đội kia cướp điểm.",
    how: "Đội Xanh đứng bên trái, đội Đỏ bên phải. Khi chuông mở, đội nào chạm vào chuông trước được trả lời: đúng +100 điểm, sai −50 điểm và đội kia được quyền cướp (+50).",
    ok: d => d.quiz.length > 0, count: d => `${Math.min(G("buzz", "count"), d.quiz.length)} câu`, run: gameBuzz }
];

/* ---------- thông tin hiển thị ở sảnh: nhóm, cử chỉ, người chơi ---------- */
const CAT_INFO = {
  "Trả lời": { slug: "answer", d: "Trắc nghiệm, đúng sai, ô cửa câu hỏi" },
  "Thử thách": { slug: "challenge", d: "Có leo nấc, may rủi và đồng hồ đếm ngược" },
  "Ghi nhớ": { slug: "memory", d: "Ghép cặp, lật thẻ, dò bảng Bingo" },
  "Sắp xếp": { slug: "arrange", d: "Nhặt thẻ lên và thả vào đúng chỗ" },
  "Vận động": { slug: "move", d: "Cả cánh tay cùng tham gia, chơi rất sôi động" },
  "Từ vựng": { slug: "words", d: "Chữ cái, từ khóa và gợi ý" },
  "Thi đấu đội": { slug: "teams", d: "Hai đội đứng hai bên màn hình, cùng thi một lúc" }
};
const GEST = {
  tap: ["Chạm chọn", '<svg viewBox="0 0 24 24"><circle cx="12" cy="15" r="2.4"/><path d="M7.6 10.6a6.2 6.2 0 0 1 8.8 0M4.8 7.8a10.2 10.2 0 0 1 14.4 0"/></svg>'],
  drag: ["Cầm & kéo", '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="10" height="10" rx="2.5"/><path d="M13 13l7 7M20 14.5V20h-5.5"/></svg>'],
  link: ["Nối dây", '<svg viewBox="0 0 24 24"><circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="M7.2 6c7.5 0 2.4 12 9.6 12"/></svg>'],
  swing: ["Vung tay", '<svg viewBox="0 0 24 24"><path d="M4 20L20 4M4 13l7-7M11 20l9-9"/></svg>'],
  steer: ["Di tay", '<svg viewBox="0 0 24 24"><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg>'],
  swipe: ["Vuốt quay", '<svg viewBox="0 0 24 24"><path d="M4 15a8 8 0 0 1 14.6-4.5"/><path d="M19.5 5v6h-6"/></svg>'],
  slap: ["Chạm nhanh", '<svg viewBox="0 0 24 24"><path d="M12 3v4M5.6 5.6l2.8 2.8M18.4 5.6l-2.8 2.8"/><circle cx="12" cy="15" r="5"/></svg>']
};
const GEST_OF = { quiz: "tap", tf: "tap", tiles: "tap", match: "link", memory: "tap", sort: "drag", order: "drag", bubble: "slap", slice: "swing", catch: "steer",
  word: "tap", scramble: "drag", tug: "tap", millionaire: "tap", wheel: "swipe", bomb: "tap", bingo: "tap", tower: "drag", race: "steer", mole: "slap", hoop: "drag", search: "link", buzz: "slap" };
const WHO_ICON = {
  "Cá nhân": '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M5 20.5a7 7 0 0 1 14 0"/></svg>',
  "Cả lớp": '<svg viewBox="0 0 24 24"><circle cx="8" cy="8.5" r="3"/><circle cx="16.5" cy="8.5" r="3"/><path d="M2.5 19.5a5.6 5.6 0 0 1 11 0M12.5 15.2a5.6 5.6 0 0 1 9 4.3"/></svg>',
  "2 đội": '<svg viewBox="0 0 24 24"><path d="M12 3v18"/><circle cx="6.5" cy="9" r="2.6"/><circle cx="17.5" cy="9" r="2.6"/><path d="M2.5 18a4 4 0 0 1 8 0M13.5 18a4 4 0 0 1 8 0"/></svg>'
};
GAMES.forEach(g => { g.gest = GEST_OF[g.id] || "tap"; });


function downloadBlob(blob, filename) {
  const a = h("a", { href: URL.createObjectURL(blob), download: filename.replace(/[\\/:*?"<>|]/g, "").trim() || "tep" });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

/* ==========================================================
   NHẬP / XUẤT BỘ ĐỀ QUA FILE (Excel .xlsx, CSV, JSON) + FILE MẪU
   ========================================================== */
const XSHEETS = [
  { k: "quiz", name: "Trắc nghiệm", head: ["Câu hỏi", "Đáp án đúng", "Đáp án sai 1", "Đáp án sai 2", "Đáp án sai 3"], widths: [54, 24, 22, 22, 22], keys: ["trac nghiem", "quiz", "cau hoi"] },
  { k: "tf", name: "Đúng Sai", head: ["Phát biểu", "Đúng hay Sai (Đ/S)"], widths: [72, 20], list: { col: "B", values: "Đ,S" }, keys: ["dung sai", "dung/sai", "dung - sai", "true"] },
  { k: "match", name: "Nối cặp", head: ["Vế trái", "Vế phải (ghép đúng với vế trái)"], widths: [36, 52], keys: ["noi cap", "cap ghep", "ghep cap", "noi", "match"] },
  { k: "sort", name: "Phân loại", head: ["Tên nhóm", "Thẻ 1", "Thẻ 2", "Thẻ 3", "Thẻ 4", "Thẻ 5", "Thẻ 6"], widths: [24, 18, 18, 18, 18, 18, 18], keys: ["phan loai", "phan nhom", "nhom"] },
  { k: "order", name: "Thứ tự", head: ["Tiêu đề", "Mục 1 (đầu tiên)", "Mục 2", "Mục 3", "Mục 4", "Mục 5", "Mục 6", "Mục 7"], widths: [34, 20, 20, 20, 20, 20, 20, 20], keys: ["thu tu", "sap xep", "trinh tu"] },
  { k: "words", name: "Từ khóa", head: ["Từ khóa", "Gợi ý"], widths: [28, 66], keys: ["tu khoa", "o chu", "tu vung", "xep chu"] }
];
const HEAD_FIRST = ["cau hoi", "phat bieu", "ve trai", "ten nhom", "tieu de", "tu khoa", "noi dung", "stt"];
const normTxt = s => baseChar(String(s ?? "")).toLowerCase().replace(/[_\-–]+/g, " ").replace(/\s+/g, " ").trim();
const cleanCell = v => String(v ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim();

/* bộ đề → các dòng Excel */
function setToRows(set, k, limit) {
  const items = SECS.find(x => x.k === k).p(set[k] || "").items.slice(0, limit || 1e9);
  switch (k) {
    case "quiz": return items.map(q => [q.q, q.opts[q.ans], ...q.opts.filter((_, i) => i !== q.ans)]);
    case "tf": return items.map(t => [t.s, t.v ? "Đ" : "S"]);
    case "match": return items.map(m => [m.a, m.b]);
    case "sort": return items.map(g => [g.name, ...g.items]);
    case "order": return items.map(o => [o.title, ...o.seq]);
    case "words": return items.map(w => [w.w, w.hint === "Không có gợi ý" ? "" : w.hint]);
  }
  return [];
}
/* các dòng Excel → dạng văn bản của ô soạn đề (kèm số dòng gốc để báo lỗi) */
function rowsToLines(k, rows) {
  const lines = [], rowNo = [];
  rows.forEach((r, i) => {
    const c = (r || []).map(cleanCell); if (!c.some(Boolean)) return;
    if (i === 0 && HEAD_FIRST.some(hd => normTxt(c[0]).startsWith(hd))) return;
    let line = "";
    const rest = c.slice(1).filter(Boolean);
    switch (k) {
      case "quiz": { const [q, ok, ...w] = c; const wr = w.filter(Boolean).map(x => x.replace(/^\*+/, ""));
        line = ok ? [q, "*" + ok.replace(/^\*+/, ""), ...wr].join(" | ") : [q, ...wr].join(" | "); break; }
      case "tf": line = `${c[0]} | ${c[1] || ""}`; break;
      case "match": line = `${c[0]} | ${c[1] || ""}`; break;
      case "sort": line = `${c[0].replace(/:/g, " -")}: ${rest.join(" | ")}`; break;
      case "order": line = `${c[0].replace(/:/g, " -")}: ${rest.join(" | ")}`; break;
      case "words": line = c[1] ? `${c[0]} | ${c[1]}` : c[0]; break;
    }
    lines.push(line); rowNo.push(i + 1);
  });
  return { lines, rowNo };
}
function sheetKind(name, rows) {
  const n = normTxt(name);
  for (const x of XSHEETS) if (x.keys.some(key => n.includes(key))) return x.k;
  const h0 = normTxt(rows?.[0]?.[0]);
  if (h0.startsWith("phat bieu")) return "tf"; if (h0.startsWith("ve trai")) return "match"; if (h0.startsWith("ten nhom")) return "sort";
  if (h0.startsWith("tieu de")) return "order"; if (h0.startsWith("tu khoa")) return "words"; if (h0.startsWith("cau hoi")) return "quiz";
  return null;
}

/* tạo workbook: file mẫu (có ví dụ) hoặc xuất bộ đề */
function buildWorkbook(set, template) {
  const guide = [
    ["LỚP HỌC VẪY TAY · FILE CÂU HỎI"], [],
    ["Tên bộ đề", set.name || ""], ["Môn", set.subject || ""], ["Lớp", set.grade || ""], ["Ngày dạy", set.date ? fmtDate(set.date, false) : ""],
    ["Chủ đề / Bài", set.topic || ""], ["Nhãn", (set.tags || []).join(", ")], [],
    ["CÁCH ĐIỀN"],
    ["1. Mỗi trang (các tab ở dưới cùng) là một loại câu hỏi, mỗi dòng là một câu. Không bắt buộc điền đủ cả 6 trang."],
    ["2. Trắc nghiệm: cột B là đáp án ĐÚNG, cột C–E là các đáp án sai (ít nhất 1). Khi chơi, máy tự xáo trộn thứ tự đáp án."],
    ["3. Đúng Sai: cột B ghi Đ (đúng) hoặc S (sai). Dùng cho Đúng hay Sai, Xây tháp và Bom hẹn giờ."],
    ["4. Nối cặp: vế trái và vế phải là một cặp đúng. Dùng cho Nối cặp, Lật thẻ trí nhớ và Bingo."],
    ["5. Phân loại: mỗi dòng là một nhóm, các thẻ của nhóm điền ở cột bên phải. Cần ít nhất 2 nhóm."],
    ["6. Thứ tự: điền các mục theo ĐÚNG thứ tự từ cột B (3–7 mục). Khi chơi, máy tự xáo trộn."],
    ["7. Từ khóa: từ hoặc cụm từ (tối đa 20 chữ cái) kèm gợi ý. Dùng cho Ô chữ bí ẩn, Xếp chữ, Tìm chữ và Bingo."],
    ["8. Các ô đã để định dạng Văn bản: gõ 3/4 hay 0,5 sẽ giữ nguyên, không bị đổi thành ngày tháng."],
    ["9. Ô Ngày dạy ghi dạng ngày/tháng/năm, ví dụ 15/10/2026. Nhãn cách nhau bằng dấu phẩy, ví dụ: ôn tập, học kì 1."],
    ["10. Lưu file dạng .xlsx, rồi vào mục Bộ đề → Nhập từ file."],
    ...(template ? [[], ["Mỗi trang đã có vài dòng ví dụ. Hãy xóa và thay bằng câu hỏi của bạn."]] : [])
  ];
  const sheets = [{ name: "Hướng dẫn", rows: guide, widths: [22, 90],
    styleOf: (r, c) => r === 0 || r === 9 ? 4 : (r >= 2 && r <= 7) ? (c === 0 ? 1 : 5) : r > 9 ? 0 : 2 }];
  for (const x of XSHEETS) sheets.push({ name: x.name, header: true, widths: x.widths, list: x.list, rows: [x.head, ...setToRows(set, x.k, template ? 3 : 0)] });
  return XL.write(sheets);
}

/* đổi thông báo lỗi của ô soạn đề sang lời chỉ dẫn theo cột Excel */
function excelMsg(k, m) {
  if (k === "quiz") return m.includes("*") ? "chưa có đáp án đúng ở cột B" : "cần câu hỏi (cột A), đáp án đúng (cột B) và ít nhất 1 đáp án sai (cột C)";
  if (k === "tf") return "cột B phải ghi Đ hoặc S";
  if (k === "match") return "thiếu vế trái (cột A) hoặc vế phải (cột B)";
  if (k === "sort") return m.includes("2 nhóm") ? "cần ít nhất 2 nhóm (2 dòng)" : "cần tên nhóm (cột A) và ít nhất 1 thẻ (từ cột B)";
  if (k === "order") return "cần từ 3 đến 7 mục, điền từ cột B";
  if (k === "words") return m.includes("dài") ? "từ khóa quá dài (tối đa 20 chữ cái)" : "cột A cần có từ khóa";
  return m;
}
/* đọc file bất kỳ → kết quả xem trước */
async function readQuestionFile(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (ext === "xls") throw new Error("Tệp .xls là định dạng Excel đời cũ. Hãy mở bằng Excel, chọn Lưu thành (Save As) → Sổ làm việc Excel (.xlsx) rồi nhập lại.");
  if (ext === "json") {
    let arr = JSON.parse(await file.text()); if (!Array.isArray(arr)) arr = [arr];
    const sets = arr.filter(s => s && typeof s.name === "string");
    if (!sets.length) throw new Error("Tệp .json không có bộ đề hợp lệ.");
    return { kind: "json", sets };
  }
  let sheets;
  if (ext === "xlsx" || ext === "xlsm") sheets = await XL.read(await file.arrayBuffer());
  else if (ext === "csv" || ext === "txt" || ext === "tsv") sheets = [{ name: file.name, rows: XL.parseCSV(await file.text()) }];
  else throw new Error("Chưa hỗ trợ loại tệp này. Hãy dùng Excel (.xlsx), CSV hoặc .json.");
  const res = { kind: "rows", file: file.name, name: file.name.replace(/\.[^.]+$/, ""), subject: "", grade: "", date: "", topic: "", tags: [], data: {}, counts: {}, errors: [], used: [] };
  for (const sh of sheets) {
    const n = normTxt(sh.name);
    if (n.includes("huong dan") || n.includes("thong tin")) {
      for (const r of sh.rows) {
        const a = normTxt(r?.[0]), v = String(r?.[1] ?? "").trim(); if (!v) continue;
        if (a === "ten bo de") res.name = v;
        else if (a.startsWith("mon") && a.includes("lop")) { const p = v.split("·").map(x => x.trim()); res.subject = p[0] || ""; res.grade = p.slice(1).join(" · "); } // file mẫu cũ
        else if (a.startsWith("mon")) res.subject = v;
        else if (a.startsWith("lop") || a.startsWith("khoi")) res.grade = /^\d+$/.test(v) ? "Lớp " + v : v;
        else if (a.startsWith("ngay")) res.date = parseDateCell(v);
        else if (a.startsWith("chu de") || a.startsWith("bai")) res.topic = v;
        else if (a.startsWith("nhan") || a.startsWith("the")) res.tags = v.split(/[,;]/).map(x => x.trim()).filter(Boolean);
      }
      continue;
    }
    const k = sheetKind(sh.name, sh.rows) || (sheets.length === 1 ? "quiz" : null);
    if (!k) continue;
    const { lines, rowNo } = rowsToLines(k, sh.rows); if (!lines.length) continue;
    const text = lines.join("\n"), sec = SECS.find(x => x.k === k), r = sec.p(text);
    res.data[k] = (res.data[k] ? res.data[k] + "\n" : "") + text;
    res.counts[k] = (res.counts[k] || 0) + r.items.length;
    r.errors.forEach(e => res.errors.push({ sheet: sh.name, row: e.n ? rowNo[e.n - 1] : 0, msg: excelMsg(k, e.msg) }));
    res.used.push(sh.name);
  }
  if (!Object.values(res.counts).some(Boolean)) throw new Error("Không tìm thấy câu hỏi nào trong tệp. Hãy dùng đúng file mẫu (tải ở nút “Tải file mẫu Excel”).");
  return res;
}
const templateFileName = () => "Mau-cau-hoi-Lop-Hoc-Vay-Tay.xlsx";
function downloadTemplate() {
  const base = SAMPLE_SETS[0], set = { name: "Bộ đề mới", subject: "Khoa học", grade: "Lớp 5", date: todayStr(), topic: "Ôn tập chương 1", tags: ["ôn tập"] };
  SECS.forEach(x => set[x.k] = base[x.k]);
  downloadBlob(buildWorkbook(set, true), templateFileName()); toast("Đã tải file mẫu. Mở bằng Excel hoặc Google Sheets để điền câu hỏi.", 4000);
}

/* ==========================================================
   THIẾT LẬP RIÊNG CHO TỪNG TRÒ CHƠI (thời gian, số câu, mạng, tốc độ…) + mức Dễ / Vừa / Khó
   ========================================================== */
const fmtSec = v => v ? `${v} giây` : "Không giới hạn";
const fmtMin = v => v ? `${v} phút` : "Không giới hạn";
const R_ = (k, label, min, max, step, def, fmt, extra = {}) => ({ k, label, type: "range", min, max, step, def, fmt, ...extra });
const T_ = (k, label, def, sub) => ({ k, label, type: "toggle", def, sub });
const SPEED_ = { k: "speed", label: "Tốc độ", type: "seg", def: "normal", opts: [["slow", "Chậm"], ["normal", "Vừa"], ["fast", "Nhanh"]] };
const SPEED_F = { slow: .7, normal: 1, fast: 1.35 };
const qCnt = (u, src) => R_("count", `Số ${u} mỗi lượt`, 3, 30, 1, () => S.qCount, v => `${v} ${u}`, { src });
const qTime = (def) => R_("time", "Thời gian mỗi câu", 5, 60, 1, def || (() => S.qTime), v => `${v} giây`);
const GAME_OPTS = {
  quiz: { opts: [qCnt("câu", "quiz"), qTime(), T_("bonus", "Thưởng điểm khi trả lời nhanh", true, "Trả lời càng nhanh càng được nhiều điểm; chuỗi câu đúng liên tiếp được cộng thêm.")],
    presets: { easy: { time: 30, bonus: false }, normal: { time: 20, bonus: true }, hard: { time: 10, bonus: true } } },
  tf: { opts: [qCnt("phát biểu", "tf"), qTime()],
    presets: { easy: { time: 20 }, normal: { time: 12 }, hard: { time: 6 } } },
  tiles: { opts: [R_("count", "Số ô cửa", 4, 12, 1, 12, v => `${v} ô`, { src: "quiz" }), qTime(), T_("double", "Có ô bí mật nhân đôi điểm", true)],
    presets: { easy: { time: 30 }, normal: { time: 20 }, hard: { time: 12 } } },
  match: { opts: [R_("count", "Tổng số cặp", 4, 20, 1, 15, v => `${v} cặp`, { src: "match" }), R_("per", "Số cặp mỗi lượt", 3, 6, 1, 5, v => `${v} cặp`), R_("limit", "Giới hạn thời gian cả trò", 0, 10, 1, 0, fmtMin)],
    presets: { easy: { per: 3, limit: 0 }, normal: { per: 5, limit: 0 }, hard: { per: 6, limit: 3 } } },
  memory: { opts: [R_("count", "Số cặp thẻ", 3, 8, 1, 6, v => `${v} cặp (${v * 2} thẻ)`, { src: "match" }), R_("peek", "Thời gian xem lại khi lật sai", .5, 2.5, .1, 1, v => `${vi(v)} giây`), R_("limit", "Giới hạn thời gian cả trò", 0, 10, 1, 0, fmtMin)],
    presets: { easy: { count: 4, peek: 1.8, limit: 0 }, normal: { count: 6, peek: 1, limit: 0 }, hard: { count: 8, peek: .6, limit: 3 } } },
  sort: { opts: [R_("count", "Số thẻ cần xếp", 6, 24, 1, 16, v => `${v} thẻ`, { src: "sortItems" }), R_("limit", "Giới hạn thời gian cả trò", 0, 10, 1, 0, fmtMin)],
    presets: { easy: { count: 8, limit: 0 }, normal: { count: 12, limit: 0 }, hard: { count: 16, limit: 2 } } },
  order: { opts: [qCnt("dãy", "order"), R_("time", "Thời gian mỗi dãy", 0, 120, 5, 0, fmtSec)],
    presets: { easy: { time: 0 }, normal: { time: 60 }, hard: { time: 30 } } },
  bubble: { opts: [qCnt("câu", "quiz"), qTime(), R_("lives", "Số mạng", 1, 5, 1, 3, v => `${v} mạng`), SPEED_],
    presets: { easy: { time: 30, lives: 5, speed: "slow" }, normal: { time: 20, lives: 3, speed: "normal" }, hard: { time: 12, lives: 2, speed: "fast" } } },
  slice: { opts: [qCnt("câu", "quiz"), qTime(), R_("lives", "Số mạng", 1, 5, 1, 3, v => `${v} mạng`), SPEED_],
    presets: { easy: { time: 30, lives: 5, speed: "slow" }, normal: { time: 20, lives: 3, speed: "normal" }, hard: { time: 12, lives: 2, speed: "fast" } } },
  catch: { opts: [R_("count", "Số vòng", 1, 4, 1, 3, v => `${v} vòng`, { src: "sort" }), R_("time", "Thời gian mỗi vòng", 15, 60, 5, 25, v => `${v} giây`), SPEED_],
    presets: { easy: { time: 30, speed: "slow" }, normal: { time: 25, speed: "normal" }, hard: { time: 20, speed: "fast" } } },
  word: { opts: [qCnt("từ", "words"), R_("wrong", "Số lần đoán sai cho phép", 3, 10, 1, 6, v => `${v} lần`), R_("time", "Thời gian mỗi từ", 0, 120, 10, 0, fmtSec)],
    presets: { easy: { wrong: 8, time: 0 }, normal: { wrong: 6, time: 90 }, hard: { wrong: 4, time: 45 } } },
  scramble: { opts: [qCnt("từ", "words"), R_("time", "Thời gian mỗi từ", 0, 120, 10, 0, fmtSec), T_("hint", "Cho phép dùng gợi ý", true, "Mỗi lần gợi ý mở giúp một chữ cái, trừ 20 điểm.")],
    presets: { easy: { time: 0, hint: true }, normal: { time: 60, hint: true }, hard: { time: 30, hint: false } } },
  tug: { opts: [R_("count", "Số câu tối đa", 4, 30, 1, () => Math.max(S.qCount, 8), v => `${v} câu`, { src: "quiz" }), R_("win", "Số nấc kéo để thắng", 2, 5, 1, 3, v => `${v} nấc`), qTime()],
    presets: { easy: { win: 2, time: 25 }, normal: { win: 3, time: 15 }, hard: { win: 4, time: 8 } } },
  millionaire: { opts: [R_("count", "Số nấc câu hỏi", 5, 15, 1, 10, v => `${v} nấc`, { src: "quiz" }), R_("time", "Thời gian mỗi câu", 0, 60, 5, 30, fmtSec), T_("life", "Có 3 quyền trợ giúp", true, "50:50, Hỏi ý kiến lớp, Đổi câu hỏi — mỗi quyền dùng một lần.")],
    presets: { easy: { time: 0, life: true }, normal: { time: 30, life: true }, hard: { time: 15, life: false } } },
  wheel: { opts: [qCnt("lượt", "quiz"), qTime(), T_("risk", "Có ô MẤT LƯỢT và ô ×2", true, "Tăng tính may rủi: ô ×2 nhân đôi tổng điểm, ô MẤT LƯỢT bỏ qua câu hỏi.")],
    presets: { easy: { time: 30, risk: false }, normal: { time: 20, risk: true }, hard: { time: 10, risk: true } } },
  bomb: { opts: [R_("count", "Số câu cần gỡ bom", 5, 40, 1, 15, v => `${v} câu`, { src: "quizTf" }), R_("start", "Thời gian ngòi bom ban đầu", 15, 120, 5, 45, v => `${v} giây`), R_("bonus", "Thưởng mỗi câu đúng", 1, 8, 1, 3, v => `+${v} giây`)],
    presets: { easy: { start: 75, bonus: 5 }, normal: { start: 45, bonus: 3 }, hard: { start: 25, bonus: 2 } } },
  bingo: { opts: [{ k: "size", label: "Bảng", type: "seg", def: "4", opts: [["3", "3×3"], ["4", "4×4"], ["5", "5×5"]] }, R_("time", "Thời gian mỗi lượt gọi", 5, 60, 1, 20, v => `${v} giây`)],
    presets: { easy: { size: "3", time: 30 }, normal: { size: "4", time: 20 }, hard: { size: "5", time: 12 } } },
  tower: { opts: [qCnt("phát biểu", "tf"), R_("time", "Thời gian mỗi phát biểu", 0, 60, 5, 15, fmtSec)],
    presets: { easy: { time: 0 }, normal: { time: 15 }, hard: { time: 8 } } },
  race: { opts: [qCnt("câu", "quiz"), R_("time", "Thời gian cổng chạy tới", 5, 30, 1, 12, v => `${v} giây`), R_("lives", "Số mạng", 1, 5, 1, 3, v => `${v} mạng`), SPEED_],
    presets: { easy: { time: 18, lives: 5, speed: "slow" }, normal: { time: 12, lives: 3, speed: "normal" }, hard: { time: 8, lives: 2, speed: "fast" } } },
  mole: { opts: [qCnt("câu", "quiz"), qTime(), R_("lives", "Số mạng", 1, 5, 1, 3, v => `${v} mạng`), SPEED_],
    presets: { easy: { time: 30, lives: 5, speed: "slow" }, normal: { time: 20, lives: 3, speed: "normal" }, hard: { time: 12, lives: 2, speed: "fast" } } },
  hoop: { opts: [qCnt("câu", "quiz"), qTime(), R_("lives", "Số mạng", 1, 5, 1, 3, v => `${v} mạng`), T_("move", "Rổ di chuyển qua lại", true, "Rổ lắc nhẹ sang hai bên, khó ném trúng hơn.")],
    presets: { easy: { time: 30, lives: 5, move: false }, normal: { time: 20, lives: 3, move: true }, hard: { time: 12, lives: 2, move: true } } },
  search: { opts: [R_("count", "Số từ cần tìm", 2, 10, 1, 6, v => `${v} từ`, { src: "words" }), { k: "dirs", label: "Hướng chữ", type: "seg", def: "diag", opts: [["basic", "Ngang, dọc"], ["diag", "Thêm chéo"], ["all", "Cả chiều ngược"]] }, T_("show", "Hiện sẵn từ cần tìm", true, "Tắt để chỉ hiện gợi ý và số chữ cái, khó hơn."), R_("limit", "Giới hạn thời gian cả trò", 0, 10, 1, 0, fmtMin)],
    presets: { easy: { count: 4, dirs: "basic", show: true, limit: 0 }, normal: { count: 6, dirs: "diag", show: true, limit: 0 }, hard: { count: 8, dirs: "all", show: false, limit: 4 } } },
  buzz: { opts: [R_("count", "Số câu hỏi", 4, 30, 1, () => Math.max(S.qCount, 8), v => `${v} câu`, { src: "quiz" }), R_("read", "Thời gian đọc trước khi mở chuông", 0, 6, 1, 2, v => v ? `${v} giây` : "Mở ngay"), R_("time", "Thời gian trả lời sau khi bấm", 5, 30, 1, 10, v => `${v} giây`)],
    presets: { easy: { read: 4, time: 15 }, normal: { read: 2, time: 10 }, hard: { read: 1, time: 6 } } },
};
S.games = S.games && typeof S.games === "object" ? S.games : {};
function G(gid, k) {
  const o = GAME_OPTS[gid]?.opts.find(x => x.k === k); if (!o) return undefined;
  const v = S.games[gid]?.[k];
  return v ?? (typeof o.def === "function" ? o.def() : o.def);
}
function setG(gid, k, v) { (S.games[gid] = S.games[gid] || {})[k] = v; saveS(); }
function presetOf(gid) {
  const P = GAME_OPTS[gid]?.presets; if (!P) return "";
  if (!S.games[gid] || !Object.keys(S.games[gid]).length) return "default";
  for (const [name, vals] of Object.entries(P)) if (Object.entries(vals).every(([k, v]) => G(gid, k) === v)) return name;
  return "custom";
}
function availFor(src, data) {
  if (!src || !data) return null;
  if (src === "quizTf") return data.quiz.length + data.tf.length;
  if (src === "sortItems") return data.sort.slice(0, 4).reduce((a, c) => a + c.items.length, 0);
  return (data[src] || []).length;
}
function optSummary(gid, data) {
  const parts = [];
  for (const o of GAME_OPTS[gid]?.opts || []) {
    const v = G(gid, o.k);
    if (o.type === "range") { let t = o.fmt(v); const av = availFor(o.src, data); if (av != null && o.k === "count" && av < v) t = `${o.fmt(av)} (bộ đề chỉ có ${av})`; if (!(v === 0 && o.k === "limit")) parts.push(t); }
    else if (o.type === "seg") parts.push(`${o.label} ${o.opts.find(x => x[0] === v)?.[1].toLowerCase()}`);
    else if (o.type === "toggle" && o.k === "bonus" && v) parts.push("thưởng tốc độ");
    else if (o.type === "toggle" && !v) parts.push({ hint: "không gợi ý", double: "không ô nhân đôi", life: "không trợ giúp", risk: "không ô may rủi", move: "rổ đứng yên", show: "ẩn từ cần tìm" }[o.k] || "");
  }
  return parts.filter(Boolean);
}
/* bảng chỉnh cho một trò: dùng ở màn giới thiệu và trong Cài đặt */
function gameOptsPanel(g, data, onChange) {
  const box = h("div", { class: "gopts" });
  const paint = () => {
    box.innerHTML = "";
    const cur = presetOf(g.id);
    const pre = h("div", { class: "gopt-pre" }, h("span", { class: "muted" }, "Mức độ:"),
      ...[["easy", "Dễ"], ["normal", "Vừa"], ["hard", "Khó"]].map(([k, l]) => on(h("button", { class: "pchip sm" + (cur === k ? " active" : ""), "data-hit": true }, l), () => {
        const vals = GAME_OPTS[g.id].presets[k]; S.games[g.id] = { ...(S.games[g.id] || {}), ...vals }; saveS(); paint(); onChange?.();
      })),
      cur === "custom" ? h("span", { class: "badge" }, "Tùy chỉnh") : null,
      on(h("button", { class: "btn sm ghost", "data-hit": true }, "Về mặc định"), () => { delete S.games[g.id]; saveS(); paint(); onChange?.(); }));
    const grid = h("div", { class: "gopt-grid" });
    for (const o of GAME_OPTS[g.id].opts) {
      const id = `go-${g.id}-${o.k}`, v = G(g.id, o.k);
      if (o.type === "range") {
        const av = availFor(o.src, data);
        const out = h("small", {}, o.fmt(v) + (av != null && av < v ? ` · bộ đề hiện có ${av}` : ""));
        const r = h("input", { type: "range", id, min: o.min, max: o.max, step: o.step, value: v });
        r.addEventListener("input", () => { const nv = +r.value; setG(g.id, o.k, nv); out.textContent = o.fmt(nv) + (av != null && av < nv ? ` · bộ đề hiện có ${av}` : ""); });
        r.addEventListener("change", () => { paint(); onChange?.(); });
        grid.append(h("label", { class: "field", for: id }, h("span", {}, o.label), r, out));
      } else if (o.type === "seg") {
        grid.append(h("div", { class: "field" }, h("span", {}, o.label), h("div", { class: "seg", role: "radiogroup" }, o.opts.map(([val, lab]) => {
          const inp = h("input", { type: "radio", name: id, id: `${id}-${val}`, value: val, checked: v === val });
          inp.addEventListener("change", () => { setG(g.id, o.k, val); paint(); onChange?.(); });
          return h("label", { for: `${id}-${val}` }, inp, h("span", {}, lab));
        }))));
      } else {
        const c = h("input", { type: "checkbox", id, checked: !!v });
        c.addEventListener("change", () => { setG(g.id, o.k, c.checked); paint(); onChange?.(); });
        grid.append(h("label", { class: "check", for: id, style: "align-items:flex-start" }, c, h("span", {}, o.label, o.sub ? h("small", { class: "muted", style: "display:block;font-weight:400" }, o.sub) : null)));
      }
    }
    box.append(pre, grid);
  };
  paint();
  return box;
}

/* ==========================================================
   THƯ VIỆN BỘ ĐỀ: lọc theo môn, lớp, ngày dạy; tìm kiếm; nhóm; yêu thích; lưu trữ; thao tác hàng loạt
   + trang soạn đề cho từng bộ + nhập / xuất file
   ========================================================== */
const LIB = Object.assign({ view: "all", time: "", subject: "", grade: "", q: "", sort: "date", group: "subject" }, store.get("lhvt4.lib", {}));
const saveLib = () => store.set("lhvt4.lib", { ...LIB, q: "" });
const IC = {
  star: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="M3 7h18v3H3z"/><path d="M5 10v9h14v-9M10 14h4"/></svg>',
  unbox: '<svg viewBox="0 0 24 24"><path d="M3 7h18v3H3z"/><path d="M5 10v9h14v-9M12 18v-5M9.5 15.5L12 13l2.5 2.5"/></svg>',
  xls: '<svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 13l4 5M13 13l-4 5"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5-5 5 5M5 3h14"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'
};
const icon = (k, cls = "") => h("span", { class: "ico " + cls, html: IC[k] });
function datalists() {
  const subs = [...new Set([...SETS.map(s => s.subject).filter(Boolean), ...SUBJECTS])], grs = [...new Set([...GRADES, ...SETS.map(s => s.grade).filter(Boolean)])];
  return [h("datalist", { id: "dl-subjects" }, subs.map(v => h("option", { value: v }))), h("datalist", { id: "dl-grades" }, grs.map(v => h("option", { value: v })))];
}
function inTime(s, t) {
  if (!t) return true;
  if (t === "nodate") return !s.date;
  if (!s.date) return false;
  const today = todayStr();
  if (t === "today") return s.date === today;
  if (t === "upcoming") return s.date > today;
  if (t === "month") return s.date.slice(0, 7) === today.slice(0, 7);
  if (t === "week") { const d = new Date(), dow = (d.getDay() + 6) % 7; return s.date >= todayStr(-dow) && s.date <= todayStr(6 - dow); }
  return true;
}

function SetsPage(opts = {}) {
  navPage = "sets";
  let mode = opts.edit ? "edit" : "lib", editId = opts.edit || null, pending = null, showImp = !!opts.import, sel = new Set();
  setScreen("sets", st => {
    const root = h("div", { class: "wrap" }); st.append(root);
    const UNIT = { quiz: "câu trắc nghiệm", tf: "câu đúng/sai", match: "cặp ghép", sort: "nhóm phân loại", order: "dãy thứ tự", words: "từ khóa" };
    const used = { quiz: "Trắc nghiệm nhanh, Ô cửa bí mật, Ai là triệu phú, Vòng quay may mắn, Bom hẹn giờ, Bingo, Chạm bong bóng, Chém đáp án, Đua xe, Đập chuột, Ném bóng rổ, Kéo co, Bấm chuông", tf: "Đúng hay Sai, Xây tháp Đúng – Sai, Bom hẹn giờ", match: "Nối cặp, Lật thẻ trí nhớ, Bingo", sort: "Phân loại, Hứng rổ (tối đa 4 nhóm)", order: "Sắp xếp thứ tự", words: "Ô chữ bí ẩn, Xếp chữ, Tìm chữ, Bingo" };
    const fileIn = h("input", { type: "file", id: "qfile", accept: ".xlsx,.xlsm,.csv,.tsv,.txt,.json,.xls", hidden: true });
    fileIn.addEventListener("change", () => { const f = fileIn.files[0]; fileIn.value = ""; if (f) handleFile(f); });
    const draw = () => { root.innerHTML = ""; root.append(fileIn, ...datalists()); mode === "edit" ? drawEditor() : drawLibrary(); };
    const useSet = s => { currentId = s.id; s.lastUsed = Date.now(); saveSets(); toast(`Đang dùng bộ đề: ${s.name}`, 2200); };
    const duplicate = s => { const c = migrateSet(JSON.parse(JSON.stringify(s))); Object.assign(c, { id: newSet().id, name: s.name + " (bản sao)", created: Date.now(), updated: Date.now(), lastUsed: 0, fav: false, archived: false }); SETS.push(c); saveSets(); return c; };
    const removeSets = ids => {
      if (SETS.length - ids.length < 1) { toast("Cần giữ lại ít nhất một bộ đề"); return false; }
      SETS = SETS.filter(s => !ids.includes(s.id)); if (!SETS.find(s => s.id === currentId)) currentId = SETS[0].id; saveSets(); return true;
    };

    /* ================= THƯ VIỆN ================= */
    function filtered() {
      const nq = normSearch(LIB.q.trim());
      let list = SETS.filter(s => LIB.view === "archived" ? s.archived : !s.archived);
      if (LIB.view === "fav") list = list.filter(s => s.fav);
      if (LIB.view === "recent") list = list.filter(s => s.lastUsed).sort((a, b) => b.lastUsed - a.lastUsed).slice(0, 20);
      list = list.filter(s => (!LIB.subject || s.subject === LIB.subject) && (!LIB.grade || s.grade === LIB.grade) && inTime(s, LIB.time));
      if (nq) list = list.filter(s => matchQ([s.name, s.subject, s.grade, s.topic, ...(s.tags || [])].join(" "), LIB.q));
      if (LIB.view !== "recent") {
        const by = { date: (a, b) => (b.date || "").localeCompare(a.date || "") || b.updated - a.updated, updated: (a, b) => b.updated - a.updated, name: (a, b) => a.name.localeCompare(b.name, "vi"), used: (a, b) => b.lastUsed - a.lastUsed || b.updated - a.updated }[LIB.sort];
        list.sort(by);
        if (LIB.sort === "date") list.sort((a, b) => (!a.date) - (!b.date)); // chưa đặt ngày xuống cuối
      }
      return list;
    }
    function groupsOf(list) {
      if (LIB.group === "none" || LIB.view === "recent") return [{ title: "", items: list }];
      const m = new Map();
      for (const s of list) {
        const key = LIB.group === "subject" ? (s.subject || "Chưa ghi môn") : s.date ? `Tháng ${+s.date.slice(5, 7)}/${s.date.slice(0, 4)}` : "Chưa đặt ngày dạy";
        if (!m.has(key)) m.set(key, []); m.get(key).push(s);
      }
      const arr = [...m].map(([title, items]) => ({ title, items }));
      if (LIB.group === "subject") arr.sort((a, b) => (a.title === "Chưa ghi môn") - (b.title === "Chưa ghi môn") || a.title.localeCompare(b.title, "vi"));
      else arr.sort((a, b) => (a.title === "Chưa đặt ngày dạy") - (b.title === "Chưa đặt ngày dạy") || (b.items[0].date || "").localeCompare(a.items[0].date || ""));
      return arr;
    }
    function drawLibrary() {
      setTitle("Bộ đề", "Thư viện câu hỏi: lọc theo môn, lớp và ngày dạy");
      const live = SETS.filter(s => !s.archived), cnt = f => live.filter(f).length;
      // thanh công cụ trên cùng
      root.append(h("div", { class: "lib-top" },
        h("div", { class: "row" },
          on(h("button", { class: "btn primary sm", "data-hit": true }, "+ Bộ đề mới"), () => { const s = newSet({ subject: LIB.subject, grade: LIB.grade, date: todayStr() }); SETS.push(s); saveSets(); editId = s.id; mode = "edit"; draw(); }),
          on(h("button", { class: "btn sm" + (showImp ? " on" : ""), "data-hit": true }, icon("up"), "Nhập từ file"), () => { showImp = !showImp; draw(); }),
          on(h("button", { class: "btn sm", "data-hit": true }, icon("down"), "Tải file mẫu Excel"), downloadTemplate)),
        h("div", { class: "row" },
          on(h("button", { class: "btn sm ghost", "data-hit": true }, "Sao lưu tất cả (.json)"), () => downloadBlob(new Blob([JSON.stringify(SETS, null, 2)], { type: "application/json" }), `Sao-luu-bo-de-${todayStr()}.json`)),
          on(h("button", { class: "btn sm ghost", "data-hit": true }, "Thêm lại đề mẫu"), () => { let a = 0; SAMPLE_SETS.forEach(s => { if (!SETS.find(x => x.id === s.id)) { SETS.push(migrateSet(JSON.parse(JSON.stringify(s)))); a++; } }); saveSets(); draw(); toast(a ? `Đã thêm lại ${a} bộ đề mẫu` : "Các bộ đề mẫu vẫn còn đủ"); }))));
      if (showImp || pending) { const imp = h("section", { class: "panel stack imp" }); root.append(imp); renderImp(imp); }

      // cột lọc
      const fbtn = (label, n, active, fn, dot) => on(h("button", { class: "fl" + (active ? " active" : ""), "data-hit": true }, dot ? h("i", { class: "fdot", style: `background:${dot}` }) : null, h("span", {}, label), n != null ? h("small", {}, n) : null), () => { fn(); sel.clear(); saveLib(); draw(); });
      const subjects = [...new Set(live.map(s => s.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
      const grades = [...new Set(live.map(s => s.grade).filter(Boolean))].sort((a, b) => GRADES.indexOf(a) - GRADES.indexOf(b) || a.localeCompare(b, "vi"));
      const search = h("input", { type: "search", id: "lib-q", class: "sp-search", placeholder: "Tìm bộ đề…", title: "Tìm theo tên, môn, chủ đề hoặc nhãn", value: LIB.q });
      search.addEventListener("input", () => { LIB.q = search.value; paintMain(); });
      const nActive = [LIB.view !== "all", LIB.time, LIB.subject, LIB.grade].filter(Boolean).length;
      const det = h("details", { class: "lib-filters", open: innerWidth > 1000 || undefined }, h("summary", {}, "Bộ lọc", nActive ? h("span", { class: "badge cur" }, `${nActive} đang bật`) : null));
      det.addEventListener("toggle", () => { if (innerWidth <= 1000) LIB.mobileOpen = det.open; });
      if (innerWidth <= 1000 && LIB.mobileOpen) det.open = true;
      const side = h("aside", { class: "panel lib-side" }, search, det);
      det.append(
        h("div", { class: "fgroup" }, h("div", { class: "flabel" }, "Thư viện"),
          fbtn("Tất cả bộ đề", live.length, LIB.view === "all", () => LIB.view = "all"),
          fbtn("Yêu thích", cnt(s => s.fav), LIB.view === "fav", () => LIB.view = "fav"),
          fbtn("Dùng gần đây", cnt(s => s.lastUsed), LIB.view === "recent", () => LIB.view = "recent"),
          fbtn("Lưu trữ", SETS.length - live.length, LIB.view === "archived", () => LIB.view = "archived")),
        h("div", { class: "fgroup" }, h("div", { class: "flabel" }, "Ngày dạy"),
          ...[["", "Mọi ngày"], ["today", "Hôm nay"], ["week", "Tuần này"], ["month", "Tháng này"], ["upcoming", "Sắp tới"], ["nodate", "Chưa đặt ngày"]].map(([v, l]) =>
            fbtn(l, v ? cnt(s => inTime(s, v)) : null, LIB.time === v, () => LIB.time = v))),
        h("div", { class: "fgroup" }, h("div", { class: "flabel" }, "Môn học"),
          fbtn("Tất cả môn", null, !LIB.subject, () => LIB.subject = ""),
          ...subjects.map(sb => fbtn(sb, cnt(s => s.subject === sb), LIB.subject === sb, () => LIB.subject = LIB.subject === sb ? "" : sb, subjectColor(sb)))),
        grades.length ? h("div", { class: "fgroup" }, h("div", { class: "flabel" }, "Lớp"),
          h("div", { class: "gchips" }, on(h("button", { class: "pchip sm" + (!LIB.grade ? " active" : ""), "data-hit": true }, "Tất cả"), () => { LIB.grade = ""; saveLib(); draw(); }),
            ...grades.map(g => on(h("button", { class: "pchip sm" + (LIB.grade === g ? " active" : ""), "data-hit": true }, g.replace("Lớp ", "L")), () => { LIB.grade = LIB.grade === g ? "" : g; saveLib(); draw(); })))) : "");

      // vùng danh sách
      const main = h("section", { class: "lib-main" });
      root.append(h("div", { class: "lib" }, side, main));
      function paintMain() {
        main.innerHTML = "";
        const list = filtered();
        const sel_ = h("select", { id: "lib-sort", "aria-label": "Sắp xếp" }, [["date", "Ngày dạy mới nhất"], ["updated", "Sửa gần đây"], ["used", "Dùng gần đây"], ["name", "Tên A → Z"]].map(([v, l]) => h("option", { value: v, selected: LIB.sort === v }, l)));
        sel_.addEventListener("change", () => { LIB.sort = sel_.value; saveLib(); paintMain(); });
        const grp = h("select", { id: "lib-group", "aria-label": "Nhóm theo" }, [["subject", "Nhóm theo môn"], ["month", "Nhóm theo tháng"], ["none", "Không nhóm"]].map(([v, l]) => h("option", { value: v, selected: LIB.group === v }, l)));
        grp.addEventListener("change", () => { LIB.group = grp.value; saveLib(); paintMain(); });
        const tags = [];
        const tag = (l, fn) => tags.push(on(h("button", { class: "ftag", "data-hit": true, title: "Bỏ lọc" }, l, " ✕"), () => { fn(); saveLib(); draw(); }));
        if (LIB.view !== "all") tag({ fav: "Yêu thích", recent: "Dùng gần đây", archived: "Lưu trữ" }[LIB.view], () => LIB.view = "all");
        if (LIB.time) tag({ today: "Hôm nay", week: "Tuần này", month: "Tháng này", upcoming: "Sắp tới", nodate: "Chưa đặt ngày" }[LIB.time], () => LIB.time = "");
        if (LIB.subject) tag(LIB.subject, () => LIB.subject = "");
        if (LIB.grade) tag(LIB.grade, () => LIB.grade = "");
        main.append(h("div", { class: "lib-bar" },
          h("div", { class: "row", style: "gap:8px" }, h("b", { class: "lib-count" }, `${list.length} bộ đề`), ...tags),
          h("div", { class: "row", style: "gap:8px" }, grp, sel_)));
        // thanh thao tác hàng loạt
        const selList = [...sel].map(id => SETS.find(s => s.id === id)).filter(Boolean);
        if (selList.length) {
          let armed = false;
          const del = on(h("button", { class: "btn sm danger", "data-hit": true }, icon("trash"), "Xóa"), () => {
            if (!armed) { armed = true; del.lastChild.textContent = `Bấm lần nữa để xóa ${selList.length} bộ đề`; return; }
            if (removeSets(selList.map(s => s.id))) { toast(`Đã xóa ${selList.length} bộ đề`); sel.clear(); draw(); }
          });
          const allArch = selList.every(s => s.archived);
          main.append(h("div", { class: "bulk" }, h("b", {}, `Đã chọn ${selList.length}`),
            on(h("button", { class: "btn sm", "data-hit": true }, icon("star"), "Yêu thích"), () => { const v = !selList.every(s => s.fav); selList.forEach(s => s.fav = v); saveSets(); paintMain(); }),
            on(h("button", { class: "btn sm", "data-hit": true }, icon(allArch ? "unbox" : "box"), allArch ? "Khôi phục" : "Lưu trữ"), () => { selList.forEach(s => s.archived = !allArch); saveSets(); toast(allArch ? "Đã khôi phục" : `Đã cất ${selList.length} bộ đề vào Lưu trữ`); sel.clear(); draw(); }),
            del, on(h("button", { class: "btn sm ghost", "data-hit": true }, "Bỏ chọn"), () => { sel.clear(); paintMain(); })));
        }
        if (!list.length) {
          main.append(h("div", { class: "panel empty" }, h("b", {}, LIB.q ? `Không tìm thấy bộ đề khớp “${LIB.q}”` : "Chưa có bộ đề nào ở mục này"),
            h("p", { class: "muted" }, LIB.view === "archived" ? "Bộ đề đã cất vào Lưu trữ sẽ hiện ở đây." : "Thử bỏ bớt bộ lọc, tạo bộ đề mới hoặc nhập từ file Excel."),
            h("div", { class: "row", style: "justify-content:center" }, on(h("button", { class: "btn sm", "data-hit": true }, "Bỏ tất cả bộ lọc"), () => { Object.assign(LIB, { view: "all", time: "", subject: "", grade: "", q: "" }); saveLib(); draw(); }))));
          return;
        }
        for (const g of groupsOf(list)) {
          const box = h("div", { class: "lib-group" });
          if (g.title) {
            const allSel = g.items.every(s => sel.has(s.id));
            const gc = h("input", { type: "checkbox", "aria-label": "Chọn cả nhóm " + g.title, checked: allSel });
            gc.addEventListener("change", () => { g.items.forEach(s => gc.checked ? sel.add(s.id) : sel.delete(s.id)); paintMain(); });
            box.append(h("div", { class: "lg-head" }, gc, LIB.group === "subject" ? h("i", { class: "fdot", style: `background:${subjectColor(g.title === "Chưa ghi môn" ? "" : g.title)}` }) : icon("cal", "sm"), h("b", {}, g.title), h("small", {}, `${g.items.length} bộ đề`)));
          }
          for (const s of g.items) box.append(rowOf(s));
          main.append(box);
        }
      }
      function rowOf(s) {
        const isCur = s.id === currentId, total = setTotal(s);
        const cb = h("input", { type: "checkbox", "aria-label": "Chọn " + s.name, checked: sel.has(s.id) });
        cb.addEventListener("change", () => { cb.checked ? sel.add(s.id) : sel.delete(s.id); paintMain(); });
        const star = on(h("button", { class: "ibtn star" + (s.fav ? " on" : ""), "data-hit": true, title: s.fav ? "Bỏ yêu thích" : "Yêu thích", "aria-label": "Yêu thích" }, icon("star")), e => { e.stopPropagation?.(); s.fav = !s.fav; saveSets(); paintMain(); });
        const today = s.date === todayStr(), past = s.date && s.date < todayStr();
        let armed = false;
        const del = on(h("button", { class: "ibtn danger", "data-hit": true, title: "Xóa", "aria-label": "Xóa" }, icon("trash")), () => {
          if (!armed) { armed = true; del.classList.add("armed"); del.title = "Bấm lần nữa để xóa"; toast("Bấm biểu tượng thùng rác lần nữa để xóa", 2000); setTimeout(() => { armed = false; del.classList.remove("armed"); }, 3000); return; }
          if (removeSets([s.id])) { toast(`Đã xóa “${s.name}”`); sel.delete(s.id); draw(); }
        });
        const open = () => { editId = s.id; mode = "edit"; draw(); };
        const name = on(h("button", { class: "lr-name", "data-hit": true, title: "Mở để soạn" }, s.name), open);
        return h("div", { class: "lrow" + (isCur ? " current" : "") + (sel.has(s.id) ? " sel" : "") },
          cb, star,
          h("div", { class: "lr-main" },
            h("div", { class: "lr-title" }, name, isCur ? h("span", { class: "badge cur" }, "Đang dùng") : null, s.archived ? h("span", { class: "badge" }, "Lưu trữ") : null),
            h("div", { class: "lr-meta" },
              s.subject ? h("span", { class: "subj", style: `--c:${subjectColor(s.subject)}` }, s.subject) : h("span", { class: "subj none" }, "Chưa ghi môn"),
              s.grade ? h("span", {}, s.grade) : null, s.topic ? h("span", {}, s.topic) : null,
              ...(s.tags || []).map(t => h("span", { class: "tg" }, "#" + t)))),
          h("div", { class: "lr-date" + (today ? " today" : past ? " past" : "") }, s.date ? [icon("cal", "sm"), fmtDate(s.date)] : h("span", { class: "muted" }, "—")),
          h("div", { class: "lr-count" }, h("b", {}, total), h("small", {}, "mục")),
          h("div", { class: "lr-act" },
            on(h("button", { class: "btn sm use" + (isCur ? " is-cur" : ""), "data-hit": true, disabled: isCur }, icon("play"), isCur ? "Đang dùng" : "Dùng"), () => { useSet(s); draw(); }),
            on(h("button", { class: "ibtn", "data-hit": true, title: "Soạn / sửa", "aria-label": "Soạn" }, icon("edit")), open),
            on(h("button", { class: "ibtn", "data-hit": true, title: "Nhân bản", "aria-label": "Nhân bản" }, icon("copy")), () => { const c = duplicate(s); toast(`Đã tạo “${c.name}”`); draw(); }),
            on(h("button", { class: "ibtn", "data-hit": true, title: "Xuất ra Excel", "aria-label": "Xuất ra Excel" }, icon("xls")), () => downloadBlob(buildWorkbook(s, false), `${s.name}.xlsx`)),
            on(h("button", { class: "ibtn", "data-hit": true, title: s.archived ? "Khôi phục" : "Cất vào Lưu trữ", "aria-label": "Lưu trữ" }, icon(s.archived ? "unbox" : "box")), () => { s.archived = !s.archived; saveSets(); toast(s.archived ? `Đã cất “${s.name}” vào Lưu trữ` : `Đã khôi phục “${s.name}”`); draw(); }),
            del));
      }
      paintMain();
    }

    /* ================= SOẠN MỘT BỘ ĐỀ ================= */
    function drawEditor() {
      const set = SETS.find(s => s.id === editId); if (!set) { mode = "lib"; return draw(); }
      setTitle("Soạn bộ đề", set.name);
      const f = (id, label, el) => h("label", { class: "field", for: id }, h("span", {}, label), el);
      const name = h("input", { type: "text", id: "ed-name", value: set.name });
      const subj = h("input", { type: "text", id: "ed-subject", value: set.subject, list: "dl-subjects", placeholder: "Ví dụ: Toán" });
      const grade = h("input", { type: "text", id: "ed-grade", value: set.grade, list: "dl-grades", placeholder: "Ví dụ: Lớp 5" });
      const date = h("input", { type: "date", id: "ed-date", value: set.date });
      const topic = h("input", { type: "text", id: "ed-topic", value: set.topic, placeholder: "Ví dụ: Bài 12 – Phân số" });
      const tags = h("input", { type: "text", id: "ed-tags", value: (set.tags || []).join(", "), placeholder: "Ví dụ: ôn tập, học kì 1, kiểm tra 15 phút" });
      const fav = h("input", { type: "checkbox", id: "ed-fav", checked: set.fav });
      const tas = {};
      const secs = SECS.map(x => {
        const ta = h("textarea", { id: "ed-" + x.k, spellcheck: "false" }); ta.value = set[x.k] || ""; tas[x.k] = ta;
        const stt = h("div", { class: "ed-status" });
        const chk = () => { const r = x.p(ta.value); stt.classList.toggle("bad", r.errors.length > 0); stt.textContent = `${r.items.length} ${x.unit} hợp lệ` + (r.errors.length ? ` · ${r.errors.length} lỗi: ` + r.errors.slice(0, 3).map(e => (e.n ? `dòng ${e.n} ` : "") + e.msg).join("; ") : ""); };
        ta.addEventListener("input", chk); chk();
        return h("div", { class: "ed-sec" }, h("h3", {}, x.t), h("small", { class: "muted" }, "Dùng cho: " + used[x.k] + ". Mỗi dòng một mục, dạng ", h("code", {}, x.fmt)), ta, stt);
      });
      const collect = () => {
        Object.assign(set, { name: name.value.trim() || "Bộ đề chưa đặt tên", subject: subj.value.trim(), grade: grade.value.trim(), date: date.value, topic: topic.value.trim(),
          tags: tags.value.split(/[,;]/).map(x => x.trim().replace(/^#/, "")).filter(Boolean), fav: fav.checked, updated: Date.now() });
        SECS.forEach(x => set[x.k] = tas[x.k].value);
      };
      const back = () => { collect(); saveSets(); mode = "lib"; draw(); };
      let armed = false;
      const del = on(h("button", { class: "btn sm danger", "data-hit": true }, "Xóa bộ đề"), () => {
        if (!armed) { armed = true; del.textContent = "Bấm lần nữa để xóa"; setTimeout(() => { armed = false; del.textContent = "Xóa bộ đề"; }, 3000); return; }
        if (removeSets([set.id])) { toast("Đã xóa bộ đề"); mode = "lib"; draw(); }
      });
      root.append(
        h("div", { class: "lib-top" }, on(h("button", { class: "btn sm", "data-hit": true }, icon("back"), "Thư viện bộ đề"), back),
          h("div", { class: "row" },
            on(h("button", { class: "btn primary sm", "data-hit": true }, "Lưu và dùng bộ đề này"), () => { collect(); useSet(set); draw(); }),
            on(h("button", { class: "btn sm", "data-hit": true }, "Lưu"), () => { collect(); saveSets(); toast("Đã lưu bộ đề"); draw(); }),
            on(h("button", { class: "btn sm", "data-hit": true }, icon("xls"), "Xuất ra Excel"), () => { collect(); saveSets(); downloadBlob(buildWorkbook(set, false), `${set.name || "bo-de"}.xlsx`); toast("Đã xuất bộ đề ra file Excel"); }),
            on(h("button", { class: "btn sm", "data-hit": true }, icon("up"), "Nhập thêm từ file"), () => { collect(); saveSets(); showImp = true; pending = null; editId = set.id; mode = "lib"; draw(); setTimeout(() => fileIn.click(), 50); }),
            on(h("button", { class: "btn sm", "data-hit": true }, "Nhân bản"), () => { collect(); const c = duplicate(set); editId = c.id; draw(); toast("Đã nhân bản, bạn đang sửa bản sao"); }),
            del)),
        h("section", { class: "panel stack", style: "gap:14px" },
          h("div", { class: "ed-meta" },
            h("div", { class: "span2" }, f("ed-name", "Tên bộ đề", name)),
            f("ed-subject", "Môn", subj), f("ed-grade", "Lớp", grade), f("ed-date", "Ngày dạy", date), f("ed-topic", "Chủ đề / Bài", topic),
            h("div", { class: "span2" }, f("ed-tags", "Nhãn (cách nhau bằng dấu phẩy)", tags))),
          h("label", { class: "check", for: "ed-fav" }, fav, "Đánh dấu yêu thích"),
          h("small", { class: "muted" }, `Tạo ${new Date(set.created).toLocaleDateString("vi-VN")} · Sửa lần cuối ${new Date(set.updated).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })} · Mẹo: có thể bôi đen các cột trong Excel rồi dán thẳng vào ô bên dưới; dòng bắt đầu bằng // là ghi chú.`)),
        ...secs);
    }

    /* ================= NHẬP TỪ FILE ================= */
    async function handleFile(f) {
      showImp = true; pending = { loading: f.name }; mode = "lib"; draw();
      try { pending = await readQuestionFile(f); if (pending.kind === "json") pending.file = f.name; }
      catch (e) { pending = { error: e.message || String(e), file: f.name }; Sfx.wrong(); }
      draw();
    }
    function renderImp(imp) {
      imp.append(h("div", { class: "sec-head" },
        h("div", {}, h("h3", {}, "Nhập câu hỏi từ file"), h("p", { class: "muted", style: "margin:4px 0 0" }, "Điền câu hỏi vào file mẫu Excel rồi nhập vào đây. Nhận file Excel (.xlsx), CSV và bản sao lưu .json.")),
        h("div", { class: "row" },
          on(h("button", { class: "btn sm", "data-hit": true }, icon("up"), "Chọn file để nhập"), () => fileIn.click()),
          on(h("button", { class: "btn sm ghost", "data-hit": true }, "Đóng"), () => { showImp = false; pending = null; draw(); }))));
      if (!pending) {
        const dz = h("label", { class: "dropzone", for: "qfile" },
          h("span", { class: "dz-ico", html: '<svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h8M8 9h2"/></svg>' }),
          h("b", {}, "Kéo thả file vào đây"), h("small", { class: "muted" }, "hoặc bấm để chọn file · .xlsx, .csv, .json"));
        ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
        ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("over"); }));
        dz.addEventListener("drop", e => { const f = e.dataTransfer?.files?.[0]; if (f) handleFile(f); });
        imp.append(dz, h("div", { class: "steps3" },
          h("div", {}, h("b", {}, "1. Tải file mẫu"), h("small", {}, "Trang Hướng dẫn có ô ghi Môn, Lớp, Ngày dạy, Chủ đề; 6 trang còn lại cho 6 loại câu hỏi.")),
          h("div", {}, h("b", {}, "2. Điền câu hỏi"), h("small", {}, "Mở bằng Excel hoặc Google Sheets, mỗi dòng một câu. Không cần điền đủ 6 trang.")),
          h("div", {}, h("b", {}, "3. Nhập vào đây"), h("small", {}, "Xem trước số câu và lỗi từng dòng, rồi tạo bộ đề mới hoặc thêm vào bộ đề có sẵn."))));
        return;
      }
      if (pending.loading) { imp.append(h("div", { class: "imp-box" }, h("div", { class: "spin", style: "width:28px;height:28px;border-width:4px" }), h("span", {}, `Đang đọc ${pending.loading}…`))); return; }
      const cancel = on(h("button", { class: "btn sm", "data-hit": true }, "Hủy"), () => { pending = null; draw(); });
      if (pending.error) { imp.append(h("div", { class: "imp-box bad" }, h("div", {}, h("b", {}, `Không nhập được “${pending.file}”`), h("p", { style: "margin:4px 0 0" }, pending.error)), cancel)); return; }
      if (pending.kind === "json") {
        const n = pending.sets.length;
        imp.append(h("div", { class: "imp-box" }, h("div", {}, h("b", {}, `Bản sao lưu “${pending.file}”`), h("p", { class: "muted", style: "margin:4px 0 0" }, `Có ${n} bộ đề: ${pending.sets.slice(0, 6).map(s => s.name).join(", ")}${n > 6 ? "…" : ""}`)),
          h("div", { class: "row" }, on(h("button", { class: "btn primary sm", "data-hit": true }, `Nhập ${n} bộ đề`), () => {
            pending.sets.forEach(s => { const c = migrateSet(JSON.parse(JSON.stringify(s))); c.id = newSet().id; SETS.push(c); });
            saveSets(); pending = null; showImp = false; draw(); toast(`Đã nhập ${n} bộ đề`); Sfx.right();
          }), cancel)));
        return;
      }
      const P = pending, total = Object.values(P.counts).reduce((a, b) => a + b, 0);
      const nm = h("input", { type: "text", id: "imp-name", value: P.name }), sj = h("input", { type: "text", id: "imp-subject", value: P.subject, list: "dl-subjects", placeholder: "Ví dụ: Toán" });
      const gr = h("input", { type: "text", id: "imp-grade", value: P.grade, list: "dl-grades", placeholder: "Ví dụ: Lớp 5" }), dt = h("input", { type: "date", id: "imp-date", value: P.date || todayStr() });
      const target = h("select", { id: "imp-target", "aria-label": "Bộ đề để thêm vào" },
        SETS.filter(s => !s.archived).sort((a, b) => b.updated - a.updated).map(s => h("option", { value: s.id, selected: s.id === (editId || currentId) }, `${s.name} — ${setMeta(s)}`)));
      const chips = h("div", { class: "chips" }, SECS.filter(x => P.counts[x.k]).map(x => h("span", { class: "chipinfo ok" }, `${P.counts[x.k]} ${UNIT[x.k]}`)));
      const errs = P.errors.length ? h("div", { class: "imp-errs" }, h("b", {}, `${P.errors.length} dòng chưa hợp lệ, sẽ không dùng khi chơi (sửa trong file rồi nhập lại, hoặc sửa trong trang soạn đề):`),
        h("ul", {}, P.errors.slice(0, 8).map(e => h("li", {}, `Trang “${e.sheet}”${e.row ? `, dòng ${e.row}` : ""}: ${e.msg}`)), P.errors.length > 8 ? h("li", {}, `… và ${P.errors.length - 8} dòng khác`) : null)) : null;
      const apply = mode_ => {
        let t;
        if (mode_ === "new") { t = newSet({ name: nm.value.trim() || P.name || "Bộ đề nhập từ file", subject: sj.value.trim(), grade: gr.value.trim(), date: dt.value, topic: P.topic, tags: P.tags }); SECS.forEach(x => t[x.k] = P.data[x.k] || ""); SETS.push(t); }
        else { t = SETS.find(s => s.id === target.value); SECS.forEach(x => { if (P.data[x.k]) t[x.k] = (t[x.k] || "").trim() ? t[x.k].trim() + "\n" + P.data[x.k] : P.data[x.k]; }); t.updated = Date.now(); }
        saveSets(); pending = null; showImp = false; Sfx.right();
        toast(mode_ === "new" ? `Đã tạo bộ đề “${t.name}” với ${total} mục` : `Đã thêm ${total} mục vào “${t.name}”`, 3500);
        editId = t.id; mode = "edit"; draw();
      };
      imp.append(h("div", { class: "imp-box ok" }, h("div", { class: "stack", style: "gap:12px;flex:1" },
        h("div", {}, h("b", {}, `Đọc được ${total} mục từ “${P.file}”`), h("p", { class: "muted", style: "margin:2px 0 0;font-size:13.5px" }, `Các trang đã đọc: ${P.used.join(", ")}`)),
        chips, errs,
        h("div", { class: "imp-opt" },
          h("div", { class: "stack", style: "gap:10px" }, h("b", {}, "Tạo bộ đề mới"),
            h("div", { class: "ed-meta" }, h("div", { class: "span2" }, h("label", { class: "field", for: "imp-name" }, h("span", {}, "Tên bộ đề"), nm)),
              h("label", { class: "field", for: "imp-subject" }, h("span", {}, "Môn"), sj), h("label", { class: "field", for: "imp-grade" }, h("span", {}, "Lớp"), gr),
              h("label", { class: "field", for: "imp-date" }, h("span", {}, "Ngày dạy"), dt)),
            h("div", { class: "row" }, on(h("button", { class: "btn primary sm", "data-hit": true }, "Tạo bộ đề mới"), () => apply("new")))),
          h("div", { class: "stack", style: "gap:10px" }, h("b", {}, "Hoặc thêm vào bộ đề có sẵn"),
            h("label", { class: "field", for: "imp-target" }, h("span", {}, "Chọn bộ đề"), target),
            h("div", { class: "row" }, on(h("button", { class: "btn sm", "data-hit": true }, "Thêm vào bộ đề đã chọn"), () => apply("append")), cancel))))));
    }
    draw();
  });
}

/* ==========================================================
   GIAO DIỆN & ĐIỀU HƯỚNG
   ========================================================== */
function camUI() {
  const b = $("#camBtn"); b.classList.toggle("cam-on", Cam.running); b.classList.toggle("cam-loading", Cam.loading);
  $("#camTxt").textContent = Cam.loading ? "Đang khởi động…" : Cam.running ? "Camera: bật" : "Bật camera";
  $("#camBox").classList.toggle("off", !(Cam.running && S.showCam));
  document.body.classList.toggle("ar", isAR());
  bgCv.style.opacity = isAR() ? 1 : Cam.running ? S.bgCam : 0;
  $("#loader").hidden = !Cam.loading; $("#loaderStep").textContent = Cam.step;
  $$("video.pv").forEach(v => { if (Cam.running && v.srcObject !== Cam.stream) { v.srcObject = Cam.stream; v.play().catch(() => {}); } if (!Cam.running) v.srcObject = null; });
  $$("[data-pv-empty]").forEach(e => e.hidden = Cam.running);
  $$("[data-cam-toggle]").forEach(e => e.textContent = Cam.running ? "Tắt camera" : Cam.loading ? "Đang khởi động…" : "Bật camera");
  $$("[data-cam-msg]").forEach(n => { n.textContent = camNote(); n.classList.toggle("err", !!Cam.err && !Cam.running); });
  $$("[data-cam-badge]").forEach(n => n.hidden = !Cam.running);
}
function camStats() {
  const el = $("#camStats"); if (!el) return;
  const cut = !Cam.running ? "–" : HAND_STYLES[handStyle()];
  el.innerHTML = `<div>Trạng thái<b>${Cam.running ? "Đang bật" : Cam.loading ? "Đang tải" : "Tắt"}</b></div><div>Bàn tay<b>${Cam.running ? DET.hands + " / " + S.hands : "–"}</b></div><div>Tốc độ<b>${Cam.running ? DET.fps + " hình/giây" : "–"}</b></div><div>Hiển thị tay<b>${cut}</b></div>`;
}
function onCameraReady() {
  if (!S.calibrated && !document.body.classList.contains("in-game")) go("practice");
}
/* menu trái: tự thu gọn trên màn hình hẹp (laptop 1366px), có thể tự bật / tắt */
function applyRail() {
  const mini = S.rail === "mini" || (S.rail !== "full" && innerWidth < 1500);
  document.body.classList.toggle("rail-mini", mini);
  const t = $("#railToggle"); if (t) { t.title = mini ? "Mở rộng menu" : "Thu gọn menu"; t.querySelector("span").textContent = mini ? "Mở rộng" : "Thu gọn menu"; }
}
addEventListener("resize", () => { if (!S.rail || S.rail === "auto") applyRail(); });
function applyTheme() {
  document.body.classList.toggle("light", S.theme === "light");
  $("#themeBtn").innerHTML = S.theme === "light"
    ? '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
    : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  if (Cam.newFrame === false && Cam.running) Cam.newFrame = true;
}

const stage = $("#stage");
let cleanup = null, screenName = "", navPage = "home";
function setScreen(name, fn, opts = {}) {
  TTS.stop(); TTS.last = "";
  if (cleanup) { try { cleanup(); } catch (e) {} }
  cleanup = null; frameHooks.clear(); stage.innerHTML = ""; stage.scrollTop = 0; screenName = name;
  if (mouseDrag) { endDrag(mouseDrag, 0, 0, true); mouseDrag = null; }
  for (const d of [...Drags]) endDrag(d, 0, 0, true);
  for (const p of Hands.values()) { p.drag = null; p.link = null; unpress(p.hover); p.hover = null; p.progress = 0; }
  document.body.classList.toggle("in-game", !!opts.game);
  $("#exitBtn").hidden = !opts.game;
  if (!opts.game) hud(null);
  $$("#nav [data-nav]").forEach(b => b.classList.toggle("active", b.dataset.nav === navPage));
  cleanup = fn(stage) || null;
  camUI(); camStats();
}
const setTitle = (t, sub = "") => { $("#pageTitle").textContent = t; $("#pageSub").textContent = sub; };
function hud(o) {
  const el = $("#hud");
  if (!o) { el.hidden = true; return; }
  el.hidden = false;
  const who = $("#hudWho"); who.hidden = !Play.player; if (Play.player) who.innerHTML = `Lượt của <b>${Play.player}</b>`;
  $("#hudProg").innerHTML = o.progress ?? ""; $("#hudProg").hidden = !o.progress;
  const sc = $("#hudScore");
  if (sc.textContent !== String(o.score)) { sc.textContent = o.score; const p = $("#hudScorePill"); p.classList.remove("bump"); void p.offsetWidth; p.classList.add("bump"); }
  $("#hudScorePill").hidden = o.score == null;
  $("#hudExtra").innerHTML = o.extra ?? ""; $("#hudExtra").hidden = !o.extra;
}
const heartHTML = (lives, max = 3) => `<span class="lives">${[...Array(max).keys()].map(k => HEART.replace("<svg", `<svg class="${k < lives ? "" : "off"}"`)).join("")}</span>`;
function go(page) {
  navPage = page;
  ({ home: Home, sets: SetsPage, stats: StatsPage, class: ClassPage, practice: CalibratePage, settings: SettingsPage }[page] || Home)();
}
let homeFilter = "Tất cả";
const normSearch = s => baseChar(String(s || "")).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/* tìm theo từng từ: mọi từ gõ vào đều phải xuất hiện (không phân biệt dấu, thứ tự, dấu câu) */
const matchQ = (text, q) => { const t = " " + normSearch(text) + " "; return normSearch(q).split(" ").filter(Boolean).every(w => t.includes(" " + w) ); };
let homePick = "recent";
function gameCover(g, big) { return gameArt(g, big); }
/* ảnh bìa trò chơi: nền màu theo trò, hoa văn theo nhóm, biểu tượng lớn */
function gameArt(g, big) {
  const slug = CAT_INFO[g.cat]?.slug || "answer";
  return h("div", { class: "gart" + (big ? " big" : ""), "data-pat": slug },
    h("span", { class: "gart-pat" }), h("span", { class: "gart-glyph", html: g.icon }),
    big ? h("span", { class: "gart-chip", html: g.icon }) : null,
    g.isNew && !big ? h("span", { class: "gnew" }, "Mới") : null,
    big ? null : h("span", { class: "gwho", html: (WHO_ICON[g.who] || "") + `<span>${g.who}</span>` }));
}
const gestTag = g => { const [l, ic] = GEST[g.gest] || GEST.tap; return h("span", { class: "gest", html: ic + `<span>${l}</span>` }); };
const RECENT_KEY = "lhvt4.recentGames";
const recentGames = () => store.get(RECENT_KEY, []).map(r => ({ ...r, g: GAMES.find(x => x.id === r.id) })).filter(r => r.g);
function noteRecent(id) { const l = store.get(RECENT_KEY, []).filter(r => r.id !== id); l.unshift({ id, at: Date.now(), n: (store.get(RECENT_KEY, []).find(r => r.id === id)?.n || 0) + 1 }); store.set(RECENT_KEY, l.slice(0, 8)); }
const agoTxt = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "vừa xong" : m < 60 ? `${m} phút trước` : m < 1440 ? `${Math.round(m / 60)} giờ trước` : `${Math.round(m / 1440)} ngày trước`; };

/* thẻ trò chơi trong sảnh */
function gameCard(g, data) {
  const ok = g.ok(data), p = presetOf(g.id);
  const c = h("button", { class: "gcard", "data-hit": true, "data-gid": g.id, style: `--c:${g.color}`, disabled: !ok, "aria-label": `${g.name}: ${g.desc}` },
    gameArt(g),
    h("div", { class: "gbody" },
      h("span", { class: "gname" }, g.name),
      h("span", { class: "gdesc" }, g.desc),
      h("span", { class: "gfoot" }, gestTag(g),
        h("span", { class: "gcount" }, ok ? g.count(data) : "Bộ đề thiếu dữ liệu"),
        p && !["normal", "default"].includes(p) ? h("span", { class: "glv" }, { easy: "Dễ", hard: "Khó", custom: "Tùy chỉnh" }[p]) : null,
        h("span", { class: "gplay", html: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>' }))));
  on(c, () => Intro(g)); return c;
}
/* sảnh chọn trò chơi: tiêu đề, bộ lọc, gợi ý hôm nay, các nhóm trò */
function Lobby(data, set) {
  const usable = GAMES.filter(g => g.ok(data)), root = h("section", { class: "lobby", id: "lobby" });
  const body = h("div", { class: "lobby-body" }), tabs = h("div", { class: "ltabs", role: "tablist", "aria-label": "Nhóm trò chơi" });
  const dice = on(h("button", { class: "btn dice", "data-hit": true, title: "Để máy chọn giúp một trò" },
    h("span", { class: "dice-ic", html: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.3"/><circle cx="15.5" cy="15.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="15.5" cy="8.5" r="1.3"/><circle cx="8.5" cy="15.5" r="1.3"/></svg>' }), "Chọn ngẫu nhiên"), () => roulette());
  root.append(h("div", { class: "lobby-head" },
    h("div", {}, h("h2", {}, "Chọn trò chơi"), h("p", {}, `${usable.length} trên ${GAMES.length} trò chơi dùng được với bộ đề “${set.name}”.`)), dice), tabs, body);
  const paintTabs = () => {
    tabs.innerHTML = "";
    CATS.forEach(c => {
      const n = c === "Tất cả" ? GAMES.length : GAMES.filter(g => g.cat === c).length;
      tabs.append(on(h("button", { class: "ltab" + (c === homeFilter ? " active" : ""), role: "tab", "aria-selected": c === homeFilter ? "true" : "false", "data-hit": true }, h("span", {}, c), h("b", {}, n)), () => {
        if (homeFilter === c) return; homeFilter = c; paintTabs(); paintBody(true);
      }));
    });
  };
  function spotlight() {
    const rec = recentGames().filter(r => r.g.ok(data)), news = GAMES.filter(g => g.isNew && g.ok(data));
    const pool = news.length ? news : usable; if (!pool.length) return null;
    const day = Math.floor(Date.now() / 864e5), cont = rec[0];
    const g = cont ? cont.g : pool[day % pool.length];
    const feat = h("div", { class: "feat", style: `--c:${g.color}` }, gameArt(g, true),
      h("div", { class: "feat-txt" },
        h("span", { class: "feat-lbl" }, cont ? `Chơi tiếp · lần trước ${agoTxt(cont.at)}` : "Gợi ý hôm nay"),
        h("h3", {}, g.name), h("p", {}, g.desc),
        h("div", { class: "feat-tags" }, gestTag(g), h("span", { class: "gest", html: (WHO_ICON[g.who] || "") + `<span>${g.who}</span>` }), h("span", { class: "gest plain" }, g.count(data))),
        h("div", { class: "row" }, on(h("button", { class: "btn primary lg", "data-hit": true }, "Chơi ngay"), () => Intro(g)))));
    const side = h("div", { class: "side-list" });
    const list = cont ? rec.slice(1, 5) : [];
    const rows = list.length ? list.map(r => [r.g, `${r.n} lượt · ${agoTxt(r.at)}`]) : news.filter(x => x !== g).slice(0, 4).map(x => [x, x.cat]);
    side.append(h("h3", {}, list.length ? "Chơi gần đây" : "Trò mới thêm"));
    rows.forEach(([x, sub]) => side.append(on(h("button", { class: "srow", "data-hit": true, style: `--c:${x.color}` }, h("span", { class: "srow-ic", html: x.icon }), h("span", { class: "srow-t" }, h("b", {}, x.name), h("small", {}, sub)), h("span", { class: "srow-go", html: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>' })), () => Intro(x))));
    if (!rows.length) return h("div", { class: "spot one" }, feat);
    return h("div", { class: "spot" }, feat, side);
  }
  function paintBody(anim) {
    body.innerHTML = "";
    if (homeFilter === "Tất cả") {
      const sp = spotlight(); if (sp) body.append(sp);
      CATS.slice(1).forEach(c => {
        const gs = GAMES.filter(g => g.cat === c); if (!gs.length) return;
        body.append(h("div", { class: "lgroup", "data-pat": CAT_INFO[c]?.slug },
          h("div", { class: "lgroup-head" }, h("h3", {}, c), h("p", {}, CAT_INFO[c]?.d || ""), h("span", { class: "lgroup-n" }, `${gs.length} trò`)),
          h("div", { class: "games" }, gs.map(g => gameCard(g, data)))));
      });
    } else {
      body.append(h("p", { class: "lgroup-desc" }, CAT_INFO[homeFilter]?.d || ""), h("div", { class: "games" }, GAMES.filter(g => g.cat === homeFilter).map(g => gameCard(g, data))));
    }
    if (anim) $$(".gcard", body).forEach((c, k) => c.animate?.([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: Math.min(k, 12) * 22, easing: "ease-out", fill: "backwards" }));
  }
  let spinning = false;
  function roulette() {
    if (spinning) return; const cards = $$(".gcard:not([disabled])", body); if (!cards.length) return;
    spinning = true; dice.disabled = true; root.scrollIntoView({ behavior: "smooth", block: "start" });
    const target = cards[Math.random() * cards.length | 0], steps = 16; let k = 0, cur = null;
    const tick = () => {
      if (!root.isConnected) { spinning = false; return; }
      cur?.classList.remove("spin-hi");
      let nx; do { nx = cards[Math.random() * cards.length | 0]; } while (cards.length > 1 && nx === cur);
      cur = k >= steps ? target : nx; cur.classList.add("spin-hi"); Sfx.tone(700 + (k % 5) * 90, .05, "square", .04);
      if (k >= steps) {
        cur.classList.remove("spin-hi"); cur.classList.add("picked"); Sfx.win(); FX.burstEl(cur, 30); cur.scrollIntoView({ behavior: "smooth", block: "center" });
        const g = GAMES.find(x => x.id === cur.dataset.gid); toast(`Máy chọn: ${g.name}`, 1600);
        setTimeout(() => { spinning = false; if (screenName === "home") Intro(g); }, 1400); return;
      }
      k++; setTimeout(tick, 60 + Math.pow(k / steps, 2.4) * 300);
    };
    tick();
  }
  paintTabs(); paintBody(false);
  return root;
}

/* ---------------- SẢNH TRÒ CHƠI ---------------- */
function Home() {
  navPage = "home";
  setScreen("home", st => {
    const set = curSet(), data = parseSet(set);
    setTitle("Sảnh trò chơi", `${GAMES.length} trò chơi · bộ đề: ${set.name}`);
    const camMain = on(h("button", { class: "btn primary lg", "data-hit": true, "data-cam-toggle": true }, "Bật camera"), toggleCam);
    const calib = on(h("button", { class: "btn lg", "data-hit": true }, "Hiệu chỉnh tay"), () => go("practice"));
    const step = (n, t, sub, done, fn) => on(h("button", { class: "qstep" + (done ? " done" : ""), "data-hit": true }, h("i", {}, done ? "✓" : n), h("span", {}, h("b", {}, t), h("small", {}, sub))), fn);
    const quick = h("div", { class: "qsteps" },
      step(1, "Bật camera", Cam.running ? `Đang bật · ${DET.fps || "…"} hình/giây` : "Cho phép trình duyệt dùng webcam", Cam.running, toggleCam),
      step(2, "Hiệu chỉnh tay", S.calibrated ? "Đã hiệu chỉnh trên máy này" : "3 bước, khoảng 1 phút", S.calibrated, () => go("practice")),
      step(3, "Chọn trò chơi", `${GAMES.filter(gm => gm.ok(data)).length} trò dùng được với bộ đề này`, false, () => { const el = $("#lobby"); el?.scrollIntoView({ behavior: "smooth", block: "start" }); }));
    const welcome = h("section", { class: "panel welcome" }, h("div", { class: "wl-top" },
      h("div", {},
        h("p", { class: "eyebrow" }, "Không chạm, không chuột"),
        h("h2", {}, "Giơ tay lên, ", h("em", {}, "cả lớp cùng chơi")),
        h("p", { class: "lead" }, "Webcam nhận ra bàn tay học sinh: chạm đầu ngón trỏ vào nút như chạm màn hình cảm ứng giữa không trung, chụm hai ngón hoặc nắm tay để cầm và kéo thẻ."),
        h("div", { class: "row" }, camMain, calib),
        h("p", { class: "cam-msg", "data-cam-msg": true }, camNote())),
      h("div", { class: "stage-pv" }, h("video", { class: "pv", muted: true, playsinline: true }),
        h("div", { class: "pv-empty", "data-pv-empty": true, html: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M16 10l5-3v10l-5-3"/></svg><span>Khung hình camera sẽ hiện ở đây</span>' }),
        h("span", { class: "pv-badge", "data-cam-badge": true, hidden: true }, h("i"), "Trực tiếp"))), quick);
    const cnt = (n, l) => h("div", { class: "cnt" }, h("b", {}, n), h("small", {}, l));
    const top = Object.entries(CLS.scores).sort((a, b) => b[1].score - a[1].score).slice(0, 3);
    /* bộ đề đang dùng + chọn nhanh ngay tại sảnh (lọc: gần đây / yêu thích / theo môn) */
    const live = SETS.filter(s => !s.archived);
    const subjects = [...new Set(live.map(s => s.subject).filter(Boolean))].sort((x, y) => live.filter(s => s.subject === y).length - live.filter(s => s.subject === x).length).slice(0, 4);
    if (!["recent", "fav", ""].includes(homePick) && !subjects.includes(homePick)) homePick = "recent";
    const pickList = h("div", { class: "setpick", role: "radiogroup", "aria-label": "Chọn bộ đề" });
    const tabs = h("div", { class: "sp-tabs" });
    const paintPick = (q = "") => {
      pickList.innerHTML = "";
      const nq = normSearch(q.trim());
      let shown;
      if (nq) shown = live.filter(s => matchQ([s.name, s.subject, s.grade, s.topic, ...(s.tags || [])].join(" "), q));
      else if (homePick === "fav") shown = live.filter(s => s.fav);
      else if (homePick === "recent") shown = [...live].sort((x, y) => (y.lastUsed || y.updated) - (x.lastUsed || x.updated));
      else shown = live.filter(s => s.subject === homePick).sort((x, y) => (y.date || "").localeCompare(x.date || "") || y.updated - x.updated);
      const cur = SETS.find(s => s.id === currentId);
      if (!nq && cur && !shown.includes(cur) && homePick === "recent") shown.unshift(cur);
      const LIMIT = 8, more = shown.length - LIMIT;
      shown.slice(0, LIMIT).forEach(s => {
        const on_ = s.id === currentId;
        const b = h("button", { class: "sp-row" + (on_ ? " active" : ""), "data-hit": true, role: "radio", "aria-checked": on_ ? "true" : "false" },
          h("span", { class: "sp-dot" }), h("span", { class: "sp-txt" }, h("b", {}, (s.fav ? "★ " : "") + s.name),
            h("small", {}, [setMeta(s), s.date ? fmtDate(s.date) : "", setTotal(s) + " mục"].filter(Boolean).join(" · "))));
        on(b, () => {
          if (s.id === currentId) return;
          currentId = s.id; s.lastUsed = Date.now(); saveSets(); Sfx.right(); Home(); toast(`Đang dùng bộ đề: ${s.name}`, 2200);
          requestAnimationFrame(() => $$(".gcard").forEach((c, k) => c.animate?.([{ opacity: .35, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 320, delay: k * 25, easing: "ease-out", fill: "backwards" })));
        });
        pickList.append(b);
      });
      if (!shown.length) pickList.append(h("p", { class: "muted", style: "margin:6px 2px;font-size:13.5px" }, nq ? "Không có bộ đề nào khớp." : homePick === "fav" ? "Chưa có bộ đề yêu thích. Đánh dấu ★ trong mục Bộ đề." : "Chưa có bộ đề."));
      if (more > 0) pickList.append(on(h("button", { class: "sp-more", "data-hit": true }, `Xem thêm ${more} bộ đề trong thư viện →`), () => { if (homePick && !["recent", "fav"].includes(homePick)) { LIB.subject = homePick; LIB.view = "all"; } else if (homePick === "fav") LIB.view = "fav"; saveLib(); go("sets"); }));
      requestAnimationFrame(() => { const act = pickList.querySelector(".sp-row.active"); if (act && act.offsetTop + act.offsetHeight > pickList.clientHeight) pickList.scrollTop = act.offsetTop - 2; });
    };
    const paintTabs = () => {
      tabs.innerHTML = "";
      [["recent", "Gần đây"], ["fav", "★ Yêu thích"], ...subjects.map(s => [s, s])].forEach(([v, l]) =>
        tabs.append(on(h("button", { class: "fchip sm" + (homePick === v ? " active" : ""), "data-hit": true }, l), () => { homePick = v; if (search) search.value = ""; paintTabs(); paintPick(); })));
    };
    const search = live.length > 5 ? h("input", { type: "search", id: "set-search", placeholder: "Tìm bộ đề theo tên, môn, chủ đề…", class: "sp-search" }) : null;
    search?.addEventListener("input", () => paintPick(search.value));
    paintTabs(); paintPick();
    const setcard = h("section", { class: "panel setcard" },
      h("div", {}, h("p", { class: "eyebrow" }, "Bộ đề đang dùng"), h("h3", {}, set.name), h("p", { class: "muted", style: "margin:4px 0 0" }, [setMeta(set), set.date ? "Ngày dạy " + fmtDate(set.date) : ""].filter(Boolean).join(" · "))),
      h("div", { class: "counts" }, cnt(data.quiz.length, "trắc nghiệm"), cnt(data.tf.length, "đúng / sai"), cnt(data.match.length, "cặp ghép"), cnt(data.sort.length, "nhóm"), cnt(data.order.length, "dãy thứ tự"), cnt(data.words.length, "từ khóa")),
      h("div", { class: "stack", style: "gap:8px" },
        h("div", { class: "sp-head" }, h("b", {}, "Đổi bộ đề"), h("small", { class: "muted" }, `${live.length} bộ đề`)),
        search, tabs, pickList),
      h("div", { class: "row" }, on(h("button", { class: "btn sm", "data-hit": true }, "Mở thư viện bộ đề"), () => go("sets")), on(h("button", { class: "btn sm", "data-hit": true }, "Bảng điểm lớp"), () => go("class"))),
      top.length ? h("div", { class: "muted", style: "font-size:13.5px" }, "Dẫn đầu buổi học: " + top.map(([n, r]) => `${n} (${vi(r.score)})`).join(" · ")) : null);
    st.append(h("div", { class: "wrap" }, h("div", { class: "dash" }, welcome, setcard), Lobby(data, set)));
  });
}

/* ---------------- GIỚI THIỆU + CHỌN NGƯỜI CHƠI ---------------- */
function Intro(g) {
  setScreen("intro", st => {
    setTitle(g.name, curSet().name); hud(null);
    const d = (S.dwellMs / 1000).toLocaleString("vi-VN"), ts = [];
    const pick = S.mode === "pinch" ? "Chụm ngón cái và ngón trỏ" : S.mode === "dwell" ? `Giữ yên đầu ngón tay ${d} giây` : `Chụm hai ngón, hoặc giữ yên ${d} giây`;
    const team = g.team;
    let players = null;
    if (!team) {
      if (!CLS.roster.includes(Play.player)) Play.player = null;
      players = h("div", { class: "players" });
      const paint = () => $$(".pchip", players).forEach(c => c.classList.toggle("active", c._n === (Play.player || "")));
      const add = (label, n) => { const c = on(h("button", { class: "pchip", "data-hit": true }, label), () => { Play.player = n || null; paint(); }); c._n = n || ""; players.append(c); };
      if (CLS.roster.length) {
        presentList().forEach(n => add(n, n));
        const rnd = on(h("button", { class: "pchip", "data-hit": true }, "Gọi ngẫu nhiên"), () => {
          const chips = $$(".pchip", players).filter(c => c._n); let k = 0, steps = 16 + (Math.random() * chips.length | 0);
          const tick = () => { chips.forEach(c => c.classList.remove("flash")); const c = chips[k % chips.length]; c.classList.add("flash"); Sfx.tick();
            if (++k < steps) ts.push(setTimeout(tick, 40 + k * k * .9)); else { c.classList.remove("flash"); Play.player = c._n; paint(); Sfx.right(); FX.burstEl(c, 20); } };
          tick();
        });
        players.append(rnd); add("Không ghi tên", ""); paint();
      }
    }
    /* thiết lập riêng của trò: tóm tắt + mở rộng để chỉnh */
    const idata = parseSet(curSet()), optBox = h("div", { class: "gopt-box" });
    let optOpen = false;
    const paintOpt = () => {
      optBox.innerHTML = "";
      const pr = presetOf(g.id), lvl = { default: "Mặc định", easy: "Dễ", normal: "Vừa", hard: "Khó", custom: "Tùy chỉnh" }[pr] || "";
      optBox.append(h("div", { class: "gopt-sum" },
        h("b", {}, "Thiết lập"), lvl ? h("span", { class: "badge" + (pr === "custom" || pr === "default" ? "" : " lvl") }, lvl) : null,
        h("span", { class: "gopt-chips" }, optSummary(g.id, idata).map(t => h("span", { class: "chipinfo" }, t))),
        on(h("button", { class: "btn sm" + (optOpen ? " on" : ""), "data-hit": true, "aria-expanded": optOpen ? "true" : "false" }, optOpen ? "Thu gọn" : "Tùy chỉnh"), () => { optOpen = !optOpen; paintOpt(); })));
      if (optOpen) optBox.append(gameOptsPanel(g, idata, () => { const keep = optOpen; paintOpt(); optOpen = keep; }));
    };
    paintOpt();
    st.append(h("div", { class: "center" }, h("div", { class: "card intro", style: `--c:${g.color}` }, gameCover(g, true),
      h("div", { class: "card-body intro-body" }, h("div", { class: "intro-l" },
        h("div", {}, h("p", { class: "eyebrow" }, `${g.cat} · ${g.who}`), h("h2", {}, g.name)),
        h("p", {}, g.how),
        h("div", { class: "howto" },
          h("div", {}, h("b", {}, "Chạm"), h("small", {}, "Đưa đầu ngón trỏ vào nút, nút sáng lên và lún dần xuống.")),
          h("div", {}, h("b", {}, "Chọn"), h("small", {}, pick + ".")),
          h("div", {}, h("b", {}, "Cầm & kéo"), h("small", {}, S.grab ? "Chụm hai ngón hoặc nắm cả bàn tay, di chuyển rồi mở tay để thả." : "Chụm hai ngón, di chuyển rồi mở tay để thả.")))),
        h("div", { class: "intro-r" },
        optBox,
        team ? h("p", { class: "muted", style: "font-size:14.5px" }, "Hai học sinh đứng hai bên, mỗi em dùng một tay. Bật chế độ nhận 2 tay trong Cài đặt.")
          : h("div", { class: "stack", style: "gap:8px" }, h("b", {}, "Người chơi"),
            CLS.roster.length ? players : h("p", { class: "muted", style: "margin:0;font-size:14.5px" }, "Thêm danh sách học sinh ở mục “Học sinh & điểm” để ghi điểm cho từng em.")),
        h("div", { class: "row intro-actions" }, on(h("button", { class: "btn primary lg", "data-hit": true }, "Bắt đầu chơi"), () => Countdown(g)),
          on(h("button", { class: "btn lg", "data-hit": true }, "Chọn trò khác"), () => go("home")),
          Cam.running ? null : on(h("button", { class: "btn lg", "data-hit": true, "data-cam-toggle": true }, "Bật camera"), toggleCam)))))));
    return () => ts.forEach(clearTimeout);
  }, { game: true });
}
function Countdown(g) {
  setScreen("count", st => {
    setTitle(g.name, curSet().name);
    const box = h("div", { class: "center" }); st.append(box); let n = 3; const ts = [];
    const show = () => { box.innerHTML = ""; box.append(h("div", { class: "countdown" }, n > 0 ? n : "Bắt đầu!")); Sfx.tone(n > 0 ? 600 : 900, .15, "triangle", .1); };
    show();
    const step = () => { n--; if (n < 0) { Play(g); return; } show(); ts.push(setTimeout(step, n === 0 ? 600 : 800)); };
    ts.push(setTimeout(step, 800));
    return () => ts.forEach(clearTimeout);
  }, { game: true });
}
function Play(g) {
  curGameId = g.id;
  if (g.team) Play.player = null;
  noteRecent(g.id);
  const cs = curSet(); cs.lastUsed = Date.now(); saveSets();
  const data = parseSet(curSet());
  setScreen("game", st => { setTitle(g.name, curSet().name); return g.run(st, data, g); }, { game: true });
}
Play.player = null;
function Result(g, r) {
  setScreen("result", st => {
    setTitle(g.name, "Kết quả"); hud(null);
    const acc = r.total ? r.correct / r.total : 0, stars = r.stars ?? (acc >= .9 ? 3 : acc >= .6 ? 2 : acc > 0 ? 1 : 0);
    const key = `${currentId}:${g.id}`, bests = store.get("lhvt2.best", {}), prev = bests[key]?.score || 0, record = !r.noRecord && r.score > prev;
    if (record) { bests[key] = { score: r.score, at: Date.now(), by: Play.player || "" }; store.set("lhvt2.best", bests); }
    if (Play.player && !r.noRecord) creditPlayer(Play.player, r.score, g.id);
    const title = r.title || (stars === 3 ? "Xuất sắc!" : stars === 2 ? "Làm tốt lắm!" : stars === 1 ? "Cố gắng thêm nhé!" : "Thử lại nào!");
    const stats = r.stats || [["Điểm", vi(r.score)], [r.label || "Đúng", `${r.correct}/${r.total}`], [record ? "Kỷ lục mới" : "Kỷ lục", vi(Math.max(prev, r.score))]];
    st.append(h("div", { class: "center" }, h("div", { class: "card", style: `--c:${g.color}` }, h("div", { class: "card-body" },
      h("div", { class: "stars", html: [0, 1, 2].map(i => STAR.replace("<svg", `<svg class="${i < stars ? "on" : ""}"`)).join("") }),
      h("h2", {}, (Play.player && !r.title ? Play.player + ": " : "") + title), h("p", {}, r.note || `${g.name} · ${curSet().name}`),
      h("div", { class: "stats" }, stats.map(([l, v]) => h("div", { class: "stat" }, h("small", {}, l), h("b", {}, v)))),
      Play.player && !r.noRecord ? h("p", { style: "font-size:14.5px" }, `Đã cộng ${vi(r.score)} điểm cho ${Play.player}. Tổng buổi học: ${vi(CLS.scores[Play.player]?.score || 0)} điểm.`) : null,
      h("div", { class: "row" }, on(h("button", { class: "btn primary lg", "data-hit": true }, "Chơi lại"), () => Countdown(g)),
        CLS.roster.length && !g.team ? on(h("button", { class: "btn lg", "data-hit": true }, "Người chơi tiếp theo"), () => Intro(g)) : null,
        on(h("button", { class: "btn lg", "data-hit": true }, "Chọn trò khác"), () => go("home")))))));
    if (stars >= 2) { FX.rain(); Sfx.win(); } else Sfx.tone(440, .3, "triangle", .1);
  }, { game: true });
}

/* ==========================================================
   HỌC SINH & ĐIỂM (v6.4)
   Nhiều lớp · nhập danh sách từ Excel/CSV · điểm danh trong ngày
   Gọi tên: máy quay số hoặc vòng quay, không lặp lại, đọc tên, trình chiếu
   Xếp hạng: bục vinh danh, điểm thưởng nhanh, xếp hạng theo tổ
   ========================================================== */
function migrateCls(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  let classes = Array.isArray(o.classes) && o.classes.length ? o.classes : null;
  if (!classes) classes = [{ id: "c" + Date.now().toString(36), name: "Lớp của tôi", roster: Array.isArray(o.roster) ? o.roster : [], scores: o.scores && typeof o.scores === "object" ? o.scores : {} }];
  classes.forEach(c => {
    c.id = c.id || "c" + Math.random().toString(36).slice(2, 8); c.name = c.name || "Lớp của tôi";
    c.roster = Array.isArray(c.roster) ? c.roster : []; c.scores = c.scores || {}; c.meta = c.meta || {};
    c.absent = c.absent || {}; c.absentDate = c.absentDate || ""; c.called = Array.isArray(c.called) ? c.called : []; c.pool = Array.isArray(c.pool) ? c.pool : null;
  });
  return { classes, cur: classes.find(c => c.id === o.cur) ? o.cur : classes[0].id, player: null };
}
const curClass = () => CLS.classes.find(c => c.id === CLS.cur) || CLS.classes[0];

const CL_IC = {
  userPlus: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.3" fill="currentColor"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/></svg>',
  screen: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  sort: '<svg viewBox="0 0 24 24"><path d="M4 6h10M4 12h7M4 18h4M17 5v14M14 16l3 3 3-3"/></svg>',
  paste: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  reel: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M4 9h16M4 15h16"/></svg>',
  wheel: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 5v16M4 13h16M6.3 7.3l11.4 11.4M17.7 7.3L6.3 18.7"/><path d="M10 2h4l-2 3z" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M5 20.5a7 7 0 0 1 14 0"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.3a5 5 0 0 1 6 5.2"/></svg>',
  medal: '<svg viewBox="0 0 24 24"><circle cx="12" cy="15" r="5"/><path d="M8.5 11L6 3h4l2 5 2-5h4l-2.5 8"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>'
};
const clIcon = (k, cls = "") => h("span", { class: "ico " + cls, html: CL_IC[k] || IC[k] || "" });
const AV_COLORS = ["#0066FF", "#7C3AED", "#DB2777", "#059669", "#0891B2", "#4F46E5", "#E11D48", "#0D9488", "#9333EA", "#2563EB", "#C026D3", "#16A34A"];
const nameWords = n => String(n).replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
const givenName = n => { const w = nameWords(n).filter(x => !/^\d+$/.test(x)); return w[w.length - 1] || String(n); };
function initials(n) { const w = nameWords(n).filter(x => !/^\d+$/.test(x)); if (!w.length) return "?"; const g = w[w.length - 1]; return (w.length > 1 ? w[0][0] + g[0] : g.slice(0, 2)).toUpperCase(); }
function avColor(n) { let x = 0; for (const ch of String(n)) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return AV_COLORS[x % AV_COLORS.length]; }
const avatar = (n, cls = "") => h("span", { class: "av " + cls, style: `--av:${avColor(n)}`, "aria-hidden": "true" }, initials(n));
const viNameCmp = (a, b) => givenName(a).localeCompare(givenName(b), "vi") || a.localeCompare(b, "vi");
function cleanName(s) {
  let n = String(s ?? "").replace(/^\s*\d+\s*[.)\-–:]\s*/, "").replace(/\s+/g, " ").trim();
  if (n && n === n.toUpperCase() && /\p{L}/u.test(n)) n = n.toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase());
  return n;
}
function classAbsent(c) { const d = todayStr(); if (c.absentDate !== d) { c.absent = {}; c.absentDate = d; } return c.absent; }
const presentList = (c = curClass()) => c.roster.filter(n => !classAbsent(c)[n]);
const groupsOf = c => [...new Set(c.roster.map(n => (c.meta[n]?.group || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
const callCount = (c, n) => c.called.reduce((a, x) => a + (x.n === n), 0);
const calledToday = c => { const t0 = new Date(); t0.setHours(0, 0, 0, 0); return c.called.filter(x => x.t >= +t0); };
const scoreOf = (c, n) => c.scores[n]?.score || 0;
const pickMeta = s => { const m = {}; ["group", "gender", "note"].forEach(k => { const v = String(s[k] ?? "").trim(); if (v) m[k] = v; }); return m; };
function addStudents(c, list, mode) {
  if (mode === "replace") { c.roster = []; c.meta = {}; c.pool = null; }
  const have = new Set(c.roster), fromFile = new Set(); let added = 0, renamed = 0, updated = 0;
  for (const s of list) {
    let n = cleanName(s.name); if (!n) continue;
    if (have.has(n) && !fromFile.has(n)) { Object.assign(c.meta[n] || (c.meta[n] = {}), pickMeta(s)); updated++; fromFile.add(n); continue; }
    if (have.has(n)) { let k = 2; while (have.has(`${n} ${k}`)) k++; n = `${n} ${k}`; renamed++; }
    have.add(n); fromFile.add(n); c.roster.push(n);
    const m = pickMeta(s); if (Object.keys(m).length) c.meta[n] = m; added++;
  }
  c.pool = null; return { added, renamed, updated };
}
function renameStudent(c, a, b) {
  if (a === b) return;
  c.roster = c.roster.map(n => n === a ? b : n);
  for (const k of ["meta", "scores", "absent"]) if (c[k] && a in c[k]) { c[k][b] = c[k][a]; delete c[k][a]; }
  c.called.forEach(x => { if (x.n === a) x.n = b; });
  if (c.pool) c.pool = c.pool.map(n => n === a ? b : n);
  Object.values(QSTATS).forEach(set => Object.values(set).forEach(e => { if (e.pl && a in e.pl) { e.pl[b] = e.pl[a]; delete e.pl[a]; } }));
  if (Play.player === a) Play.player = b;
}
function removeStudent(c, n) {
  c.roster = c.roster.filter(x => x !== n); delete c.meta[n]; delete c.scores[n]; delete c.absent[n];
  if (c.pool) c.pool = c.pool.filter(x => x !== n); if (Play.player === n) Play.player = null;
}
function award(n, pts) {
  const r = CLS.scores[n] || (CLS.scores[n] = { score: 0, plays: 0, best: {} });
  r.score = Math.max(0, (r.score || 0) + pts); r.bonus = (r.bonus || 0) + pts; saveCls();
  pts > 0 ? Sfx.right() : Sfx.tick();
}

/* ---------- đọc danh sách lớp từ Excel / CSV ---------- */
function parseRosterRows(rows) {
  rows = (rows || []).map(r => (r || []).map(v => String(v ?? "").trim()));
  let hi = -1, col = {}, clsName = "";
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const line = rows[r].join(" ");
    const m = line.match(/l[ớo]p\s*[:\-]?\s*(\d{1,2}\s*[A-Za-zĐđ]?\s*\d{0,2})\b/i);
    if (m && !clsName) clsName = "Lớp " + m[1].replace(/\s+/g, "").toUpperCase();
    const f = {};
    rows[r].forEach((v, i) => {
      const t = normTxt(v).replace(/[.:]/g, "").trim();
      if (/^(ho va ten|ho ten|hoten|ho va ten hoc sinh|ten hoc sinh|hoc sinh|full ?name|student|name)$/.test(t)) f.full ??= i;
      else if (/^(ho va ten dem|ho dem|ho va dem|ho va chu dem|ho|family name|last name)$/.test(t)) f.last ??= i;
      else if (/^(ten|first name|given name)$/.test(t)) f.first ??= i;
      else if (/^(to|nhom|to nhom|doi|to\/nhom|group|team)$/.test(t)) f.group ??= i;
      else if (/^(gioi tinh|gt|nam\/nu|nam nu|phai|gender|sex)$/.test(t)) f.gender ??= i;
      else if (/^(ghi chu|note|notes)$/.test(t)) f.note ??= i;
    });
    if (f.full != null || f.first != null) { hi = r; col = f; break; }
  }
  const looksName = v => v && /\p{L}/u.test(v) && !/^\d+([.,]\d+)?$/.test(v) && v.length <= 60 && !/^(stt|tt|tổng|tong|danh sách|ghi chú)/i.test(v);
  if (hi < 0) { // không có dòng tiêu đề: chọn cột có nhiều ô giống tên người nhất
    const score = []; rows.forEach(r => r.forEach((v, i) => { if (looksName(v) && v.split(/\s+/).length >= 2) score[i] = (score[i] || 0) + 1; }));
    let best = -1; score.forEach((s, i) => { if (s && (best < 0 || s > score[best])) best = i; });
    if (best < 0) return { students: [], skipped: 0, clsName, cols: {} };
    col = { full: best }; hi = -1;
  }
  const students = []; let skipped = 0;
  for (let r = hi + 1; r < rows.length; r++) {
    const row = rows[r]; if (!row.some(Boolean)) continue;
    const name = col.full != null ? row[col.full] : [row[col.last], row[col.first]].filter(Boolean).join(" ");
    if (!looksName(name) || /^(họ và tên|ho va ten|tên|ten)$/i.test(name)) { skipped++; continue; }
    let gender = col.gender != null ? row[col.gender] : "";
    if (gender) { const g = normTxt(gender); gender = /^(nu|n|female|f|x)$/.test(g) ? "Nữ" : /^(nam|male|m)$/.test(g) ? "Nam" : gender; }
    students.push({ name: cleanName(name), group: col.group != null ? row[col.group] : "", gender, note: col.note != null ? row[col.note] : "" });
  }
  return { students, skipped, clsName, cols: { group: col.group != null, gender: col.gender != null, note: col.note != null, split: col.full == null } };
}
function rosterTemplate() {
  const rows = [["STT", "Họ và tên", "Tổ", "Giới tính", "Ghi chú"], ["1", "Nguyễn Văn An", "Tổ 1", "Nam", ""], ["2", "Trần Thị Bình", "Tổ 1", "Nữ", "Lớp trưởng"], ["3", "Lò Văn Chiến", "Tổ 2", "Nam", ""], ["4", "Giàng Thị Dung", "Tổ 2", "Nữ", ""]];
  downloadBlob(XL.write([{ name: "Danh sách lớp", header: true, widths: [7, 32, 12, 12, 30], rows }]), "Mau-danh-sach-lop.xlsx");
  toast("Đã tải file mẫu. Điền tên học sinh vào cột “Họ và tên” rồi nhập lại vào đây.", 3500);
}
function exportRoster(c) {
  const rows = [["STT", "Họ và tên", "Tổ", "Giới tính", "Ghi chú", "Điểm buổi học", "Lượt chơi", "Số lần được gọi"],
    ...c.roster.map((n, i) => [String(i + 1), n, c.meta[n]?.group || "", c.meta[n]?.gender || "", c.meta[n]?.note || "", String(scoreOf(c, n)), String(c.scores[n]?.plays || 0), String(callCount(c, n))])];
  downloadBlob(XL.write([{ name: c.name.slice(0, 31), header: true, widths: [7, 32, 12, 12, 26, 14, 11, 16], rows }]), `${c.name} - danh sach - ${todayStr()}.xlsx`);
  toast("Đã xuất danh sách lớp ra Excel");
}

/* ---------- chọn tên: không lặp lại cho tới khi gọi hết ---------- */
S.pick = Object.assign({ present: true, noRepeat: true, group: "", count: 1, speak: true, mode: "reel" }, S.pick || {});
function eligible(c) {
  let b = S.pick.present ? presentList(c) : c.roster.slice();
  if (S.pick.group) b = b.filter(n => (c.meta[n]?.group || "") === S.pick.group);
  return b;
}
function drawNames(c, k) {
  const base = eligible(c); if (!base.length) return { names: [], newRound: false };
  let names = [], newRound = false;
  if (S.pick.noRepeat) {
    let pool = (c.pool || []).filter(n => base.includes(n));
    for (let i = 0; i < Math.min(k, base.length); i++) {
      if (!pool.length) { if (c.pool) newRound = true; pool = shuffle(base.filter(n => !names.includes(n))); }
      const n = pool.splice(Math.random() * pool.length | 0, 1)[0]; if (n) names.push(n);
    }
    c.pool = pool;
  } else names = pickN(base, Math.min(k, base.length));
  return { names, newRound };
}
const remainingInRound = c => { const base = eligible(c); return c.pool ? c.pool.filter(n => base.includes(n)).length : base.length; };

/* ---------- máy quay số ---------- */
function makeReel() {
  const strip = h("div", { class: "reel-strip" }), box = h("div", { class: "reel" }, strip, h("div", { class: "reel-focus" }));
  let raf = 0;
  const row = n => h("div", { class: "reel-row" }, n ? avatar(n, "md") : h("span", { class: "av md ghost" }, "?"), h("span", { class: "reel-name" }, n || "Sẵn sàng gọi tên"));
  const idle = (names) => { const r = box.clientHeight / 3 || 96; box.style.setProperty("--row", r + "px"); strip.innerHTML = ""; const pick = shuffle(names).slice(0, 2); [pick[0], null, pick[1]].forEach(n => strip.append(row(n))); strip.style.transform = "translateY(0)"; [...strip.children].forEach((e, i) => e.classList.toggle("on", i === 1)); };
  function spin(winner, pool, ms = 3200) {
    return new Promise(res => {
      const R = box.clientHeight / 3 || 96; box.style.setProperty("--row", R + "px");
      const N = clamp(26 + pool.length, 30, 46), list = [];
      for (let i = 0; i < N; i++) list.push(pool[Math.random() * pool.length | 0]);
      list.push(winner); for (let i = 0; i < 2; i++) list.push(pool[Math.random() * pool.length | 0]);
      strip.innerHTML = ""; list.forEach(n => strip.append(row(n)));
      const target = N, start = 1, t0 = performance.now(); let last = -1;
      const ease = t => 1 - Math.pow(1 - t, 4);
      const kids = strip.children;
      const step = now => {
        const t = Math.min(1, (now - t0) / ms), pos = start + (target - start) * ease(t), idx = Math.round(pos);
        strip.style.transform = `translateY(${-(pos - 1) * R}px)`;
        if (idx !== last) { if (last >= 0) Sfx.tone(900 + (idx % 3) * 120, .035, "square", .035); kids[last]?.classList.remove("on"); kids[idx]?.classList.add("on"); last = idx; }
        if (t < 1 && box.isConnected) raf = requestAnimationFrame(step); else { kids[target]?.classList.add("on", "win"); res(); }
      };
      raf = requestAnimationFrame(step);
    });
  }
  return { el: box, idle, spin, stop() { cancelAnimationFrame(raf); } };
}
/* ---------- vòng quay tên ---------- */
function makeNameWheel() {
  const cv = h("canvas", { class: "pw-cv" }), box = h("div", { class: "pwheel" }, cv, h("div", { class: "pw-ptr" }), h("div", { class: "pw-hub" }, clIcon("dice")));
  let names = [], ang = 0, raf = 0;
  const ctx = cv.getContext("2d");
  function paint() {
    const S_ = box.clientWidth || 360, d = Math.min(devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(S_ * d)) { cv.width = cv.height = Math.round(S_ * d); }
    const W = cv.width, r = W / 2 - 6 * d; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, W);
    ctx.translate(W / 2, W / 2); ctx.rotate(ang);
    const n = Math.max(1, names.length), seg = Math.PI * 2 / n;
    if (!names.length) { ctx.fillStyle = "rgba(127,140,170,.18)"; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); return; }
    names.forEach((nm, i) => {
      const a0 = -Math.PI / 2 + i * seg;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a0 + seg); ctx.closePath();
      ctx.fillStyle = AV_COLORS[i % AV_COLORS.length]; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.5 * d; ctx.stroke();
      ctx.save(); ctx.rotate(a0 + seg / 2); ctx.fillStyle = "#fff";
      const fs = clamp(Math.min(r * seg * .55, r / 9), 9 * d, 26 * d); ctx.font = `700 ${fs}px "Be Vietnam Pro", system-ui, sans-serif`;
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      const label = n <= 14 ? nm : givenName(nm); let t = label;
      while (ctx.measureText(t).width > r * .68 && t.length > 2) t = t.slice(0, -1);
      ctx.fillText(t === label ? t : t + "…", r - 14 * d, 0); ctx.restore();
    });
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.lineWidth = 6 * d; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.stroke();
  }
  function set(list) { names = list.slice(); paint(); }
  function spin(winner, ms = 4600) {
    return new Promise(res => {
      const i = names.indexOf(winner); if (i < 0) { res(); return; }
      const seg = Math.PI * 2 / names.length, from = ang;
      const want = -(i + .5) * seg + (Math.random() - .5) * seg * .6;
      let delta = ((want - from) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); delta += Math.PI * 2 * 6;
      const t0 = performance.now(); let last = -1;
      const ease = t => 1 - Math.pow(1 - t, 3.6);
      const step = now => {
        const t = Math.min(1, (now - t0) / ms); ang = from + delta * ease(t); paint();
        const idx = Math.floor(((((-ang - Math.PI * 0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / seg);
        if (idx !== last) { if (last >= 0) Sfx.tone(1300, .03, "square", .035); last = idx; }
        if (t < 1 && box.isConnected) raf = requestAnimationFrame(step); else res();
      };
      raf = requestAnimationFrame(step);
    });
  }
  return { el: box, set, spin, paint, stop() { cancelAnimationFrame(raf); } };
}

const CLP = { tab: null, busy: false, last: [], present: false };
function ClassPage() {
  navPage = "class";
  setScreen("class", st => {
    const root = h("div", { class: "wrap cls" }); st.append(root);
    const ts = []; let importState = null, editState = null, pasteOpen = false, renaming = false, q = "", reel = null, wheel = null, kpiEl = null;
    const refreshKpis = () => { if (!kpiEl?.isConnected) return; const n = kpis(curClass()); kpiEl.replaceWith(n); kpiEl = n; };
    const fileIn = h("input", { type: "file", accept: ".xlsx,.xlsm,.csv,.tsv,.txt,.xls", hidden: true });
    fileIn.addEventListener("change", () => { const f = fileIn.files[0]; fileIn.value = ""; if (f) importFile(f); });
    const onKey = e => { if (e.key === "Escape" && CLP.present) { CLP.present = false; draw(); } };
    addEventListener("keydown", onKey);
    if (!CLP.tab) CLP.tab = curClass().roster.length ? "pick" : "list";

    function draw() {
      if (CLP.busy) return;
      const y = stage.scrollTop, c = curClass();
      reel?.stop(); wheel?.stop();
      root.innerHTML = ""; root.append(fileIn, h("datalist", { id: "dl-groups" }, groupsOf(c).map(g => h("option", { value: g }))));
      setTitle("Học sinh & điểm", `${c.name} · ${c.roster.length} học sinh`);
      kpiEl = kpis(c); root.append(header(c), kpiEl, tabs(c));
      root.append(CLP.tab === "pick" ? pickerView(c) : CLP.tab === "rank" ? rankView(c) : listView(c));
      stage.scrollTop = y;
      if (CLP.tab === "pick") requestAnimationFrame(() => { reel?.idle(eligible(c)); wheel?.set(eligible(c)); });
    }

    /* ----- đầu trang: lớp đang chọn + đổi lớp ----- */
    function header(c) {
      const title = renaming
        ? (() => { const inp = h("input", { type: "text", id: "cls-name", value: c.name, maxlength: 40, "aria-label": "Tên lớp" });
            const save = () => { const v = inp.value.trim(); if (v) c.name = v; renaming = false; saveCls(); draw(); };
            inp.addEventListener("keydown", e => { if (e.key === "Enter") save(); if (e.key === "Escape") { renaming = false; draw(); } });
            setTimeout(() => { inp.focus(); inp.select(); }, 0);
            return h("div", { class: "cls-rename" }, inp, on(h("button", { class: "btn sm primary", "data-hit": true }, "Lưu"), save)); })()
        : h("h2", {}, c.name);
      let armed = false;
      const del = on(h("button", { class: "ibtn danger", "data-hit": true, title: "Xóa lớp này", "aria-label": "Xóa lớp" }, icon("trash")), () => {
        if (!armed) { armed = true; del.classList.add("armed"); toast(`Bấm lần nữa để xóa lớp “${c.name}” cùng danh sách và điểm`, 2600); ts.push(setTimeout(() => { armed = false; del.classList.remove("armed"); }, 3000)); return; }
        if (CLS.classes.length > 1) { CLS.classes = CLS.classes.filter(x => x !== c); CLS.cur = CLS.classes[0].id; }
        else Object.assign(c, { roster: [], scores: {}, meta: {}, called: [], pool: null, absent: {}, name: "Lớp của tôi" });
        saveCls(); toast("Đã xóa lớp"); draw();
      });
      const sw = h("div", { class: "cls-switch", role: "tablist", "aria-label": "Chọn lớp" },
        CLS.classes.map(x => on(h("button", { class: "cls-chip" + (x.id === c.id ? " active" : ""), "data-hit": true, role: "tab", "aria-selected": x.id === c.id ? "true" : "false" }, h("b", {}, x.name), h("small", {}, x.roster.length)), () => {
          if (x.id === CLS.cur) return; CLS.cur = x.id; Play.player = null; saveCls(); importState = editState = null; CLP.tab = x.roster.length ? CLP.tab : "list"; draw();
        })),
        on(h("button", { class: "cls-chip add", "data-hit": true, title: "Thêm lớp mới" }, clIcon("plus"), "Lớp mới"), () => {
          const n = migrateCls({}).classes[0]; n.name = `Lớp mới ${CLS.classes.length + 1}`; CLS.classes.push(n); CLS.cur = n.id; renaming = true; CLP.tab = "list"; saveCls(); draw();
        }));
      return h("section", { class: "cls-head" },
        h("div", { class: "cls-id" }, h("span", { class: "cls-badge", style: `--av:${avColor(c.name)}` }, c.name.replace(/^lớp\s*/i, "").slice(0, 4) || "L"),
          h("div", { class: "cls-id-t" }, h("small", {}, "Lớp đang dạy"), title),
          renaming ? null : h("div", { class: "row", style: "gap:4px" },
            on(h("button", { class: "ibtn", "data-hit": true, title: "Đổi tên lớp", "aria-label": "Đổi tên lớp" }, clIcon("pen")), () => { renaming = true; draw(); }), del)),
        sw);
    }
    function kpis(c) {
      const pres = presentList(c).length, today = calledToday(c), total = c.roster.reduce((a, n) => a + scoreOf(c, n), 0);
      const lead = c.roster.slice().sort((a, b) => scoreOf(c, b) - scoreOf(c, a))[0];
      const k = (ic, l, v, sub, cls = "") => h("div", { class: "kpi cls-kpi " + cls }, h("span", { class: "kpi-ic", html: CL_IC[ic] }), h("div", {}, h("small", {}, l), h("b", {}, v), h("span", {}, sub)));
      return h("div", { class: "kpis" },
        k("users", "Sĩ số", vi(c.roster.length), groupsOf(c).length ? `${groupsOf(c).length} tổ / nhóm` : "học sinh"),
        k("check", "Có mặt hôm nay", c.roster.length ? `${pres}/${c.roster.length}` : "–", c.roster.length - pres ? `vắng ${c.roster.length - pres}` : "đủ sĩ số", c.roster.length && pres === c.roster.length ? "good" : ""),
        k("dice", "Đã gọi hôm nay", vi(today.length), `${new Set(today.map(x => x.n)).size} bạn khác nhau`),
        k("trophy", "Điểm buổi học", vi(total), lead && scoreOf(c, lead) ? `dẫn đầu: ${lead}` : "chưa có điểm"));
    }
    function tabs(c) {
      const t = (id, ic, label, n) => on(h("button", { class: "cls-tab" + (CLP.tab === id ? " active" : ""), "data-hit": true, role: "tab", "aria-selected": CLP.tab === id ? "true" : "false" }, clIcon(ic), h("span", {}, label), n != null ? h("b", {}, n) : null), () => { if (CLP.tab !== id) { CLP.tab = id; draw(); } });
      return h("div", { class: "cls-tabs", role: "tablist" }, t("pick", "dice", "Gọi tên"), t("list", "list", "Danh sách lớp", c.roster.length), t("rank", "trophy", "Xếp hạng"));
    }

    /* ================= GỌI TÊN ================= */
    function pickerView(c) {
      if (!c.roster.length) return emptyRoster("Chưa có học sinh để gọi tên");
      const base = eligible(c), mode = S.pick.mode;
      reel = mode === "reel" ? makeReel() : null; wheel = mode === "wheel" ? makeNameWheel() : null;
      const result = h("div", { class: "pick-result", "aria-live": "polite" });
      const paintResult = () => {
        result.innerHTML = "";
        const ws = CLP.last.filter(n => c.roster.includes(n));
        if (!ws.length) { result.append(h("p", { class: "pick-hint" }, base.length ? `Bấm “Gọi tên” hoặc chạm tay vào nút để chọn ngẫu nhiên trong ${base.length} bạn.` : "Không còn bạn nào phù hợp. Hãy kiểm tra điểm danh hoặc bộ lọc tổ.")); return; }
        result.append(h("div", { class: "win-grid" + (ws.length > 1 ? " multi" : "") }, ws.map(n => winCard(c, n))));
      };
      const go = on(h("button", { class: "btn primary xl pick-go", "data-hit": true, disabled: !base.length }, clIcon("dice"), S.pick.count > 1 ? `Gọi ${S.pick.count} bạn` : "Gọi tên"), () => doPick());
      async function doPick() {
        if (CLP.busy) return;
        const { names, newRound } = drawNames(c, S.pick.count); if (!names.length) { toast("Không còn bạn nào phù hợp để gọi"); return; }
        if (newRound) toast("Cả lớp đã được gọi một lượt, bắt đầu vòng mới", 2200);
        CLP.busy = true; go.disabled = true; CLP.last = []; paintResult(); result.classList.add("hidden");
        TTS.stop(); Sfx.swish();
        for (const n of names) {
          if (reel) await reel.spin(n, base, names.length > 1 ? 1900 : 3200);
          else await wheel.spin(n, names.length > 1 ? 2600 : 4600);
          if (!root.isConnected) { CLP.busy = false; return; }
          CLP.last.push(n); c.called.push({ n, t: Date.now() });
          Sfx.win(); FX.burstEl((reel || wheel).el, 40);
        }
        if (c.called.length > 500) c.called = c.called.slice(-500);
        saveCls(); CLP.busy = false; go.disabled = false;
        result.classList.remove("hidden"); paintResult(); paintSide(); refreshKpis();
        if (S.pick.speak) TTS.say((names.length > 1 ? "Mời các em " + names.join(", ") : "Mời em " + names[0]) + ".", true);
      }
      const modeSeg = h("div", { class: "seg-tabs" },
        [["reel", "reel", "Máy quay số"], ["wheel", "wheel", "Vòng quay"]].map(([v, ic, l]) => on(h("button", { class: "seg-btn" + (mode === v ? " active" : ""), "data-hit": true }, clIcon(ic), l), () => { if (CLP.busy || S.pick.mode === v) return; S.pick.mode = v; saveS(); draw(); })));
      const presentBtn = on(h("button", { class: "btn sm", "data-hit": true, title: "Phóng to toàn màn hình để chiếu cho cả lớp (Esc để thoát)" }, clIcon(CLP.present ? "close" : "screen"), CLP.present ? "Thoát trình chiếu" : "Trình chiếu"), () => { if (CLP.busy) return; CLP.present = !CLP.present; draw(); });
      const stageBox = h("section", { class: "pick-stage" + (CLP.present ? " present" : "") },
        h("div", { class: "pick-top" }, modeSeg, h("span", { class: "pick-class" }, c.name, S.pick.group ? ` · ${S.pick.group}` : ""), presentBtn),
        h("div", { class: "pick-machine" }, (reel || wheel).el),
        h("div", { class: "pick-actions" }, go),
        result);
      paintResult();
      const side = h("aside", { class: "pick-side" });
      function paintSide() {
        side.innerHTML = "";
        const groups = groupsOf(c);
        const chk = (key, label, sub) => { const i = h("input", { type: "checkbox", id: "pk-" + key, checked: !!S.pick[key] }); i.addEventListener("change", () => { S.pick[key] = i.checked; saveS(); if (key !== "speak") draw(); }); return h("label", { class: "check", for: "pk-" + key, style: "align-items:flex-start" }, i, h("span", {}, label, sub ? h("small", { class: "muted", style: "display:block;font-weight:400" }, sub) : null)); };
        const grpSel = h("select", { id: "pk-group", "aria-label": "Gọi theo tổ" }, h("option", { value: "" }, "Cả lớp"), groups.map(g => h("option", { value: g, selected: S.pick.group === g }, g)));
        grpSel.addEventListener("change", () => { S.pick.group = grpSel.value; saveS(); draw(); });
        side.append(h("section", { class: "panel stack", style: "gap:14px" }, h("h3", {}, "Tùy chọn gọi tên"),
          h("div", { class: "field" }, h("span", {}, "Số bạn mỗi lần"), h("div", { class: "seg" }, [1, 2, 3, 4].map(k => { const inp = h("input", { type: "radio", name: "pkc", id: "pkc" + k, checked: S.pick.count === k }); inp.addEventListener("change", () => { S.pick.count = k; saveS(); draw(); }); return h("label", { for: "pkc" + k }, inp, h("span", {}, k)); }))),
          groups.length ? h("label", { class: "field", for: "pk-group" }, h("span", {}, "Gọi trong"), grpSel) : null,
          chk("present", "Chỉ gọi bạn có mặt", "Bạn vắng được đánh dấu ở tab Danh sách lớp."),
          chk("noRepeat", "Không gọi lại cho tới khi cả lớp được gọi", "Công bằng: mỗi bạn một lượt rồi mới sang vòng mới."),
          chk("speak", "Đọc tên thành tiếng", "“Mời em …” bằng giọng tiếng Việt.")));
        const hist = calledToday(c).slice().reverse().slice(0, 10);
        const rem = remainingInRound(c), tot = eligible(c).length;
        side.append(h("section", { class: "panel stack", style: "gap:12px" },
          h("div", { class: "sp-head" }, h("h3", {}, "Lượt gọi hôm nay"), h("small", { class: "muted" }, `${calledToday(c).length} lượt`)),
          S.pick.noRepeat ? h("div", { class: "round-meter" }, h("div", { class: "rm-top" }, h("span", {}, "Vòng này còn"), h("b", {}, `${rem}/${tot} bạn`)), h("div", { class: "bar" }, h("i", { style: `width:${tot ? (tot - rem) / tot * 100 : 0}%` }))) : null,
          hist.length ? h("ol", { class: "hist" }, hist.map(x => h("li", {}, avatar(x.n, "sm"), h("span", { class: "hist-n" }, x.n), h("small", {}, new Date(x.t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }))))) : h("p", { class: "muted", style: "margin:0;font-size:14px" }, "Chưa gọi ai hôm nay."),
          h("div", { class: "row" }, on(h("button", { class: "btn sm ghost", "data-hit": true }, "Bắt đầu vòng gọi mới"), () => { c.pool = null; saveCls(); toast("Đã đặt lại: tất cả các bạn đều có thể được gọi"); draw(); }))));
      }
      paintSide();
      return h("div", { class: "pick-wrap" }, stageBox, side);
    }
    function winCard(c, n) {
      const m = c.meta[n] || {}, cnt = callCount(c, n);
      const pts = k => on(h("button", { class: "pts-btn", "data-hit": true, title: `Cộng ${k} điểm` }, `+${k}`), () => { award(n, k); toast(`+${k} điểm cho ${n}`, 1500); FX.burstEl(card, 14); paintScore(); refreshKpis(); });
      const sc = h("b", { class: "wc-score" }), paintScore = () => { sc.textContent = vi(scoreOf(c, n)) + " điểm"; };
      const card = h("div", { class: "win-card" },
        avatar(n, "xl"),
        h("div", { class: "wc-body" },
          h("small", { class: "wc-lbl" }, "Mời em"),
          h("div", { class: "wc-name" }, n),
          h("div", { class: "wc-meta" }, m.group ? h("span", { class: "chipinfo" }, m.group) : null, h("span", { class: "chipinfo" }, `Được gọi ${cnt} lần`), sc)),
        h("div", { class: "wc-act" },
          on(h("button", { class: "btn primary", "data-hit": true }, clIcon("play"), "Mời chơi"), () => { Play.player = n; go("home"); toast(`Lượt của ${n}: chọn một trò chơi`, 2500); }),
          h("div", { class: "pts-row" }, pts(1), pts(2), pts(5)),
          on(h("button", { class: "btn sm ghost", "data-hit": true, title: "Đánh dấu vắng, lần sau không gọi nữa" }, "Vắng mặt"), () => { classAbsent(c)[n] = true; CLP.last = CLP.last.filter(x => x !== n); const li = c.called.map(x => x.n).lastIndexOf(n); if (li >= 0) c.called.splice(li, 1); saveCls(); toast(`Đã đánh dấu ${n} vắng mặt`); draw(); })));
      paintScore(); return card;
    }

    /* ================= DANH SÁCH LỚP ================= */
    function emptyRoster(title) {
      const dz = h("label", { class: "dropzone cls-drop", for: "cls-file" },
        h("span", { class: "dz-ico", html: '<svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 13l2 2 4-4"/></svg>' }),
        h("b", {}, title), h("span", { class: "muted" }, "Kéo thả file Excel danh sách lớp vào đây, hoặc bấm để chọn file"), h("small", { class: "muted" }, "Nhận .xlsx và .csv · tự nhận cột “Họ và tên”, “Họ / Tên”, “Tổ”, “Giới tính”"));
      dz.addEventListener("click", e => { e.preventDefault(); fileIn.click(); });
      dropable(dz);
      return h("section", { class: "panel stack cls-empty" }, dz,
        h("div", { class: "row", style: "justify-content:center" },
          on(h("button", { class: "btn", "data-hit": true }, clIcon("userPlus"), "Thêm từng bạn"), () => { CLP.tab = "list"; editState = { name: "", group: "", gender: "", note: "" }; draw(); }),
          on(h("button", { class: "btn", "data-hit": true }, clIcon("paste"), "Dán danh sách"), () => { CLP.tab = "list"; pasteOpen = true; draw(); }),
          on(h("button", { class: "btn ghost", "data-hit": true }, icon("down"), "Tải file mẫu Excel"), rosterTemplate)));
    }
    function dropable(el) {
      ["dragenter", "dragover"].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.add("over"); }));
      ["dragleave", "drop"].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.remove("over"); }));
      el.addEventListener("drop", e => { const f = e.dataTransfer?.files?.[0]; if (f) importFile(f); });
    }
    function listView(c) {
      const wrap = h("div", { class: "stack", style: "gap:16px" }); dropable(wrap);
      if (importState) wrap.append(importPanel(c));
      if (pasteOpen) wrap.append(pastePanel(c));
      if (editState) wrap.append(editPanel(c));
      if (!c.roster.length && !importState && !pasteOpen && !editState) { wrap.append(emptyRoster(`Lớp “${c.name}” chưa có học sinh`)); return wrap; }
      if (!c.roster.length) return wrap;
      const search = h("input", { type: "search", id: "cls-q", placeholder: "Tìm học sinh…", value: q, "aria-label": "Tìm học sinh" });
      const tbody = h("tbody");
      search.addEventListener("input", () => { q = search.value; paintRows(); });
      const absent = classAbsent(c), hasGender = c.roster.some(n => c.meta[n]?.gender);
      wrap.append(h("div", { class: "lib-top" },
        h("div", { class: "row" }, search,
          on(h("button", { class: "btn sm primary", "data-hit": true }, clIcon("userPlus"), "Thêm học sinh"), () => { editState = { name: "", group: "", gender: "", note: "" }; pasteOpen = false; draw(); }),
          on(h("button", { class: "btn sm", "data-hit": true }, icon("up"), "Nhập từ Excel"), () => fileIn.click()),
          on(h("button", { class: "btn sm" + (pasteOpen ? " on" : ""), "data-hit": true }, clIcon("paste"), "Dán danh sách"), () => { pasteOpen = !pasteOpen; editState = null; draw(); })),
        h("div", { class: "row" },
          on(h("button", { class: "btn sm ghost", "data-hit": true, title: "Sắp xếp theo tên (A → Z), giống sổ điểm" }, clIcon("sort"), "Xếp theo tên"), () => { c.roster.sort(viNameCmp); saveCls(); toast("Đã xếp danh sách theo tên A → Z"); draw(); }),
          on(h("button", { class: "btn sm ghost", "data-hit": true }, icon("xls"), "Xuất Excel"), () => exportRoster(c)),
          on(h("button", { class: "btn sm ghost", "data-hit": true }, icon("down"), "File mẫu"), rosterTemplate))));
      const allIn = c.roster.every(n => !absent[n]);
      wrap.append(h("div", { class: "lib-group roster" }, h("div", { class: "tablewrap" }, h("table", { class: "rt" },
        h("thead", {}, h("tr", {}, h("th", { class: "c-no" }, "#"), h("th", {}, "Học sinh"), h("th", {}, "Tổ"), hasGender ? h("th", {}, "Giới tính") : null,
          h("th", { class: "c-in" }, "Có mặt", allIn ? null : on(h("button", { class: "linkbtn th-all", "data-hit": true, title: "Đánh dấu cả lớp có mặt" }, "Tất cả"), () => { c.absent = {}; c.absentDate = todayStr(); saveCls(); toast("Đã đánh dấu cả lớp có mặt"); draw(); })),
          h("th", { class: "c-num" }, "Được gọi"), h("th", { class: "c-num" }, "Điểm"), h("th", {}, ""))),
        tbody))));
      function paintRows() {
        tbody.innerHTML = "";
        const list = c.roster.map((n, i) => [n, i]).filter(([n]) => !q || matchQ(n + " " + (c.meta[n]?.group || "") + " " + (c.meta[n]?.note || ""), q));
        if (!list.length) tbody.append(h("tr", {}, h("td", { colspan: 8, class: "muted", style: "text-align:center;padding:24px" }, `Không có học sinh nào khớp “${q}”`)));
        for (const [n, i] of list) {
          const m = c.meta[n] || {}, away = !!absent[n];
          const sw = on(h("button", { class: "switch" + (away ? "" : " on"), role: "switch", "aria-checked": away ? "false" : "true", "data-hit": true, title: away ? "Vắng — bấm để đánh dấu có mặt" : "Có mặt — bấm để đánh dấu vắng" }, h("i")), () => { if (away) delete absent[n]; else absent[n] = true; saveCls(); paintRows(); });
          let armed = false;
          const del = on(h("button", { class: "ibtn danger", "data-hit": true, title: "Xóa học sinh", "aria-label": "Xóa " + n }, icon("trash")), () => {
            if (!armed) { armed = true; del.classList.add("armed"); toast(`Bấm lần nữa để xóa ${n}`, 2000); ts.push(setTimeout(() => { armed = false; del.classList.remove("armed"); }, 2800)); return; }
            removeStudent(c, n); saveCls(); toast(`Đã xóa ${n}`); draw();
          });
          tbody.append(h("tr", { class: away ? "away" : "" },
            h("td", { class: "c-no" }, i + 1),
            h("td", {}, h("div", { class: "rt-name" }, avatar(n, "sm"), h("div", {}, h("b", {}, n), m.note ? h("small", {}, m.note) : null))),
            h("td", {}, m.group ? h("span", { class: "grp", style: `--av:${avColor(m.group)}` }, m.group) : h("span", { class: "muted" }, "—")),
            hasGender ? h("td", { class: "muted" }, m.gender || "—") : null,
            h("td", { class: "c-in" }, sw),
            h("td", { class: "c-num" }, callCount(c, n) || h("span", { class: "muted" }, "0")),
            h("td", { class: "c-num" }, h("b", {}, vi(scoreOf(c, n)))),
            h("td", { class: "c-act" },
              on(h("button", { class: "ibtn", "data-hit": true, title: "Sửa", "aria-label": "Sửa " + n }, icon("edit")), () => { editState = { orig: n, name: n, group: m.group || "", gender: m.gender || "", note: m.note || "" }; pasteOpen = false; draw(); stage.scrollTo({ top: 0, behavior: "smooth" }); }),
              del)));
        }
      }
      paintRows();
      wrap.append(h("p", { class: "muted", style: "margin:0;font-size:13px" }, "Điểm danh tự đặt lại mỗi ngày. Mẹo: có thể kéo thả file Excel vào bất kỳ đâu trên trang này để nhập."));
      return wrap;
    }
    function editPanel(c) {
      const E = editState, isNew = !E.orig;
      const name = h("input", { type: "text", id: "st-name", value: E.name, placeholder: "Ví dụ: Lò Văn An", maxlength: 60 });
      const grp = h("input", { type: "text", id: "st-group", value: E.group, list: "dl-groups", placeholder: "Ví dụ: Tổ 1" });
      const note = h("input", { type: "text", id: "st-note", value: E.note, placeholder: "Ví dụ: Lớp trưởng" });
      let gender = E.gender;
      const gSeg = h("div", { class: "seg" }, [["", "Không ghi"], ["Nam", "Nam"], ["Nữ", "Nữ"]].map(([v, l]) => { const i = h("input", { type: "radio", name: "stg", id: "stg" + (v || "x"), checked: gender === v }); i.addEventListener("change", () => gender = v); return h("label", { for: "stg" + (v || "x") }, i, h("span", {}, l)); }));
      const save = keepOpen => {
        const n = cleanName(name.value); if (!n) { toast("Nhập họ và tên học sinh"); name.focus(); return; }
        if (n !== E.orig && c.roster.includes(n)) { toast("Lớp đã có bạn tên này. Thêm chữ phân biệt, ví dụ “An B”."); name.focus(); return; }
        const meta = pickMeta({ group: grp.value, gender, note: note.value });
        if (isNew) { c.roster.push(n); c.pool = null; } else renameStudent(c, E.orig, n);
        c.meta[n] = meta; saveCls(); Sfx.right();
        toast(isNew ? `Đã thêm ${n}` : `Đã lưu ${n}`, 1500);
        editState = keepOpen ? { name: "", group: grp.value, gender: "", note: "" } : null; draw();
        if (keepOpen) setTimeout(() => $("#st-name")?.focus(), 0);
      };
      name.addEventListener("keydown", e => { if (e.key === "Enter") save(isNew); });
      setTimeout(() => name.focus(), 0);
      return h("section", { class: "panel stack edit-panel" },
        h("div", { class: "sp-head" }, h("h3", {}, isNew ? "Thêm học sinh" : "Sửa thông tin học sinh"), on(h("button", { class: "ibtn", "data-hit": true, "aria-label": "Đóng" }, clIcon("close")), () => { editState = null; draw(); })),
        h("div", { class: "edit-grid" },
          h("label", { class: "field", for: "st-name" }, h("span", {}, "Họ và tên"), name),
          h("label", { class: "field", for: "st-group" }, h("span", {}, "Tổ / nhóm"), grp),
          h("div", { class: "field" }, h("span", {}, "Giới tính"), gSeg),
          h("label", { class: "field", for: "st-note" }, h("span", {}, "Ghi chú"), note)),
        h("div", { class: "row" },
          on(h("button", { class: "btn primary sm", "data-hit": true }, isNew ? "Thêm và nhập tiếp" : "Lưu thay đổi"), () => save(isNew)),
          isNew ? on(h("button", { class: "btn sm", "data-hit": true }, "Thêm và đóng"), () => save(false)) : null,
          isNew ? h("small", { class: "muted" }, "Nhấn Enter để thêm nhanh từng bạn") : null));
    }
    function pastePanel(c) {
      const ta = h("textarea", { id: "cls-paste", spellcheck: "false", placeholder: "Mỗi dòng một học sinh. Có thể dán thẳng từ Excel (cột Họ và tên, cột Tổ):\nNguyễn Văn An\tTổ 1\nTrần Thị Bình\tTổ 2\nLò Văn Chiến" });
      const info = h("small", { class: "muted" }, "");
      const parse = () => ta.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
        const cells = l.split(/\t|\s\|\s|;/).map(x => x.trim()).filter(Boolean);
        const nameCell = cells.find(x => /\p{L}/u.test(x) && !/^\d+$/.test(x)) || "";
        const rest = cells.filter(x => x !== nameCell && !/^\d+$/.test(x));
        return { name: nameCell, group: rest[0] || "" };
      }).filter(s => cleanName(s.name));
      ta.addEventListener("input", () => { info.textContent = `${parse().length} học sinh`; });
      const apply = mode => { const list = parse(); if (!list.length) { toast("Chưa có tên nào"); return; } const r = addStudents(c, list, mode); saveCls(); pasteOpen = false; toast(`Đã thêm ${r.added} học sinh` + (r.updated ? `, cập nhật ${r.updated}` : "") + (r.renamed ? `, ${r.renamed} tên trùng được thêm số` : ""), 3000); Sfx.right(); draw(); };
      setTimeout(() => ta.focus(), 0);
      return h("section", { class: "panel stack" },
        h("div", { class: "sp-head" }, h("h3", {}, "Dán danh sách học sinh"), on(h("button", { class: "ibtn", "data-hit": true, "aria-label": "Đóng" }, clIcon("close")), () => { pasteOpen = false; draw(); })),
        ta, info,
        h("div", { class: "row" },
          on(h("button", { class: "btn primary sm", "data-hit": true }, "Thêm vào danh sách"), () => apply("merge")),
          c.roster.length ? on(h("button", { class: "btn sm", "data-hit": true }, "Thay thế toàn bộ danh sách"), () => apply("replace")) : null));
    }
    async function importFile(f) {
      importState = { loading: f.name }; CLP.tab = "list"; editState = null; pasteOpen = false; draw();
      try {
        const ext = (f.name.split(".").pop() || "").toLowerCase();
        let sheets;
        if (ext === "xls") throw new Error("Tệp .xls là định dạng Excel đời cũ. Mở bằng Excel → Lưu thành (Save As) → Sổ làm việc Excel (.xlsx) rồi nhập lại.");
        if (ext === "xlsx" || ext === "xlsm") sheets = await XL.read(await f.arrayBuffer());
        else if (["csv", "tsv", "txt"].includes(ext)) sheets = [{ name: f.name, rows: XL.parseCSV(await f.text()) }];
        else throw new Error("Chỉ nhận file Excel (.xlsx) hoặc CSV.");
        let best = null;
        for (const sh of sheets) { const r = parseRosterRows(sh.rows); if (!best || r.students.length > best.students.length) best = { ...r, sheet: sh.name }; }
        if (!best || !best.students.length) throw new Error("Không tìm thấy tên học sinh trong file. Hãy để tên ở cột có tiêu đề “Họ và tên” (hoặc hai cột “Họ” và “Tên”), hoặc dùng file mẫu.");
        const base = f.name.replace(/\.[^.]+$/, ""), m = base.match(/(\d{1,2}\s*[A-Za-zĐđ]\s*\d{0,2})/);
        importState = { ...best, file: f.name, newName: best.clsName || (m ? "Lớp " + m[1].replace(/\s+/g, "").toUpperCase() : base) };
      } catch (e) { importState = { error: e.message || String(e), file: f.name }; Sfx.wrong(); }
      draw();
    }
    function importPanel(c) {
      const P = importState;
      const close = on(h("button", { class: "ibtn", "data-hit": true, "aria-label": "Đóng" }, clIcon("close")), () => { importState = null; draw(); });
      if (P.loading) return h("section", { class: "panel imp-box" }, h("div", { class: "spin", style: "width:28px;height:28px;border-width:4px" }), h("span", {}, `Đang đọc ${P.loading}…`));
      if (P.error) return h("section", { class: "panel imp-box bad" }, h("div", {}, h("b", {}, `Không nhập được “${P.file}”`), h("p", { style: "margin:4px 0 0" }, P.error)), h("div", { class: "row" }, on(h("button", { class: "btn sm", "data-hit": true }, icon("down"), "Tải file mẫu"), rosterTemplate), close));
      let mode = c.roster.length ? "merge" : "replace";
      const nameIn = h("input", { type: "text", id: "imp-cls", value: P.newName, maxlength: 40 });
      const opt = (v, t, s) => { const i = h("input", { type: "radio", name: "impm", id: "impm-" + v, checked: mode === v }); i.addEventListener("change", () => { mode = v; nameIn.disabled = v !== "new"; }); return h("label", { class: "imp-mode", for: "impm-" + v }, i, h("span", {}, h("b", {}, t), h("small", {}, s))); };
      nameIn.disabled = mode !== "new";
      const groups = [...new Set(P.students.map(s => s.group).filter(Boolean))];
      const dupInFile = P.students.length - new Set(P.students.map(s => s.name)).size;
      return h("section", { class: "panel stack imp-panel" },
        h("div", { class: "sp-head" }, h("div", {}, h("h3", {}, `Đọc được ${P.students.length} học sinh`), h("small", { class: "muted" }, `từ “${P.file}”${P.sheet && P.sheet !== P.file ? `, trang “${P.sheet}”` : ""}`)), close),
        h("div", { class: "chips" },
          P.cols.split ? h("span", { class: "chipinfo ok" }, "Ghép cột Họ + Tên") : null,
          groups.length ? h("span", { class: "chipinfo ok" }, `${groups.length} tổ / nhóm`) : null,
          P.cols.gender ? h("span", { class: "chipinfo ok" }, "Có giới tính") : null,
          P.skipped ? h("span", { class: "chipinfo" }, `Bỏ qua ${P.skipped} dòng không phải tên`) : null,
          dupInFile ? h("span", { class: "chipinfo" }, `${dupInFile} tên trùng sẽ được thêm số`) : null),
        h("div", { class: "imp-preview" }, P.students.slice(0, 18).map(s => h("span", { class: "imp-st" }, avatar(s.name, "xs"), s.name)), P.students.length > 18 ? h("span", { class: "imp-more" }, `+${P.students.length - 18} bạn khác`) : null),
        h("div", { class: "imp-modes" },
          c.roster.length ? opt("merge", `Thêm vào lớp “${c.name}”`, "Giữ danh sách hiện có, bạn nào trùng tên thì cập nhật tổ / ghi chú") : null,
          opt("replace", c.roster.length ? `Thay thế danh sách lớp “${c.name}”` : `Đưa vào lớp “${c.name}”`, c.roster.length ? `Xóa ${c.roster.length} học sinh hiện có và dùng danh sách mới` : "Lớp đang trống"),
          h("div", { class: "imp-new" }, opt("new", "Tạo lớp mới", "Giữ nguyên lớp hiện tại"), nameIn)),
        h("div", { class: "row" },
          on(h("button", { class: "btn primary", "data-hit": true }, clIcon("check"), "Nhập danh sách"), () => {
            let target = c;
            if (mode === "new") { target = migrateCls({}).classes[0]; target.name = nameIn.value.trim() || P.newName || "Lớp mới"; CLS.classes.push(target); CLS.cur = target.id; }
            const r = addStudents(target, P.students, mode === "new" ? "replace" : mode);
            saveCls(); importState = null; Sfx.win(); FX.rain();
            toast(`Đã nhập ${r.added} học sinh vào “${target.name}”` + (r.updated ? `, cập nhật ${r.updated} bạn` : ""), 3500);
            draw();
          }),
          on(h("button", { class: "btn", "data-hit": true }, "Hủy"), () => { importState = null; draw(); })));
    }

    /* ================= XẾP HẠNG ================= */
    function rankView(c) {
      const rows = c.roster.map(n => ({ n, s: scoreOf(c, n), p: c.scores[n]?.plays || 0, b: c.scores[n]?.bonus || 0, g: c.meta[n]?.group || "" })).sort((a, b) => b.s - a.s || b.p - a.p || viNameCmp(a.n, b.n));
      const scored = rows.filter(r => r.s > 0 || r.p > 0);
      const wrap = h("div", { class: "stack", style: "gap:18px" });
      let armed = false;
      const reset = on(h("button", { class: "btn sm danger", "data-hit": true }, "Bắt đầu buổi học mới"), () => {
        if (!armed) { armed = true; reset.textContent = "Bấm lần nữa để xóa điểm buổi học"; ts.push(setTimeout(() => { armed = false; reset.textContent = "Bắt đầu buổi học mới"; }, 3000)); return; }
        c.scores = {}; saveCls(); toast("Đã xóa điểm buổi học, sẵn sàng buổi mới"); draw();
      });
      wrap.append(h("div", { class: "lib-top" },
        h("div", {}, h("h3", { style: "margin:0" }, "Bảng xếp hạng buổi học"), h("small", { class: "muted" }, "Điểm từ các trò chơi cộng với điểm thưởng giáo viên trao")),
        h("div", { class: "row" },
          on(h("button", { class: "btn sm", "data-hit": true, disabled: !c.roster.length }, icon("xls"), "Xuất bảng điểm"), () => {
            const data = [["Hạng", "Họ và tên", "Tổ", "Điểm", "Lượt chơi", "Điểm thưởng"], ...rows.map((r, i) => [String(i + 1), r.n, r.g, String(r.s), String(r.p), String(r.b)])];
            downloadBlob(XL.write([{ name: "Xếp hạng", header: true, widths: [7, 32, 12, 10, 11, 13], rows: data }]), `${c.name} - xep hang - ${todayStr()}.xlsx`); toast("Đã xuất bảng điểm");
          }), scored.length ? reset : null)));
      if (!c.roster.length) { wrap.append(emptyRoster("Thêm học sinh để bắt đầu tính điểm")); return wrap; }
      if (!scored.length) wrap.append(h("section", { class: "panel empty" }, h("span", { class: "st-empty-ic", html: CL_IC.trophy }), h("b", {}, "Chưa có điểm trong buổi học này"),
        h("p", { class: "muted" }, "Chọn tên người chơi trước mỗi lượt chơi, hoặc trao điểm thưởng ngay khi gọi tên, điểm sẽ hiện ở đây."),
        h("div", { class: "row", style: "justify-content:center" }, on(h("button", { class: "btn primary", "data-hit": true }, clIcon("dice"), "Gọi tên học sinh"), () => { CLP.tab = "pick"; draw(); }))));
      else {
        const top = scored.slice(0, 3), order = [1, 0, 2].filter(i => top[i]);
        wrap.append(h("section", { class: "podium" }, order.map(i => { const r = top[i]; return h("div", { class: `pod p${i + 1}` },
          h("div", { class: "pod-av" }, avatar(r.n, "lg"), h("span", { class: "pod-medal" }, i + 1)),
          h("b", { class: "pod-name" }, r.n), h("span", { class: "pod-score" }, vi(r.s), h("small", {}, " điểm")),
          h("div", { class: "pod-base" }, h("span", {}, ["Hạng nhất", "Hạng nhì", "Hạng ba"][i]))); })));
      }
      const groups = groupsOf(c);
      const max = Math.max(1, ...rows.map(r => r.s));
      const list = h("section", { class: "lib-group rank-list" }, rows.map((r, i) => h("div", { class: "rk-row" + (i < 3 && r.s ? " top" : "") },
        h("span", { class: "rank" + (i < 3 && r.s ? " r" + (i + 1) : "") }, i + 1),
        avatar(r.n, "sm"),
        h("div", { class: "rk-main" }, h("b", {}, r.n), h("small", {}, [r.g, r.p ? `${r.p} lượt chơi` : "", r.b ? `${r.b > 0 ? "+" : ""}${r.b} thưởng` : ""].filter(Boolean).join(" · ") || "Chưa có điểm")),
        h("div", { class: "bar rk-bar" }, h("i", { style: `width:${r.s / max * 100}%` })),
        h("b", { class: "rk-score" }, vi(r.s)),
        h("div", { class: "rk-adj" },
          on(h("button", { class: "pts-btn minus", "data-hit": true, title: "Trừ 1 điểm", "aria-label": "Trừ 1 điểm " + r.n }, "−1"), () => { award(r.n, -1); draw(); }),
          on(h("button", { class: "pts-btn", "data-hit": true, title: "Cộng 1 điểm", "aria-label": "Cộng 1 điểm " + r.n }, "+1"), () => { award(r.n, 1); draw(); })))));
      const sideBits = [];
      if (groups.length) {
        const gs = groups.map(g => { const m = rows.filter(r => r.g === g); const t = m.reduce((a, r) => a + r.s, 0); return { g, t, avg: m.length ? t / m.length : 0, n: m.length }; }).sort((a, b) => b.t - a.t);
        const gmax = Math.max(1, ...gs.map(x => x.t));
        sideBits.push(h("section", { class: "panel stack", style: "gap:12px" }, h("h3", {}, "Thi đua theo tổ"),
          gs.map((x, i) => h("div", { class: "grp-row" }, h("div", { class: "grp-top" }, h("span", { class: "grp", style: `--av:${avColor(x.g)}` }, x.g), h("b", {}, vi(x.t)), h("small", { class: "muted" }, `TB ${vi(Math.round(x.avg * 10) / 10)} · ${x.n} bạn`)), h("div", { class: "bar" }, h("i", { style: `width:${x.t / gmax * 100}%;background:${avColor(x.g)}` }))))));
      }
      const bests = store.get("lhvt2.best", {}), rec = [];
      for (const [k, v] of Object.entries(bests)) { const [sid, gid] = k.split(":"), s = SETS.find(x => x.id === sid), gm = GAMES.find(x => x.id === gid); if (s && gm) rec.push({ s, gm, v }); }
      rec.sort((a, b) => b.v.score - a.v.score);
      sideBits.push(h("section", { class: "panel stack", style: "gap:10px" }, h("h3", {}, "Kỷ lục trò chơi"),
        rec.length ? rec.slice(0, 8).map(r => h("div", { class: "rec-row", style: `--c:${r.gm.color}` }, h("span", { class: "rec-ic", html: r.gm.icon }), h("div", {}, h("b", {}, r.gm.name), h("small", {}, `${r.v.by || "Không ghi tên"} · ${r.s.name}`)), h("b", { class: "rec-sc" }, vi(r.v.score))))
          : h("p", { class: "muted", style: "margin:0;font-size:14px" }, "Chưa có kỷ lục nào.")));
      wrap.append(h("div", { class: "rank-grid" }, list, h("div", { class: "stack", style: "gap:18px" }, sideBits)));
      return wrap;
    }

    draw();
    return () => { CLP.busy = false; CLP.present = false; reel?.stop(); wheel?.stop(); removeEventListener("keydown", onKey); ts.forEach(clearTimeout); };
  });
}

/* ---------------- THỐNG KÊ CÂU HỎI ---------------- */
const STATS_UI = { set: "", type: "", player: "", sort: "wrong", only: false };
function statRows(setId, player) {
  return Object.entries(QSTATS[setId] || {}).map(([key, e]) => {
    let r = e.r || 0, w = e.w || 0;
    if (player) { const p = e.pl?.[player]; r = p?.r || 0; w = p?.w || 0; }
    const n = r + w;
    const picks = Object.entries(e.p || {}).sort((a, b) => b[1] - a[1]);
    const wrongBy = Object.entries(e.pl || {}).filter(([, v]) => v.w > 0).sort((a, b) => b[1].w - a[1].w);
    return { key, e, r, w, n, rate: n ? r / n : 0, picks, wrongBy };
  }).filter(x => x.n > 0);
}
const needReview = x => x.n >= 2 ? x.rate < .6 : x.w > 0;
function StatsPage() {
  navPage = "stats";
  setScreen("stats", st => {
    setTitle("Thống kê câu hỏi", "Câu nào học sinh hay sai, để dạy lại cho đúng chỗ");
    const root = h("div", { class: "wrap" }); st.append(root); const ts = [];
    const draw = () => {
      root.innerHTML = "";
      const ids = SETS.filter(s => statRows(s.id).length).map(s => s.id);
      if (!STATS_UI.set || !SETS.find(s => s.id === STATS_UI.set)) STATS_UI.set = ids.includes(currentId) ? currentId : ids[0] || currentId;
      const set = SETS.find(s => s.id === STATS_UI.set) || curSet();
      const allRows = statRows(set.id), players = [...new Set(allRows.flatMap(x => Object.keys(x.e.pl || {})))].sort((a, b) => a.localeCompare(b, "vi"));
      if (STATS_UI.player && !players.includes(STATS_UI.player)) STATS_UI.player = "";
      let rows = statRows(set.id, STATS_UI.player);
      if (STATS_UI.type) rows = rows.filter(x => x.e.t === STATS_UI.type);
      const review = rows.filter(needReview);
      if (STATS_UI.only) rows = review;
      const by = { wrong: (a, b) => b.w - a.w || a.rate - b.rate, rate: (a, b) => a.rate - b.rate || b.n - a.n, asked: (a, b) => b.n - a.n, recent: (a, b) => b.e.last - a.e.last }[STATS_UI.sort];
      rows.sort(by);

      /* thanh công cụ */
      const setSel = h("select", { id: "st-set", "aria-label": "Bộ đề" }, SETS.filter(s => !s.archived || ids.includes(s.id)).map(s => {
        const n = statRows(s.id).length; return h("option", { value: s.id, selected: s.id === set.id }, `${s.name}${n ? ` · ${n} câu đã hỏi` : ""}`);
      }));
      setSel.addEventListener("change", () => { STATS_UI.set = setSel.value; STATS_UI.player = ""; draw(); });
      const plSel = h("select", { id: "st-player", "aria-label": "Học sinh" }, h("option", { value: "" }, "Cả lớp"), players.map(p => h("option", { value: p, selected: p === STATS_UI.player }, p)));
      plSel.addEventListener("change", () => { STATS_UI.player = plSel.value; draw(); });
      const sortSel = h("select", { id: "st-sort", "aria-label": "Sắp xếp" }, [["wrong", "Sai nhiều nhất"], ["rate", "Tỉ lệ đúng thấp nhất"], ["asked", "Hỏi nhiều nhất"], ["recent", "Mới trả lời gần đây"]].map(([v, l]) => h("option", { value: v, selected: STATS_UI.sort === v }, l)));
      sortSel.addEventListener("change", () => { STATS_UI.sort = sortSel.value; draw(); });
      root.append(h("div", { class: "st-tools" },
        h("div", { class: "row" }, setSel, players.length ? plSel : null, sortSel),
        h("div", { class: "row" },
          on(h("button", { class: "btn sm", "data-hit": true, disabled: !allRows.length }, icon("xls"), "Xuất Excel"), () => exportStats(set)),
          on(h("button", { class: "btn primary sm", "data-hit": true, disabled: !review.length }, "Tạo bộ đề ôn tập từ câu hay sai"), () => makeReviewSet(set, review)))));

      if (!allRows.length) {
        root.append(h("section", { class: "panel empty" },
          h("span", { class: "st-empty-ic", html: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>' }),
          h("b", {}, `Bộ đề “${set.name}” chưa có dữ liệu`),
          h("p", { class: "muted" }, "Thống kê được ghi tự động mỗi khi học sinh trả lời trong trò chơi. Chọn tên người chơi trước mỗi lượt để biết em nào hay sai câu nào."),
          h("div", { class: "row", style: "justify-content:center" }, on(h("button", { class: "btn primary", "data-hit": true }, "Vào sảnh trò chơi"), () => go("home")))));
        return;
      }

      /* các chỉ số tổng quan */
      const base = statRows(set.id, STATS_UI.player).filter(x => !STATS_UI.type || x.e.t === STATS_UI.type);
      const tr = base.reduce((a, x) => a + x.r, 0), tw = base.reduce((a, x) => a + x.w, 0), tot = tr + tw;
      const kpi = (l, v, sub, cls = "") => h("div", { class: "kpi " + cls }, h("small", {}, l), h("b", {}, v), h("span", {}, sub));
      root.append(h("div", { class: "kpis" },
        kpi("Lượt trả lời", vi(tot), `${vi(tr)} đúng · ${vi(tw)} sai`),
        kpi("Tỉ lệ đúng", tot ? Math.round(tr / tot * 100) + "%" : "–", STATS_UI.player ? `của ${STATS_UI.player}` : "của cả lớp", tot && tr / tot < .6 ? "bad" : tot && tr / tot >= .8 ? "good" : ""),
        kpi("Câu đã hỏi", vi(base.length), `trong bộ đề “${set.name}”`),
        kpi("Câu cần ôn lại", vi(base.filter(needReview).length), "đúng dưới 60%", base.some(needReview) ? "bad" : "good")));

      /* lọc theo loại câu */
      const types = [...new Set(allRows.map(x => x.e.t))];
      const chips = h("div", { class: "filters" },
        on(h("button", { class: "fchip sm" + (STATS_UI.only ? " active" : ""), "data-hit": true }, `Chỉ câu cần ôn (${review.length})`), () => { STATS_UI.only = !STATS_UI.only; draw(); }),
        h("span", { class: "st-sep" }),
        on(h("button", { class: "fchip sm" + (!STATS_UI.type ? " active" : ""), "data-hit": true }, "Mọi loại câu"), () => { STATS_UI.type = ""; draw(); }),
        ...types.map(t => on(h("button", { class: "fchip sm" + (STATS_UI.type === t ? " active" : ""), "data-hit": true }, TYPE_LBL[t] || t), () => { STATS_UI.type = STATS_UI.type === t ? "" : t; draw(); })));
      root.append(chips);

      /* danh sách câu hỏi */
      const list = h("section", { class: "qlist" });
      if (!rows.length) list.append(h("div", { class: "empty" }, h("b", {}, "Không có câu nào khớp bộ lọc"), h("p", { class: "muted" }, STATS_UI.only ? "Tuyệt vời, không còn câu nào cần ôn lại." : "Thử bỏ bớt bộ lọc.")));
      rows.forEach((x, k) => {
        const pct = Math.round(x.rate * 100), hot = needReview(x);
        const why = [];
        x.picks.slice(0, 3).forEach(([p, c]) => why.push(h("span", { class: "miss" }, `Chọn nhầm “${p}” · ${c} lần`)));
        if (!STATS_UI.player) x.wrongBy.slice(0, 4).forEach(([n, v]) => why.push(h("span", {}, `${n} sai ${v.w}`)));
        list.append(h("div", { class: "qrow" + (hot ? " hot" : "") },
          h("span", { class: "qnum" }, k + 1),
          h("div", { class: "qbody" },
            h("div", { class: "qq" }, x.e.q, h("span", { class: "tbadge" }, TYPE_LBL[x.e.t] || x.e.t)),
            x.e.a ? h("div", { class: "qa" }, x.e.t === "words" || x.e.t === "clue" ? "Đáp án: " : x.e.t === "sort" ? "Thuộc nhóm: " : x.e.t === "match" ? "Ghép với: " : "Đáp án đúng: ", h("b", {}, x.e.a)) : null,
            why.length ? h("div", { class: "qwhy" }, why) : null),
          h("div", { class: "qrate" },
            h("div", { class: "top" }, h("b", {}, pct + "%"), h("span", {}, `${x.r} đúng · ${x.w} sai`)),
            h("div", { class: "rbar", html: `<i style="width:${pct}%"></i><u style="width:${100 - pct}%"></u>` }))));
      });
      root.append(list);

      let armed = false;
      const reset = on(h("button", { class: "btn sm danger", "data-hit": true }, "Xóa thống kê của bộ đề này"), () => {
        if (!armed) { armed = true; reset.textContent = "Bấm lần nữa để xóa"; ts.push(setTimeout(() => { armed = false; reset.textContent = "Xóa thống kê của bộ đề này"; }, 3000)); return; }
        delete QSTATS[set.id]; store.set(QSTAT_KEY, QSTATS); toast("Đã xóa thống kê"); draw();
      });
      root.append(h("div", { class: "row", style: "justify-content:space-between" }, h("small", { class: "muted" }, "Câu cần ôn: đúng dưới 60% (khi đã hỏi từ 2 lần), hoặc đã sai khi mới hỏi 1 lần. Trò Lật thẻ, Hứng rổ và Tìm chữ mang tính may rủi nên không tính vào thống kê."), reset));
    };
    draw();
    return () => ts.forEach(clearTimeout);
  });
}
function exportStats(set) {
  const rows = statRows(set.id).sort((a, b) => b.w - a.w || a.rate - b.rate);
  const head = ["Câu hỏi", "Loại", "Đáp án đúng", "Số lượt", "Đúng", "Sai", "Tỉ lệ đúng", "Hay chọn nhầm", "Học sinh hay sai"];
  const data = rows.map(x => [x.e.q, TYPE_LBL[x.e.t] || x.e.t, x.e.a, String(x.n), String(x.r), String(x.w), Math.round(x.rate * 100) + "%",
    x.picks.slice(0, 3).map(([p, c]) => `${p} (${c})`).join("; "), x.wrongBy.slice(0, 6).map(([n, v]) => `${n} (${v.w})`).join("; ")]);
  downloadBlob(XL.write([{ name: "Thống kê câu hỏi", header: true, widths: [54, 14, 26, 9, 8, 8, 11, 34, 34], rows: [head, ...data] }]), `Thong-ke-${set.name}-${todayStr()}.xlsx`);
  toast("Đã xuất thống kê ra Excel");
}
function makeReviewSet(set, review) {
  const L = { quiz: [], tf: [], match: [], order: [], words: [] }, groups = new Map();
  for (const { e } of review) {
    if (e.t === "quiz" && e.o && e.a) L.quiz.push([e.q, "*" + e.a, ...e.o.filter(o => o !== e.a)].join(" | "));
    else if (e.t === "tf" && e.a) L.tf.push(`${e.q} | ${e.a === "Đúng" ? "Đ" : "S"}`);
    else if (e.t === "match" && e.a) L.match.push(`${e.q} | ${e.a}`);
    else if (e.t === "order" && e.seq) L.order.push(`${e.q.replace(/:/g, " -")}: ${e.seq.join(" | ")}`);
    else if (e.t === "words" && e.a) L.words.push(`${e.a} | ${e.h || e.q}`);
    else if (e.t === "sort" && e.a) { if (!groups.has(e.a)) groups.set(e.a, []); groups.get(e.a).push(e.q); }
  }
  const n = Object.values(L).reduce((a, l) => a + l.length, 0) + [...groups.values()].reduce((a, l) => a + l.length, 0);
  if (!n) { toast("Chưa đủ dữ liệu để tạo bộ đề ôn tập"); return; }
  const s = newSet({ name: `Ôn tập – ${set.name}`, subject: set.subject, grade: set.grade, topic: "Các câu hay sai", tags: ["ôn tập"], date: todayStr() });
  Object.entries(L).forEach(([k, l]) => s[k] = l.join("\n"));
  if (groups.size >= 2) s.sort = [...groups].map(([g, it]) => `${g.replace(/:/g, " -")}: ${it.join(" | ")}`).join("\n");
  SETS.push(s); saveSets(); Sfx.right();
  toast(`Đã tạo bộ đề “${s.name}” với ${n} mục. Bạn có thể sửa thêm trước khi dùng.`, 4000);
  SetsPage({ edit: s.id });
}

/* ---------------- HIỆU CHỈNH TAY (hướng dẫn 3 bước) ---------------- */
function CalibratePage() {
  navPage = "practice";
  setScreen("practice", st => {
    setTitle("Hiệu chỉnh tay", "3 bước làm quen trước giờ học: vào khung hình, chạm, cầm và thả");
    let step = 1, hits = 0, okSince = 0; const ts = [];
    const steps = h("div", { class: "wiz-steps" }), area = h("div", { class: "practice" }), side = h("div", { class: "stack" }), title = h("h3"), desc = h("p", { class: "muted", style: "margin:0" });
    const checks = h("div", { class: "checks" }), gauge = h("div", { class: "stack", style: "gap:6px" }), actions = h("div", { class: "row" });
    const chk = (state, t, s) => h("div", { class: "chk " + state }, h("span", { class: "dot" }, state === "ok" ? "✓" : state === "warn" ? "!" : "·"), h("div", {}, h("b", {}, t), h("small", {}, s)));
    function paintSteps() {
      steps.innerHTML = "";
      ["Vào khung hình", "Chạm nút", "Cầm và thả"].forEach((t, i) => steps.append(h("span", { class: "wstep" + (step === i + 1 ? " on" : step > i + 1 ? " done" : "") }, h("i", {}, step > i + 1 ? "✓" : i + 1), t)));
    }
    function setStep(n) {
      step = n; paintSteps(); area.innerHTML = ""; actions.innerHTML = ""; hits = 0;
      if (n === 1) {
        title.textContent = "Bước 1 · Đứng vào khung hình";
        desc.textContent = "Đứng cách laptop khoảng 0,7–1 m, giơ một bàn tay lên ngang ngực. Các mục bên dưới chuyển xanh là được.";
        area.append(h("div", { class: "stage-pv", style: "position:absolute;inset:0;aspect-ratio:auto;border:none;border-radius:0" }, h("video", { class: "pv", muted: true, playsinline: true }),
          h("div", { class: "pv-empty", "data-pv-empty": true }, h("span", {}, "Bật camera để bắt đầu"))));
        actions.append(on(h("button", { class: "btn primary", "data-hit": true, "data-cam-toggle": true }, "Bật camera"), toggleCam),
          on(h("button", { class: "btn", "data-hit": true }, "Bỏ qua bước này"), () => setStep(2)));
        camUI();
      } else if (n === 2) {
        title.textContent = "Bước 2 · Chạm nút";
        desc.textContent = S.mode === "pinch" ? "Đưa đầu ngón trỏ vào hồng tâm rồi chụm ngón cái với ngón trỏ. Chạm trúng 3 lần." : "Đưa đầu ngón trỏ vào hồng tâm và giữ yên cho vòng tròn chạy đầy, hoặc chụm hai ngón. Chạm trúng 3 lần.";
        spawnTarget();
      } else if (n === 3) {
        title.textContent = "Bước 3 · Cầm và thả";
        desc.textContent = S.grab ? "Chụm hai ngón (hoặc nắm cả bàn tay) vào tấm thẻ, đưa sang ô bên phải rồi mở tay để thả." : "Chụm hai ngón vào tấm thẻ, đưa sang ô bên phải rồi mở tay để thả.";
        const card = h("div", { class: "chip", "data-drag": true }, "Thẻ tập kéo"), holder = h("div", { style: "position:absolute;left:40px;top:60px" }, card);
        const box = h("div", { class: "dropbox", "data-drop": true }, "Thả vào đây");
        card.addEventListener("gdrop", e => { if (e.detail.zone === box) { box.textContent = "Tuyệt vời!"; Sfx.right(); FX.burstEl(box, 40); card.remove(); ts.push(setTimeout(() => setStep(4), 900)); } else toast("Chưa trúng ô. Thử lại nhé!", 1500); });
        card.addEventListener("gselect", () => toast("Hãy chụm và giữ, rồi di chuyển tay trước khi thả.", 2200));
        area.append(holder, box);
      } else {
        S.calibrated = true; saveS();
        title.textContent = "Hoàn tất!"; desc.textContent = "Bạn đã sẵn sàng. Có thể chạy lại hiệu chỉnh bất cứ lúc nào, ví dụ khi đổi phòng học hoặc đổi người chơi.";
        area.append(h("div", { class: "center" }, h("div", { class: "stack", style: "align-items:center;text-align:center" }, h("div", { class: "countdown", style: "font-size:96px" }, "✓"), h("h3", {}, "Sẵn sàng vào lớp!"))));
        actions.append(on(h("button", { class: "btn primary lg", "data-hit": true }, "Vào sảnh trò chơi"), () => go("home")), on(h("button", { class: "btn lg", "data-hit": true }, "Làm lại"), () => setStep(1)));
        FX.rain(); Sfx.win();
      }
    }
    function spawnTarget() {
      area.innerHTML = ""; const W = area.clientWidth, H = area.clientHeight;
      const t = h("button", { class: "target", "data-hit": true, "aria-label": "Hồng tâm", style: `left:${rand(90, W - 90)}px;top:${rand(90, H - 90)}px` });
      on(t, () => { hits++; FX.burstEl(t, 20); Sfx.right(); if (hits >= 3) { area.innerHTML = ""; ts.push(setTimeout(() => setStep(3), 500)); } else spawnTarget(); });
      area.append(t, h("div", { style: "position:absolute;left:16px;top:12px;font-weight:700" }, `Đã trúng ${hits}/3`));
    }
    frameHooks.add(now => {
      const p = Hands.values().next().value;
      // đồng hồ chụm & khoảng cách
      gauge.innerHTML = "";
      const dist = DET.dist, pos = clamp((dist - .05) / .45, 0, 1);
      gauge.append(h("b", {}, "Khoảng cách tới camera"), h("div", { class: "gauge", html: `<i style="left:calc(${pos * 100}% - 3px)"></i>` }), h("div", { class: "gauge-l" }, h("span", {}, "Quá xa"), h("span", {}, "Vừa"), h("span", {}, "Quá gần")));
      const pv = p ? clamp(1 - p.pinchVal / 1.2, 0, 1) : 0;
      gauge.append(h("b", { style: "margin-top:8px" }, p ? `Độ chụm: ${p.hold ? (p.grab && !p.pinch ? "đang nắm" : "đang chụm") : "mở tay"}` : "Độ chụm"),
        h("div", { class: "meter", html: `<i style="width:${pv * 100}%;background:${p?.hold ? "var(--amber)" : "var(--teal)"}"></i><span class="thr" style="left:${(1 - S.pinchOn / 1.2) * 100}%"></span>` }));
      if (step !== 1) { checks.innerHTML = ""; return; }
      const hand = DET.hands > 0, dOk = hand && dist > .1 && dist < .34, light = DET.light;
      const lOk = Cam.running && light > 55 && light < 220;
      checks.innerHTML = "";
      checks.append(
        chk(Cam.running ? "ok" : "", "Camera", Cam.running ? `Đang bật · ${DET.fps} hình/giây` : "Bấm “Bật camera” và chọn Cho phép"),
        chk(hand ? "ok" : Cam.running ? "warn" : "", "Thấy bàn tay", hand ? `Đang thấy ${DET.hands} tay` : "Giơ bàn tay lên, lòng bàn tay hướng về màn hình"),
        chk(!hand ? "" : dOk ? "ok" : "warn", "Khoảng cách", !hand ? "Chờ thấy tay" : dist <= .1 ? "Hơi xa, bước lại gần một chút" : dist >= .34 ? "Quá gần, lùi ra sau một chút" : "Khoảng cách tốt"),
        chk(!Cam.running ? "" : lOk ? "ok" : "warn", "Ánh sáng", !Cam.running ? "Chờ bật camera" : light <= 55 ? "Hơi tối, bật thêm đèn" : light >= 220 ? "Quá chói, tránh đứng ngược sáng" : "Ánh sáng tốt"));
      if (hand && dOk) { if (!okSince) okSince = now; if (now - okSince > 1500) { okSince = 0; Sfx.right(); setStep(2); } } else okSince = 0;
    });
    st.append(h("div", { class: "wrap" }, steps, h("div", { class: "wiz" },
      h("section", { class: "panel stack" }, title, desc, area, actions),
      h("section", { class: "panel stack" }, checks, gauge,
        h("p", { class: "muted", style: "margin:0;font-size:13.5px" }, "Mẹo: đặt laptop ngang tầm ngực, tránh đứng quay lưng ra cửa sổ sáng. Nếu phải chụm thật sát mới nhận, tăng “Độ nhạy chụm” trong Cài đặt."),
        on(h("button", { class: "btn sm", "data-hit": true }, "Mở Cài đặt"), () => go("settings"))))));
    ts.push(setTimeout(() => setStep(Cam.running && DET.hands ? 2 : 1), 30));
    return () => ts.forEach(clearTimeout);
  });
}

/* ---------------- CÀI ĐẶT ---------------- */
/* ==========================================================
   DÙNG KHI KHÔNG CÓ MẠNG (v6.5)
   Service worker lưu sẵn giao diện, font và bộ nhận diện tay vào máy.
   Chỉ bật cho bản web (http/https), không bật cho bản một tệp mở từ ổ đĩa.
   ========================================================== */
const PWA_ON = import.meta.env.PROD && import.meta.env.MODE !== "single" && typeof navigator !== "undefined" && "serviceWorker" in navigator && /^https?:$/.test(location.protocol);
const RUNTIME_CACHE = "lhtl-runtime-v1";
const MP_FILES = [
  { url: VISION_URL, w: .2 },
  { url: WASM_URL + "/vision_wasm_internal.js", w: .2 },
  { url: WASM_URL + "/vision_wasm_internal.wasm", w: 9.4 },
  { url: HAND_MODEL, w: 7.8 }
];
const OFF = { reg: null, waiting: null, prompt: null, busy: false, pct: 0, status: null, updating: false, bannerShown: false };
const fontCssUrl = () => document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis"]')?.href || "";
const isStandalone = () => { try { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch (e) { return false; } };
const fmtMB = b => (b / 1048576).toLocaleString("vi-VN", { maximumFractionDigits: b > 104857600 ? 0 : 1 }) + " MB";

async function offlineStatus() {
  if (!PWA_ON || !("caches" in window)) return null;
  const has = async u => { try { return !!(u && await caches.match(u)); } catch (e) { return false; } };
  const shell = await has(new URL("./index.html", location.href).href);
  const hand = (await Promise.all(MP_FILES.map(f => has(f.url)))).every(Boolean);
  const font = await has(fontCssUrl());
  let used = 0, persisted = false;
  try { used = (await navigator.storage.estimate()).usage || 0; } catch (e) {}
  try { persisted = await navigator.storage.persisted(); } catch (e) {}
  return (OFF.status = { shell, hand, font, used, persisted });
}

async function prepareOffline({ quiet = false } = {}) {
  if (!PWA_ON || OFF.busy) return false;
  if (!navigator.onLine) { if (!quiet) toast("Đang mất mạng. Hãy kết nối Internet rồi tải lại."); return false; }
  OFF.busy = true; OFF.pct = 0; paintOffline();
  try {
    try { await navigator.storage?.persist?.(); } catch (e) {} // xin trình duyệt không tự xóa bộ nhớ này
    await navigator.serviceWorker.ready;
    const cache = await caches.open(RUNTIME_CACHE);
    const jobs = [...MP_FILES];
    const css = fontCssUrl();
    if (css) {
      const r = await fetch(css, { mode: "cors" });
      if (r.ok) {
        const text = await r.clone().text(); await cache.put(css, r);
        [...new Set([...text.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)].map(m => m[1]))].forEach(url => jobs.push({ url, w: .03 }));
      }
    }
    const total = jobs.reduce((a, j) => a + j.w, 0); let done = 0;
    for (const j of jobs) {
      if (!(await caches.match(j.url))) {
        const r = await fetch(j.url, { mode: "cors" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        await cache.put(j.url, r);
      }
      done += j.w; OFF.pct = done / total; paintOffline(true);
    }
    store.set("lhvt6.offline", Date.now());
    if (!quiet) { toast("Đã sẵn sàng dùng khi không có mạng", 2600); Sfx.right(); }
    return true;
  } catch (e) {
    console.warn("prepareOffline", e);
    if (!quiet) toast("Chưa tải xong (" + (e.message || "lỗi mạng") + "). Kiểm tra kết nối rồi thử lại.", 4000);
    return false;
  } finally { OFF.busy = false; await offlineStatus(); paintOffline(); }
}

function offlinePanel() {
  const box = h("section", { class: "panel stack off-panel", id: "offline-panel" });
  setTimeout(async () => { await offlineStatus(); paintOffline(); }, 0);
  return box;
}
function paintOffline(progressOnly) {
  const box = $("#offline-panel"); if (!box) return;
  if (progressOnly && OFF.busy) { const i = box.querySelector(".off-prog i"), b = box.querySelector(".off-prog b"); if (i) i.style.width = Math.round(OFF.pct * 100) + "%"; if (b) b.textContent = Math.round(OFF.pct * 100) + "%"; return; }
  box.innerHTML = "";
  const head = h("div", { class: "sp-head" }, h("div", {}, h("h3", {}, "Dùng khi không có mạng"), h("small", { class: "muted" }, "Lưu sẵn ứng dụng vào máy để mất Wi-Fi giữa tiết vẫn dạy được")),
    h("span", { class: "chipinfo " + (navigator.onLine ? "ok" : "warn") }, navigator.onLine ? "Đang có mạng" : "Đang mất mạng"));
  box.append(head);
  if (!PWA_ON) {
    box.append(h("p", { class: "muted", style: "margin:0" }, import.meta.env.DEV ? "Chức năng này chỉ bật ở bản build (npm run build), không bật khi đang chạy npm run dev." : "Chức năng này dùng được khi mở trang qua địa chỉ web, ví dụ https://vanloi123.info.vn. Bản một tệp mở trực tiếp từ máy vẫn cần Internet cho lần đầu bật camera."));
    return;
  }
  const s = OFF.status || {};
  const item = (ok, title, sub) => h("li", { class: ok ? "ok" : "" }, h("span", { class: "off-ic", html: ok ? '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>' }), h("div", {}, h("b", {}, title), h("small", {}, sub)));
  const ready = s.shell && s.hand && s.font;
  box.append(h("ul", { class: "off-list" },
    item(s.shell, "Giao diện và 23 trò chơi", s.shell ? "Đã lưu trên máy" : "Sẽ tự lưu sau lần tải trang đầu tiên"),
    item(s.hand, "Bộ nhận diện bàn tay", s.hand ? "Đã lưu, bật camera không cần mạng" : "Khoảng 17 MB, cần tải một lần"),
    item(s.font, "Phông chữ", s.font ? "Đã lưu" : "Khoảng 0,5 MB")));
  if (OFF.busy) box.append(h("div", { class: "off-prog" }, h("div", { class: "bar" }, h("i", { style: `width:${Math.round(OFF.pct * 100)}%` })), h("small", { class: "muted" }, "Đang tải… ", h("b", {}, Math.round(OFF.pct * 100) + "%"))));
  const row = h("div", { class: "row" });
  row.append(on(h("button", { class: "btn sm " + (ready ? "" : "primary"), "data-hit": true, disabled: OFF.busy }, icon("down"), ready ? "Kiểm tra và tải lại" : "Tải sẵn để dùng offline"), () => prepareOffline()));
  if (OFF.prompt) row.append(on(h("button", { class: "btn sm primary", "data-hit": true }, clIcon("plus"), "Cài ứng dụng lên máy"), installApp));
  else if (isStandalone()) row.append(h("span", { class: "chipinfo ok" }, "Đang chạy như ứng dụng đã cài"));
  box.append(row);
  box.append(h("small", { class: "muted" }, [
    ready ? "Sẵn sàng: có thể ngắt mạng và mở lại trang bình thường." : "Nên tải sẵn khi đang có Wi-Fi ổn định.",
    s.used ? ` Đang dùng ${fmtMB(s.used)} bộ nhớ trình duyệt.` : "",
    " Đăng nhập, đồng bộ đám mây và giọng đọc trực tuyến vẫn cần mạng; bộ đề, điểm và lớp học được lưu trên máy và tự đồng bộ khi có mạng lại."
  ].join("")));
}
async function installApp() {
  const p = OFF.prompt; if (!p) return;
  OFF.prompt = null; p.prompt();
  try { const r = await p.userChoice; if (r.outcome === "accepted") toast("Đang cài ứng dụng…"); } catch (e) {}
  paintOffline();
}
function showUpdateBanner() {
  if (OFF.bannerShown || !OFF.waiting) return;
  if (screenName === "game" || screenName === "count") { setTimeout(showUpdateBanner, 8000); return; } // không làm phiền khi đang chơi
  OFF.bannerShown = true;
  const bar = h("div", { class: "upd-bar", role: "status" },
    h("span", { class: "upd-ic", html: '<svg viewBox="0 0 24 24"><path d="M12 4v10M7.5 9.5L12 14l4.5-4.5M5 19h14"/></svg>' }),
    h("div", {}, h("b", {}, "Đã có phiên bản mới"), h("small", {}, "Cập nhật mất vài giây, dữ liệu được giữ nguyên.")),
    on(h("button", { class: "btn sm primary", "data-hit": true }, "Cập nhật ngay"), () => { OFF.updating = true; bar.querySelector(".btn").disabled = true; OFF.waiting.postMessage("SKIP_WAITING"); }),
    on(h("button", { class: "ibtn", "data-hit": true, "aria-label": "Để sau", title: "Để sau" }, clIcon("close")), () => bar.remove()));
  document.body.append(bar);
}
function paintNet() {
  let chip = $("#netChip");
  if (!chip) { const tools = $(".tb-tools"); if (!tools) return; chip = h("span", { class: "hchip net-chip", id: "netChip", title: "Không có kết nối Internet. Ứng dụng vẫn dùng được; dữ liệu sẽ đồng bộ khi có mạng lại." }, h("i"), "Ngoại tuyến"); tools.prepend(chip); }
  chip.hidden = navigator.onLine;
}
function initPWA() {
  paintNet();
  addEventListener("online", () => { paintNet(); paintOffline(); toast("Đã có mạng trở lại", 1800); });
  addEventListener("offline", () => { paintNet(); paintOffline(); toast(OFF.status?.shell ? "Mất mạng. Ứng dụng vẫn chạy bình thường." : "Mất mạng. Một số phần có thể chưa dùng được.", 3000); });
  if (!PWA_ON) return;
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); OFF.prompt = e; paintOffline(); });
  addEventListener("appinstalled", () => { OFF.prompt = null; toast("Đã cài “Lớp Học Thầy Lợi” lên máy", 2600); paintOffline(); });
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (OFF.updating) location.reload(); });
  const start = async () => {
    try {
      const reg = OFF.reg = await navigator.serviceWorker.register("./sw.js");
      const watch = w => w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) { OFF.waiting = w; showUpdateBanner(); } });
      if (reg.waiting && navigator.serviceWorker.controller) { OFF.waiting = reg.waiting; showUpdateBanner(); }
      reg.addEventListener("updatefound", () => watch(reg.installing));
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000); // tự kiểm tra bản mới mỗi 30 phút
      await navigator.serviceWorker.ready;
      const st = await offlineStatus(); paintOffline();
      // bộ nhận diện tay rồi cũng phải tải khi bật camera; tải sẵn ngầm cho lần sau, trừ khi máy đang bật chế độ tiết kiệm dữ liệu
      if (st && !(st.hand && st.font) && navigator.onLine && !navigator.connection?.saveData) setTimeout(() => prepareOffline({ quiet: true }), 6000);
    } catch (e) { console.warn("service worker", e); }
  };
  if (document.readyState === "complete") start(); else addEventListener("load", start, { once: true });
}

function SettingsPage() {
  navPage = "settings";
  setScreen("settings", st => {
    setTitle("Cài đặt", "Điều chỉnh cách nhận diện tay, hiển thị và luật chơi");
    const seg = (name, opts, val, fn) => h("div", { class: "seg", role: "radiogroup" }, opts.map(([v, label]) => {
      const inp = h("input", { type: "radio", name, id: `${name}-${v}`, value: v, checked: String(val) === String(v) });
      inp.addEventListener("change", () => { fn(v); saveS(); camUI(); camStats(); }); return h("label", { for: `${name}-${v}` }, inp, h("span", {}, label));
    }));
    const range = (id, label, min, max, step, val, fmt, fn) => { const out = h("small", {}, fmt(val)), r = h("input", { type: "range", id, min, max, step, value: val });
      r.addEventListener("input", () => { fn(+r.value); out.textContent = fmt(+r.value); saveS(); camUI(); }); return h("label", { class: "field", for: id }, h("span", {}, label), r, out); };
    const check = (id, label, sub, val, fn) => { const c = h("input", { type: "checkbox", id, checked: val }); c.addEventListener("change", () => { fn(c.checked); saveS(); camUI(); camStats(); });
      return h("label", { class: "check", for: id, style: "align-items:flex-start" }, c, h("span", {}, label, sub ? h("small", { class: "muted", style: "display:block;font-weight:400" }, sub) : null)); };
    const pct = v => Math.round(v * 100) + "%";
    /* thiết lập riêng cho từng trò chơi */
    let gsel = SettingsPage.gsel || GAMES[0].id; const gchips = h("div", { class: "filters" }), gpanel = h("div", { class: "stack" });
    const paintG = () => {
      SettingsPage.gsel = gsel; gchips.innerHTML = ""; gpanel.innerHTML = "";
      GAMES.forEach(gm => gchips.append(on(h("button", { class: "fchip sm" + (gsel === gm.id ? " active" : ""), "data-hit": true }, gm.name, S.games[gm.id] && Object.keys(S.games[gm.id]).length ? h("i", { class: "cdot", title: "Đã chỉnh riêng" }) : null), () => { gsel = gm.id; paintG(); })));
      const gm = GAMES.find(x => x.id === gsel);
      gpanel.append(h("div", { class: "row", style: "gap:12px" }, h("span", { class: "gicon-sm", style: `--c:${gm.color}`, html: gm.icon }), h("div", {}, h("b", {}, gm.name), h("p", { class: "muted", style: "margin:2px 0 0;font-size:13.5px" }, gm.desc))),
        gameOptsPanel(gm, parseSet(curSet()), paintG));
    };
    paintG();
    const perGame = h("section", { class: "panel stack" }, h("div", { class: "sec-head" }, h("div", {}, h("h3", {}, "Thiết lập từng trò chơi"),
      h("p", { class: "muted", style: "margin:4px 0 0;font-size:14px" }, "Thời gian, số câu, số mạng, tốc độ… riêng cho mỗi trò. Có thể chỉnh nhanh ngay ở màn giới thiệu trước khi chơi.")),
      on(h("button", { class: "btn sm ghost", "data-hit": true }, "Đưa tất cả trò về mặc định"), () => { S.games = {}; saveS(); paintG(); toast("Đã đưa thiết lập của 13 trò về mặc định"); })), gchips, gpanel);
    st.append(h("div", { class: "wrap" }, Cloud.panel(), offlinePanel(), h("div", { class: "grid2" },
      h("section", { class: "panel stack" }, h("h3", {}, "Cử chỉ tay"),
        h("div", { class: "field" }, h("span", {}, "Cách chọn nút"), seg("mode", [["both", "Chụm tay hoặc giữ yên"], ["pinch", "Chỉ chụm tay"], ["dwell", "Chỉ giữ yên"]], S.mode, v => S.mode = v),
          h("small", {}, "Giữ yên hợp với học sinh nhỏ tuổi. Chụm tay nhanh hơn và ít chọn nhầm.")),
        range("dwell", "Thời gian giữ yên để chọn", 600, 2500, 100, S.dwellMs, v => `${vi(v / 1000)} giây`, v => S.dwellMs = v),
        range("pinch", "Độ nhạy chụm", .18, .45, .01, S.pinchOn, v => v < .24 ? "Thấp: phải chụm thật sát" : v < .34 ? "Vừa" : "Cao: chụm nhẹ đã nhận", v => S.pinchOn = v),
        check("grab", "Cho phép nắm cả bàn tay để cầm thẻ", "Tự nhiên hơn với học sinh nhỏ. Tắt nếu hay bị nhận nhầm khi tay đang thả lỏng.", S.grab, v => S.grab = v),
        range("smooth", "Độ mượt con trỏ", .6, 3, .1, S.smooth, v => v < 1.1 ? "Rất mượt, hơi trễ" : v < 2 ? "Cân bằng" : "Nhanh nhạy, hơi rung", v => S.smooth = v),
        h("div", { class: "field" }, h("span", {}, "Số bàn tay nhận diện"), seg("hands", [[1, "1 tay"], [2, "2 tay (cần cho Kéo co)"]], S.hands, v => { S.hands = +v; try { Cam.lm?.setOptions({ numHands: S.hands }); } catch (e) {} })),
        on(h("button", { class: "btn sm", "data-hit": true }, "Chạy lại hiệu chỉnh tay"), () => { S.calibrated = false; saveS(); go("practice"); })),
      h("section", { class: "panel stack" }, h("h3", {}, "Hiển thị"),
        h("div", { class: "field" }, h("span", {}, "Giao diện"), seg("theme", [["dark", "Tối (màn hình laptop)"], ["light", "Sáng (máy chiếu)"]], S.theme, v => { S.theme = v; applyTheme(); })),
        h("div", { class: "field" }, h("span", {}, "Chế độ hiển thị"), seg("view", [["ar", "Thấy chính mình trên màn hình"], ["virtual", "Màn hình thường"]], S.view, v => S.view = v),
          h("small", {}, "Thấy chính mình: hình camera hiện phía sau các nút dạng kính mờ, học sinh nhìn tay thật của mình để chạm. Màn hình thường: không hiện hình camera, bàn tay được vẽ lại và không cần với tới đúng vị trí nút.")),
        range("bgdim", "Độ tối của hình camera phía sau", 0, .6, .01, S.bgDim, v => v < .08 ? "Rất sáng" : v < .25 ? "Vừa, dễ đọc chữ" : "Tối, nổi bật nút", v => S.bgDim = v),
        h("div", { class: "field" }, h("span", {}, "Hình bàn tay"), seg("hstyle", Object.entries(HAND_STYLES), S.handStyle in HAND_STYLES ? S.handStyle : "auto", v => S.handStyle = v),
          h("small", {}, "Quét AI (mặc định): viền sáng ôm theo dáng tay, vệt quét, lưới khớp và khung nhận diện có nhãn cử chỉ. Chỉ vòng trỏ: gọn nhất, hợp khi chiếu cho cả lớp xem.")),
        range("hop", "Độ đậm của hình bàn tay", .3, 1, .02, S.handOpacity, v => pct(v), v => S.handOpacity = v),
        range("hsize", "Kích thước bàn tay (màn hình thường)", .6, 1.6, .05, S.handSize, v => pct(v), v => S.handSize = v),
        range("margin", "Biên độ tay (màn hình thường)", 0, .3, .02, S.margin, v => v < .08 ? "Rộng: phải với tay nhiều, chính xác hơn" : v < .18 ? "Vừa" : "Hẹp: cử động nhỏ đã đi hết màn hình", v => S.margin = v),
        range("bgcam", "Hình người chơi mờ phía sau (màn hình thường)", 0, .45, .01, S.bgCam, v => v === 0 ? "Tắt" : pct(v), v => S.bgCam = v),
        check("showcam", "Hiện khung camera nhỏ ở góc màn hình", "", S.showCam, v => S.showCam = v)),
      h("section", { class: "panel stack" }, h("h3", {}, "Mặc định chung"), h("p", { class: "muted", style: "margin:0;font-size:14px" }, "Áp dụng cho các trò chưa được chỉnh riêng ở phần “Thiết lập từng trò chơi” bên dưới."),
        range("qcount", "Số câu mỗi lượt", 3, 30, 1, S.qCount, v => `${v} câu (hoặc ít hơn nếu bộ đề ngắn)`, v => S.qCount = v),
        range("qtime", "Thời gian mỗi câu", 5, 60, 1, S.qTime, v => `${v} giây`, v => S.qTime = v),
        check("snd", "Bật âm thanh", "", S.sound, v => S.sound = v), ttsSettings(range, check)),
      h("section", { class: "panel stack" }, h("h3", {}, "Phím tắt cho giáo viên"),
        h("div", { class: "stack", style: "gap:8px;font-size:14.5px" },
          h("div", {}, h("span", { class: "kbd" }, "C"), " Bật / tắt camera (ngoài màn chơi)"),
          h("div", {}, h("span", { class: "kbd" }, "F"), " Toàn màn hình (ngoài màn chơi)"),
          h("div", {}, h("span", { class: "kbd" }, "1"), " – ", h("span", { class: "kbd" }, "4"), " Chọn đáp án A–D trong màn chơi"),
          h("div", {}, h("span", { class: "kbd" }, "Esc"), " Thoát màn chơi về sảnh"), h("div", {}, h("span", { class: "kbd" }, "R"), " Đọc lại câu hỏi trong màn chơi")),
        h("div", { class: "row" }, on(h("button", { class: "btn sm", "data-hit": true }, "Khôi phục cài đặt mặc định"), () => { const c = S.calibrated; Object.assign(S, DEF, { calibrated: c }); saveS(); applyTheme(); SettingsPage(); })))), perGame));
  });
}

/* ---------------- gắn nút & phím tắt ---------------- */
function toggleFS() { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => toast("Trình duyệt không cho bật toàn màn hình")); } catch (e) { toast("Trình duyệt không cho bật toàn màn hình"); } }
$$("#nav [data-nav]").forEach(b => on(b, () => go(b.dataset.nav)));
$$("[data-cam-toggle]").forEach(b => on(b, toggleCam));
on($("#camBtn"), toggleCam);
on($("#exitBtn"), () => go("home"));
on($("#fsBtn"), toggleFS);
on($("#railToggle"), () => { S.rail = document.body.classList.contains("rail-mini") ? "full" : "mini"; saveS(); applyRail(); });
on($("#themeBtn"), () => { S.theme = S.theme === "light" ? "dark" : "light"; saveS(); applyTheme(); camUI(); });
addEventListener("keydown", e => {
  if (e.target.matches?.("input,textarea,select") || e.ctrlKey || e.metaKey || e.altKey) return;
  const inGame = document.body.classList.contains("in-game"), k = e.key;
  if (k === "Escape" && inGame && !document.fullscreenElement) { go("home"); return; }
  if (screenName === "game" && /^[1-4]$/.test(k)) { const b = $$(".ans:not(.is-locked)")[+k - 1]; if (b) { b.click(); e.preventDefault(); } return; }
  if (inGame) return;
  if (k === "c" || k === "C") toggleCam();
  else if (k === "f" || k === "F") toggleFS();
});
document.addEventListener("visibilitychange", () => { if (!document.hidden && Cam.running) scheduleFrame(); });

/* ==========================================================
   LƯU TRỮ ĐÁM MÂY (Supabase) — tùy chọn
   - Máy vẫn lưu mọi thứ trong trình duyệt như cũ (chạy được khi mất mạng).
   - Khi giáo viên đăng nhập: bộ đề, danh sách lớp, điểm, kỷ lục, thiết lập trò chơi
     được đồng bộ lên Supabase. Mỗi tài khoản chỉ đọc/ghi được dữ liệu của chính mình (RLS).
   - Dùng trực tiếp API REST của Supabase (Auth + PostgREST), không cần thư viện ngoài.
   ========================================================== */
const Cloud = (() => {
  const CFG_KEY = "lhvt5.cloudcfg", SES_KEY = "lhvt5.session", META_KEY = "lhvt5.sync";
  const SETS_KEY = "lhvt2.sets";
  /* khóa lưu trên máy → tên khóa trên đám mây */
  const KV = { "lhvt2.settings": "prefs", "lhvt4.class": "class", "lhvt2.best": "best", "lhvt4.recentGames": "recent", "lhvt6.qstats": "qstats" };
  /* chỉ đồng bộ thiết lập dạy học; thiết lập camera / tay / hiệu chỉnh là riêng từng máy */
  const PREF_KEYS = ["games", "qCount", "qTime", "sound", "theme", "mode", "dwellMs", "hands", "rail"];

  const fileCfg = (window.LHVT_CLOUD && window.LHVT_CLOUD.url && window.LHVT_CLOUD.anonKey) ? window.LHVT_CLOUD : null;
  let cfg = fileCfg || store.get(CFG_KEY, null);
  let ses = store.get(SES_KEY, null);
  let meta = store.get(META_KEY, null) || {};
  let state = "off", lastErr = "", busy = false, quiet = false, pushT = null, pollT = null, dirty = new Set();
  const listeners = new Set();

  const hash = s => { let x = 5381; for (let i = 0; i < s.length; i++) x = (x * 33 + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36) + ":" + s.length; };
  const saveMeta = () => store.set(META_KEY, meta);
  const ready = () => !!(cfg && cfg.url && cfg.anonKey);
  const signedIn = () => !!(ready() && ses && ses.access_token && ses.user);
  const base = () => cfg.url.replace(/\/+$/, "");
  const emit = () => { listeners.forEach(fn => { try { fn(); } catch (e) {} }); paintChip(); };
  const setState = (s, err = "") => { state = s; lastErr = err; emit(); };

  /* ---------------- gọi API ---------------- */
  async function api(path, opts = {}, auth = true, retry = true) {
    const headers = { apikey: cfg.anonKey, "Content-Type": "application/json", ...(opts.headers || {}) };
    if (auth && ses) headers.Authorization = "Bearer " + ses.access_token;
    else if (/^eyJ/.test(cfg.anonKey)) headers.Authorization = "Bearer " + cfg.anonKey; // khóa mới sb_publishable_ chỉ gửi qua apikey
    let res;
    try { res = await fetch(base() + path, { ...opts, headers }); }
    catch (e) { const err = new Error("Không kết nối được máy chủ. Kiểm tra mạng Internet."); err.offline = true; throw err; }
    if (res.status === 401 && auth && retry && ses?.refresh_token) { await refresh(); return api(path, opts, auth, false); }
    const txt = await res.text(); let body = null; try { body = txt ? JSON.parse(txt) : null; } catch (e) { body = txt; }
    if (!res.ok) { const err = new Error(friendly(body, res.status)); err.status = res.status; throw err; }
    return body;
  }
  function friendly(b, status) {
    const m = String((b && (b.msg || b.error_description || b.message || b.error)) || "");
    if (/invalid login credentials/i.test(m)) return "Sai email hoặc mật khẩu.";
    if (/email not confirmed/i.test(m)) return "Email chưa được xác nhận. Mở hộp thư và bấm vào đường link xác nhận trước.";
    if (/already registered|already been registered|user already exists/i.test(m)) return "Email này đã có tài khoản. Hãy đăng nhập.";
    if (/password should be at least|weak password/i.test(m)) return "Mật khẩu quá ngắn (cần ít nhất 6 ký tự).";
    if (/rate limit|too many/i.test(m)) return "Thao tác quá nhiều lần, vui lòng thử lại sau ít phút.";
    if (/relation .* does not exist|could not find the table/i.test(m)) return "Chưa tạo bảng dữ liệu trên Supabase. Chạy file supabase-schema.sql trong SQL Editor.";
    if (status === 404) return "Không tìm thấy dự án Supabase. Kiểm tra lại địa chỉ Project URL.";
    if (status === 401 || /invalid api key|jwt/i.test(m)) return "Khóa anon không đúng hoặc phiên đăng nhập đã hết hạn.";
    return m || `Lỗi máy chủ (${status}).`;
  }
  const takeSession = s => {
    ses = { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || (Math.floor(Date.now() / 1000) + (s.expires_in || 3600)), user: { id: s.user?.id, email: s.user?.email } };
    store.set(SES_KEY, ses);
  };
  async function refresh() {
    if (!ses?.refresh_token) throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
    try { takeSession(await api("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: ses.refresh_token }) }, false)); }
    catch (e) { if (!e.offline) { ses = null; store.set(SES_KEY, null); setState("off"); } throw e; }
  }
  async function fresh() { if (ses && ses.expires_at - Date.now() / 1000 < 120) await refresh(); }

  /* ---------------- tài khoản ---------------- */
  const redirect = () => location.protocol.startsWith("http") ? location.origin + location.pathname : undefined;
  async function signIn(email, password) {
    takeSession(await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, false));
    await afterLogin(); return true;
  }
  async function signUp(email, password) {
    const r = redirect(), q = r ? "?redirect_to=" + encodeURIComponent(r) : "";
    const out = await api("/auth/v1/signup" + q, { method: "POST", body: JSON.stringify({ email, password }) }, false);
    if (out && out.access_token) { takeSession(out); await afterLogin(); return "in"; }
    return "confirm"; // Supabase đang bật xác nhận email
  }
  async function recover(email) {
    const r = redirect(), q = r ? "?redirect_to=" + encodeURIComponent(r) : "";
    await api("/auth/v1/recover" + q, { method: "POST", body: JSON.stringify({ email }) }, false);
  }
  async function setPassword(password) { await fresh(); await api("/auth/v1/user", { method: "PUT", body: JSON.stringify({ password }) }); }
  async function signOut(wipe) {
    try { if (ses) await api("/auth/v1/logout", { method: "POST" }); } catch (e) {}
    ses = null; store.set(SES_KEY, null); meta = {}; saveMeta(); clearInterval(pollT);
    if (wipe) {
      ["lhvt2.sets", "lhvt2.current", "lhvt4.class", "lhvt2.best", "lhvt4.recentGames", "lhvt4.lib", "lhvt6.qstats"].forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
      quiet = true;
      SETS = JSON.parse(JSON.stringify(SAMPLE_SETS)).map(migrateSet); currentId = SETS[0].id;
      Object.assign(CLS, migrateCls({})); QSTATS = {};
      store.set(SETS_KEY, SETS); store.set("lhvt2.current", currentId); store.set("lhvt4.class", CLS);
      quiet = false;
    }
    setState("off"); rerender();
  }
  async function afterLogin() {
    if (meta.uid && meta.uid !== ses.user.id) meta = {}; // tài khoản khác: bắt đầu lại sổ đồng bộ
    meta.uid = ses.user.id; saveMeta();
    await syncNow(true); startPoll();
  }

  /* ---------------- đồng bộ ---------------- */
  const editing = () => screenName === "sets" && !!document.querySelector(".ed-meta");
  const localSets = () => JSON.parse(JSON.stringify(SETS));
  const kvLocal = key => {
    if (key === "lhvt2.settings") { const o = {}; PREF_KEYS.forEach(k => { if (k in S) o[k] = S[k]; }); return o; }
    if (key === "lhvt4.class") return { classes: CLS.classes, cur: CLS.cur };
    if (key === QSTAT_KEY) return QSTATS;
    return store.get(key, key === "lhvt2.best" ? {} : []);
  };
  function applyKV(key, val) {
    quiet = true;
    if (key === "lhvt2.settings") { PREF_KEYS.forEach(k => { if (val && k in val) S[k] = val[k]; }); store.set(key, S); try { applyTheme(); applyRail(); } catch (e) {} }
    else if (key === "lhvt4.class") { const m = migrateCls(val); CLS.classes = m.classes; if (!CLS.classes.find(c => c.id === CLS.cur)) CLS.cur = m.cur; store.set(key, CLS); }
    else { store.set(key, val); if (key === QSTAT_KEY) QSTATS = val && typeof val === "object" ? val : {}; }
    quiet = false;
  }
  function applySets(list) {
    quiet = true;
    SETS = list.map(s => migrateSet(s));
    if (!SETS.length) SETS = JSON.parse(JSON.stringify(SAMPLE_SETS)).map(migrateSet);
    if (!SETS.find(s => s.id === currentId)) currentId = SETS[0].id;
    store.set(SETS_KEY, SETS); store.set("lhvt2.current", currentId);
    quiet = false;
  }
  /* ghi nhận thay đổi trên máy (gọi từ store.set) */
  function touch(key) {
    if (quiet || !signedIn()) return;
    if (key === SETS_KEY) {
      const now = Date.now(), cur = localSets(), ids = new Set(cur.map(s => s.id));
      meta.sets = meta.sets || {}; meta.mod = meta.mod || {}; meta.tomb = meta.tomb || {};
      cur.forEach(s => { if (hash(JSON.stringify(s)) !== meta.sets[s.id]) meta.mod[s.id] = now; });
      Object.keys(meta.sets).forEach(id => { if (!ids.has(id) && !meta.tomb[id]) meta.tomb[id] = now; });
      saveMeta(); dirty.add("sets");
    } else if (KV[key]) { meta.kvmod = meta.kvmod || {}; meta.kvmod[KV[key]] = Date.now(); saveMeta(); dirty.add(key); }
    else return;
    if (state !== "sync") setState("pending");
    clearTimeout(pushT); pushT = setTimeout(() => syncNow(false), 1500);
  }
  async function syncNow(full) {
    if (!signedIn()) return;
    if (busy) { clearTimeout(pushT); pushT = setTimeout(() => syncNow(full), 800); return; }
    if (editing()) { clearTimeout(pushT); pushT = setTimeout(() => syncNow(full), 8000); return; } // đang soạn đề: chờ soạn xong
    busy = true; setState("sync");
    try {
      await fresh();
      await syncSets(full);
      await syncKV(full);
      meta.last = Date.now(); saveMeta(); dirty.clear();
      setState("ok");
    } catch (e) {
      setState(e.offline ? "offline" : "error", e.message);
      clearTimeout(pushT); pushT = setTimeout(() => syncNow(false), e.offline ? 20000 : 60000);
    } finally { busy = false; }
  }
  async function syncSets(full) {
    meta.sets = meta.sets || {}; meta.mod = meta.mod || {}; meta.tomb = meta.tomb || {}; meta.rts = meta.rts || {};
    const rows = await api("/rest/v1/question_sets?select=id,data,ts,deleted");
    const R = new Map((rows || []).map(r => [r.id, r]));
    let list = localSets(); const L = new Map(list.map(s => [s.id, s])), push = [], now = Date.now();
    let changedLocal = false;
    for (const id of new Set([...R.keys(), ...L.keys(), ...Object.keys(meta.tomb)])) {
      const r = R.get(id), l = L.get(id), lh = l ? hash(JSON.stringify(l)) : null;
      const ldirty = l && lh !== meta.sets[id], lmod = meta.mod[id] || 0;
      if (!l) {
        const tomb = meta.tomb[id];
        if (tomb) {
          if (r && !r.deleted && +r.ts > tomb) { list.push(r.data); changedLocal = true; meta.sets[id] = hash(JSON.stringify(r.data)); delete meta.tomb[id]; }
          else { if (!r || !r.deleted) push.push({ id, data: null, ts: Math.max(tomb, now), deleted: true }); delete meta.sets[id]; delete meta.tomb[id]; }
        } else if (r && !r.deleted) { list.push(r.data); changedLocal = true; meta.sets[id] = hash(JSON.stringify(r.data)); }
        continue;
      }
      if (!r) { push.push({ id, data: l, ts: Math.max(lmod, now), deleted: false }); continue; }
      if (r.deleted) {
        if (ldirty && lmod > +r.ts) push.push({ id, data: l, ts: now, deleted: false });
        else { list = list.filter(s => s.id !== id); changedLocal = true; delete meta.sets[id]; }
        continue;
      }
      const rh = hash(JSON.stringify(r.data));
      if (rh === lh) { meta.sets[id] = lh; continue; }
      if (ldirty && lmod > +r.ts) push.push({ id, data: l, ts: now, deleted: false });
      else { list = list.map(s => s.id === id ? r.data : s); changedLocal = true; meta.sets[id] = rh; }
    }
    if (push.length) {
      await api("/rest/v1/question_sets?on_conflict=user_id,id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(push.map(p => ({ user_id: ses.user.id, ...p }))) });
      push.forEach(p => { if (p.deleted) delete meta.sets[p.id]; else meta.sets[p.id] = hash(JSON.stringify(p.data)); });
    }
    if (changedLocal) { applySets(list); rerender(); }
    saveMeta();
  }
  async function syncKV(full) {
    meta.kvmod = meta.kvmod || {}; meta.kvts = meta.kvts || {};
    const rows = await api("/rest/v1/user_kv?select=key,value,ts");
    const R = new Map((rows || []).map(r => [r.key, r])), push = [];
    let changed = false;
    for (const [lk, ck] of Object.entries(KV)) {
      const r = R.get(ck), lmod = meta.kvmod[ck] || 0, known = meta.kvts[ck] || 0;
      if (ck === "best") { // kỷ lục: gộp hai bên, giữ điểm cao hơn
        const loc = kvLocal(lk) || {}, rem = (r && r.value) || {}, m = { ...rem };
        Object.entries(loc).forEach(([k, v]) => { if (!m[k] || (v?.score || 0) > (m[k]?.score || 0)) m[k] = v; });
        if (JSON.stringify(m) !== JSON.stringify(loc)) { applyKV(lk, m); changed = true; }
        if (JSON.stringify(m) !== JSON.stringify(rem)) { const ts = Date.now(); push.push({ key: ck, value: m, ts }); meta.kvts[ck] = ts; } else if (r) meta.kvts[ck] = +r.ts;
        continue;
      }
      if (r && +r.ts > known && +r.ts >= lmod) { applyKV(lk, r.value); meta.kvts[ck] = +r.ts; changed = true; }
      else if (!r || lmod > known || full && lmod > +r.ts) {
        const v = kvLocal(lk); if (v == null || (!r && !lmod && !full)) continue;
        const ts = Math.max(lmod, Date.now()); push.push({ key: ck, value: v, ts }); meta.kvts[ck] = ts;
      }
    }
    if (push.length) await api("/rest/v1/user_kv?on_conflict=user_id,key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(push.map(p => ({ user_id: ses.user.id, ...p }))) });
    if (changed) rerender();
    saveMeta();
  }
  function rerender() {
    try { if (["home", "sets", "class", "settings", "stats"].includes(screenName) && !document.body.classList.contains("in-game")) go(navPage); } catch (e) {}
  }
  function startPoll() {
    clearInterval(pollT);
    pollT = setInterval(() => { if (!document.hidden && signedIn() && !busy && !document.body.classList.contains("in-game")) syncNow(false); }, 90000);
  }

  /* xử lý đường link trong email (xác nhận tài khoản / đặt lại mật khẩu) */
  let recoveryMode = false;
  function readHash() {
    if (!location.hash || !/access_token=/.test(location.hash)) return;
    const p = new URLSearchParams(location.hash.slice(1));
    takeSession({ access_token: p.get("access_token"), refresh_token: p.get("refresh_token"), expires_in: +p.get("expires_in") || 3600, user: null });
    recoveryMode = p.get("type") === "recovery";
    history.replaceState(null, "", location.pathname + location.search);
  }
  async function loadUser() {
    const u = await api("/auth/v1/user"); ses.user = { id: u.id, email: u.email }; store.set(SES_KEY, ses);
  }

  /* ---------------- giao diện ---------------- */
  const CLOUD_IC = '<svg viewBox="0 0 24 24"><path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4.5 4.5 0 0 1-.5 9.98z"/></svg>';
  const label = () => !ready() ? "Chưa kết nối" : !signedIn() ? "Chưa đăng nhập" :
    { sync: "Đang đồng bộ…", ok: "Đã đồng bộ", pending: "Chờ đồng bộ", offline: "Mất mạng – lưu trên máy", error: "Lỗi đồng bộ" }[state] || "Đã đăng nhập";
  function paintChip() {
    const b = $("#cloudBtn"); if (!b) return;
    b.dataset.st = !signedIn() ? "off" : state; b.querySelector(".lbltxt").textContent = label();
    b.title = signedIn() ? `Tài khoản ${ses.user.email || ""} · ${label()}` : "Đăng nhập để lưu dữ liệu lên đám mây";
  }
  function chip() {
    const b = h("button", { class: "tb-btn cloud-chip", id: "cloudBtn", "data-hit": true }, h("span", { class: "cic", html: CLOUD_IC }), h("span", { class: "lbltxt" }, ""));
    on(b, () => { if (document.body.classList.contains("in-game")) return; go("settings"); setTimeout(() => $("#cloudPanel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); });
    return b;
  }
  function panel() {
    const box = h("section", { class: "panel stack cloud-panel", id: "cloudPanel" });
    const paint = () => {
      box.innerHTML = "";
      const head = h("div", { class: "cloud-head" }, h("span", { class: "cloud-ic", html: CLOUD_IC }),
        h("div", {}, h("h3", {}, "Tài khoản & lưu trữ đám mây"),
          h("p", { class: "muted" }, signedIn() ? "Bộ đề, danh sách lớp, điểm, kỷ lục và thiết lập trò chơi được lưu lên Supabase. Mở trang trên máy khác và đăng nhập là có lại đầy đủ." : "Đăng nhập để lưu dữ liệu lên Supabase và dùng chung trên nhiều máy. Không đăng nhập thì trang vẫn chạy bình thường, dữ liệu chỉ nằm trên máy này.")));
      box.append(head);
      const msg = h("p", { class: "cloud-msg", role: "status" });
      const say = (t, bad) => { msg.textContent = t; msg.classList.toggle("bad", !!bad); };
      const wrap = fn => async () => { if (box.classList.contains("busy")) return; box.classList.add("busy"); say(""); try { await fn(); } catch (e) { say(e.message, true); } finally { box.classList.remove("busy"); } };

      if (!ready()) {
        const u = h("input", { type: "url", id: "cl-url", placeholder: "https://xxxx.supabase.co", value: cfg?.url || "" });
        const k = h("input", { type: "text", id: "cl-key", placeholder: "eyJhbGciOi… (anon public key)", value: cfg?.anonKey || "", spellcheck: "false" });
        box.append(h("div", { class: "cloud-grid" },
          h("label", { class: "field", for: "cl-url" }, h("span", {}, "Project URL"), u),
          h("label", { class: "field", for: "cl-key" }, h("span", {}, "Khóa anon public"), k)),
          h("p", { class: "muted", style: "font-size:13.5px;margin:0" }, "Lấy trong Supabase: Project Settings → API. Khi đưa trang lên GitHub, có thể điền sẵn hai giá trị này trong file index.html để giáo viên không phải nhập."),
          h("div", { class: "row" }, on(h("button", { class: "btn primary", "data-hit": true }, "Kết nối"), wrap(async () => {
            const url = u.value.trim(), key = k.value.trim();
            if (!/^https:\/\/[^ ]+$/.test(url) || key.length < 20) throw new Error("Điền đủ Project URL (bắt đầu bằng https://) và khóa anon.");
            cfg = { url, anonKey: key }; store.set(CFG_KEY, cfg); paint(); emit();
          }))), msg);
        return;
      }
      if (recoveryMode && signedIn()) {
        const p1 = h("input", { type: "password", id: "cl-np", autocomplete: "new-password", placeholder: "Ít nhất 6 ký tự" });
        box.append(h("label", { class: "field", for: "cl-np" }, h("span", {}, "Mật khẩu mới"), p1),
          h("div", { class: "row" }, on(h("button", { class: "btn primary", "data-hit": true }, "Lưu mật khẩu mới"), wrap(async () => { await setPassword(p1.value); recoveryMode = false; toast("Đã đổi mật khẩu"); paint(); }))), msg);
        return;
      }
      if (!signedIn()) {
        const em = h("input", { type: "email", id: "cl-email", autocomplete: "email", placeholder: "giaovien@truong.edu.vn" });
        const pw = h("input", { type: "password", id: "cl-pass", autocomplete: "current-password", placeholder: "Mật khẩu" });
        const need = () => { const e = em.value.trim(), p = pw.value; if (!/^\S+@\S+\.\S+$/.test(e)) throw new Error("Nhập email hợp lệ."); return [e, p]; };
        box.append(h("div", { class: "cloud-grid" }, h("label", { class: "field", for: "cl-email" }, h("span", {}, "Email"), em), h("label", { class: "field", for: "cl-pass" }, h("span", {}, "Mật khẩu"), pw)),
          h("div", { class: "row" },
            on(h("button", { class: "btn primary", "data-hit": true }, "Đăng nhập"), wrap(async () => { const [e, p] = need(); if (!p) throw new Error("Nhập mật khẩu."); await signIn(e, p); toast("Đã đăng nhập và đồng bộ dữ liệu", 2500); paint(); })),
            on(h("button", { class: "btn", "data-hit": true }, "Tạo tài khoản mới"), wrap(async () => { const [e, p] = need(); if ((p || "").length < 6) throw new Error("Mật khẩu cần ít nhất 6 ký tự."); const r = await signUp(e, p); if (r === "in") { toast("Đã tạo tài khoản và đăng nhập", 2500); paint(); } else say("Đã gửi email xác nhận tới " + e + ". Mở email, bấm vào đường link, rồi quay lại đây đăng nhập."); })),
            on(h("button", { class: "btn ghost sm", "data-hit": true }, "Quên mật khẩu"), wrap(async () => { const [e] = need(); await recover(e); say("Đã gửi email đặt lại mật khẩu tới " + e + "."); }))),
          msg,
          fileCfg ? "" : h("p", { class: "muted", style: "font-size:13px;margin:0" }, "Đang kết nối tới ", h("b", {}, cfg.url.replace(/^https:\/\//, "")), ". ",
            on(h("button", { class: "linkbtn", "data-hit": true }, "Đổi máy chủ"), () => { cfg = null; store.set(CFG_KEY, null); paint(); emit(); })));
        return;
      }
      const st = h("div", { class: "cloud-status", "data-st": state },
        h("i"), h("div", {}, h("b", {}, label()), h("small", { class: "muted" }, `${ses.user.email || ""}${meta.last ? " · lần cuối " + new Date(meta.last).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : ""}`)));
      if (lastErr && (state === "error" || state === "offline")) say(lastErr, true);
      box.append(st, h("div", { class: "row" },
        on(h("button", { class: "btn primary", "data-hit": true }, "Đồng bộ ngay"), wrap(async () => { await syncNow(true); if (state === "error") throw new Error(lastErr); toast("Đã đồng bộ", 1500); })),
        on(h("button", { class: "btn", "data-hit": true }, "Đăng xuất"), wrap(async () => { await signOut(false); toast("Đã đăng xuất. Dữ liệu vẫn giữ trên máy này.", 2500); })),
        on(h("button", { class: "btn ghost", "data-hit": true, "data-hold": true, title: "Dùng trên máy dùng chung: đăng xuất và xóa bộ đề, danh sách lớp trên máy này (dữ liệu trên đám mây vẫn còn)" }, "Đăng xuất và xóa dữ liệu trên máy này"), wrap(async () => {
          if (!confirm("Đăng xuất và xóa bộ đề, danh sách lớp, điểm trên MÁY NÀY?\nDữ liệu trên đám mây vẫn được giữ nguyên.")) return; await signOut(true); toast("Đã đăng xuất và xóa dữ liệu trên máy này", 2500); }))), msg);
    };
    paint();
    const fn = () => { if (box.isConnected) paint(); else listeners.delete(fn); };
    listeners.add(fn);
    return box;
  }

  async function init() {
    window.__cloudTouch = touch;
    const tools = $(".tb-tools"); if (tools && !$("#cloudBtn")) tools.prepend(chip());
    paintChip();
    if (!ready()) return;
    addEventListener("hashchange", () => { if (/access_token=/.test(location.hash)) { readHash(); resume(); } });
    try { readHash(); } catch (e) {}
    addEventListener("online", () => signedIn() && syncNow(false));
    document.addEventListener("visibilitychange", () => { if (!document.hidden && signedIn() && meta.last && Date.now() - meta.last > 30000) syncNow(false); });
    await resume();
  }
  async function resume() {
    if (!ses) return;
    try {
      if (!ses.user || !ses.user.id) await loadUser();
      if (recoveryMode) { go("settings"); toast("Nhập mật khẩu mới trong mục Tài khoản", 3000); }
      if (meta.uid && meta.uid !== ses.user.id) meta = {};
      meta.uid = ses.user.id; saveMeta();
      await syncNow(!meta.last); startPoll();
      if (!recoveryMode && meta.welcome !== ses.user.id) { meta.welcome = ses.user.id; saveMeta(); toast(`Đã đăng nhập: ${ses.user.email}`, 2500); }
    } catch (e) { setState(e.offline ? "offline" : "error", e.message); }
  }
  return { init, panel, chip, touch, syncNow, signIn, signUp, signOut, get state() { return state; }, get user() { return ses?.user || null; }, ready, signedIn };
})();

on($("#ttsBtn"), toggleTTS); paintTTSBtn();
new MutationObserver(() => { if (screenName !== "game") return; clearTimeout(ttsObsT); ttsObsT = setTimeout(ttsAuto, 200); }).observe(stage, { childList: true, subtree: true, characterData: true });
addEventListener("keydown", e => { if ((e.key === "r" || e.key === "R") && screenName === "game" && !e.target.matches?.("input,textarea,select") && !e.ctrlKey && !e.metaKey) { const t = readableQ(); if (t) TTS.say(t, true); } });
applyTheme(); applyRail(); initPWA();
requestAnimationFrame(loop);
go("home");
Cloud.init();
