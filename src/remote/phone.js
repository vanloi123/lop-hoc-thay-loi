/* Lớp Học Thầy Lợi — chế độ điều khiển trên điện thoại.
   Mở bằng đường link dạng  https://…/#remote=<mã kênh>.<khóa>  (quét mã QR trên máy chiếu). */
import { openChannel, randomId } from "./channel.js";

const $ = (s, r = document) => r.querySelector(s);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v; else if (k === "html") el.innerHTML = v; else if (k === "style") el.style.cssText = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
const IC = {
  phone: '<svg viewBox="0 0 24 24"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>',
  screen: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.3" fill="currentColor"/></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  speak: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  scan: '<svg viewBox="0 0 24 24"><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M8 8h3v3H8zM13 13h3v3h-3z"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>',
};
const ico = k => h("span", { class: "rm-i", html: IC[k] });
const buzz = (ms = 12) => { try { navigator.vibrate?.(ms); } catch (e) {} };

const [name, tk] = decodeURIComponent(location.hash.replace(/^#remote=/, "")).split(".");
const ID = (() => { try { let v = sessionStorage.getItem("lhtl.phone"); if (!v) { v = randomId(8); sessionStorage.setItem("lhtl.phone", v); } return v; } catch (e) { return randomId(8); } })();
const DEV = /iphone|ipad/i.test(navigator.userAgent) ? "iPhone / iPad" : /android/i.test(navigator.userAgent) ? "Điện thoại Android" : "Thiết bị khác";
const P = { status: "connecting", tab: "screen", state: null, roster: null, picked: [], lastHost: 0, ch: null, toastT: 0 };

document.title = "Điều khiển · Lớp Học Thầy Lợi";
document.body.className = "rm-phone";
document.body.replaceChildren(h("div", { id: "rmApp" }), h("div", { id: "rmToast", hidden: true }));
try { const t = JSON.parse(localStorage.getItem("lhvt2.settings") || "{}").theme; if (t === "light") document.body.classList.add("light"); } catch (e) {}

function toast(msg) { const t = $("#rmToast"); t.textContent = msg; t.hidden = false; clearTimeout(P.toastT); P.toastT = setTimeout(() => t.hidden = true, 2200); }
function send(p) {
  if (!P.ch?.send({ ...p, tk, id: ID, dev: DEV, from: "phone" })) { toast("Chưa kết nối được máy chiếu"); return false; }
  buzz(); return true;
}

function render() {
  const app = $("#rmApp"); const s = P.state;
  const connected = P.status === "online" && s && Date.now() - P.lastHost < 60000;
  const stTxt = P.status !== "online" ? (P.status === "error" ? "Mất kết nối, đang thử lại…" : "Đang kết nối…") : !s ? "Đang chờ máy chiếu…" : "Đã kết nối";
  const head = h("header", { class: "rm-head" },
    h("div", { class: "rm-brand" }, h("span", { class: "rm-logo", html: IC.phone }), h("div", {}, h("b", {}, "Điều khiển lớp học"), h("small", {}, s?.title ? s.title : "Lớp Học Thầy Lợi"))),
    h("span", { class: "rm-pill " + (connected ? "ok" : P.status === "error" ? "bad" : "") }, h("i"), stTxt));
  const main = h("main", { class: "rm-main" });
  if (!name || !tk) main.append(h("div", { class: "rm-empty" }, h("b", {}, "Đường link không hợp lệ"), h("p", {}, "Hãy quét lại mã QR trên máy chiếu (nút hình điện thoại ở góc trên).")));
  else if (!s) main.append(h("div", { class: "rm-empty" }, h("div", { class: "rm-spin" }), h("b", {}, stTxt), h("p", {}, "Giữ trang Lớp Học Thầy Lợi đang mở trên máy chiếu. Nếu chờ lâu, bấm nút hình điện thoại trên máy chiếu và quét lại mã."),
    h("button", { class: "rm-btn", onclick: () => send({ t: "hello" }) }, ico("refresh"), "Thử lại")));
  else main.append(P.tab === "screen" ? screenTab(s) : P.tab === "pick" ? pickTab() : P.tab === "score" ? scoreTab() : menuTab());
  const tab = (id, ic, l) => h("button", { class: "rm-tab" + (P.tab === id ? " on" : ""), onclick: () => { P.tab = id; buzz(6); if (id !== "screen") send({ t: "sync" }); render(); } }, ico(ic), h("span", {}, l));
  const nav = h("nav", { class: "rm-tabs" }, tab("screen", "screen", "Màn hình"), tab("pick", "dice", "Gọi tên"), tab("score", "trophy", "Điểm"), tab("menu", "menu", "Trang"));
  app.replaceChildren(head, main, s ? nav : "");
}
function screenTab(s) {
  const box = h("div", { class: "rm-screen" });
  box.append(h("div", { class: "rm-now" },
    h("div", {}, h("small", {}, "Máy chiếu đang hiện"), h("b", {}, s.title || "—"), s.sub ? h("span", {}, s.sub) : ""),
    s.score !== "" ? h("div", { class: "rm-score" }, h("small", {}, s.who ? `Lượt của ${s.who}` : "Điểm"), h("b", {}, s.score)) : ""));
  if (s.prog) box.append(h("div", { class: "rm-prog" }, s.prog));
  if (s.q) box.append(h("div", { class: "rm-q" }, s.q));
  if (s.cards) box.append(h("button", { class: "rm-big rm-scan-btn", onclick: openScanner }, ico("scan"), h("span", {}, "Quét thẻ trả lời", h("small", {}, `Đã nhận ${s.cards.got}/${s.cards.total} thẻ`))));
  box.append(h("div", { class: "rm-row" },
    h("button", { class: "rm-btn", onclick: () => send({ t: "back" }) }, ico("back"), s.ing ? "Thoát về sảnh" : "Về sảnh"),
    s.q ? h("button", { class: "rm-btn", onclick: () => send({ t: "tts" }) }, ico("speak"), "Đọc câu hỏi") : ""));
  const ans = s.btns.filter(b => b.k === "ans"), pri = s.btns.filter(b => b.k === "pri"), games = s.btns.filter(b => b.k === "game"), rest = s.btns.filter(b => b.k === "btn");
  const btn = (b, cls) => h("button", { class: cls + (b.d ? " off" : ""), disabled: !!b.d, style: b.c ? `--c:${b.c}` : "", onclick: e => { send({ t: "click", r: b.r }); e.currentTarget.classList.add("hit"); } }, b.l);
  if (ans.length) box.append(h("h4", {}, "Chọn đáp án"), h("div", { class: "rm-ans" + (ans.length > 6 ? " many" : "") }, ans.map(b => btn(b, "rm-a"))));
  if (pri.length) box.append(h("div", { class: "rm-pri" }, pri.map(b => btn(b, "rm-p"))));
  if (games.length) box.append(h("h4", {}, "Chọn trò chơi"), h("div", { class: "rm-games" }, games.map(b => btn(b, "rm-g"))));
  if (rest.length) box.append(h("h4", {}, "Các nút khác trên màn hình"), h("div", { class: "rm-list" }, rest.map(b => btn(b, "rm-l"))));
  if (!s.btns.length) box.append(h("p", { class: "rm-note" }, "Màn hình này không có nút để bấm. Trò kéo – thả cần thao tác trực tiếp trên máy chiếu hoặc bằng tay qua camera."));
  return box;
}
function pickTab() {
  const box = h("div", { class: "rm-pick" });
  box.append(h("button", { class: "rm-big", onclick: () => { send({ t: "pick" }); P.picked = []; render(); } }, ico("dice"), "Gọi tên ngẫu nhiên"),
    h("p", { class: "rm-note" }, "Máy chiếu sẽ quay số và đọc tên. Cách gọi (số bạn, theo tổ, không lặp lại) theo tùy chọn trên máy chiếu."));
  for (const n of P.picked) {
    const r = P.roster?.list.find(x => x.n === n);
    box.append(h("div", { class: "rm-win" }, h("small", {}, "Mời em"), h("b", {}, n), h("span", {}, r ? `${r.s} điểm` : ""),
      h("div", { class: "rm-pts" }, [1, 2, 5].map(k => h("button", { onclick: () => send({ t: "award", n, pts: k }) }, "+" + k)))));
  }
  return box;
}
function scoreTab() {
  const box = h("div", { class: "rm-scores" });
  const R = P.roster;
  if (!R) return h("p", { class: "rm-note" }, "Đang tải danh sách lớp…");
  if (!R.list.length) return h("p", { class: "rm-note" }, `Lớp “${R.cls}” chưa có học sinh. Thêm danh sách ở trang Học sinh & điểm trên máy chiếu.`);
  const list = R.list.slice().sort((a, b) => b.s - a.s || a.n.localeCompare(b.n, "vi"));
  box.append(h("h4", {}, `${R.cls} · ${list.length} học sinh`));
  list.forEach((r, i) => box.append(h("div", { class: "rm-st" + (r.a ? " away" : "") },
    h("span", { class: "rm-rank" }, i + 1), h("div", {}, h("b", {}, r.n), h("small", {}, [r.g, r.a ? "vắng" : ""].filter(Boolean).join(" · "))),
    h("b", { class: "rm-sc" }, r.s),
    h("button", { class: "rm-m", "aria-label": "Trừ 1 điểm " + r.n, onclick: () => send({ t: "award", n: r.n, pts: -1 }) }, "−1"),
    h("button", { class: "rm-plus", "aria-label": "Cộng 1 điểm " + r.n, onclick: () => send({ t: "award", n: r.n, pts: 1 }) }, "+1"))));
  return box;
}
function menuTab() {
  const it = (label, sub, msg) => h("button", { class: "rm-menu", onclick: () => { send(msg); P.tab = "screen"; render(); } }, h("b", {}, label), h("small", {}, sub));
  return h("div", { class: "rm-menus" },
    h("h4", {}, "Chuyển trang trên máy chiếu"),
    it("Sảnh trò chơi", "Chọn trò chơi, đổi bộ đề", { t: "nav", page: "home" }),
    it("Gọi tên", "Máy quay số, vòng quay", { t: "nav", page: "class", tab: "pick" }),
    it("Chia nhóm", "Chia lớp thành các đội", { t: "nav", page: "class", tab: "teams" }),
    it("Bảng xếp hạng", "Bục vinh danh buổi học", { t: "nav", page: "class", tab: "rank" }),
    it("Thống kê câu hỏi", "Câu nào học sinh hay sai", { t: "nav", page: "stats" }),
    it("Bộ đề", "Thư viện câu hỏi", { t: "nav", page: "sets" }),
    h("p", { class: "rm-note" }, "Để ngắt kết nối, chỉ cần đóng trang này. Giáo viên có thể thu hồi quyền điều khiển bằng nút “Tạo mã mới” trên máy chiếu."));
}

/* ---------- quét thẻ trả lời bằng camera sau của điện thoại ---------- */
const SC = { on: false, stream: null, det: null, t: 0, cv: null, q: -1, seen: new Map(), sent: new Map(), pend: {}, sendT: 0, el: null };
function cardAnswer(m) {
  const [a, b] = m.corners, d = ((Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI) % 360 + 360) % 360, r = Math.round(d / 90);
  if (Math.abs(d - r * 90) > 32) return -1;
  return [0, 3, 2, 1][r % 4];
}
async function openScanner() {
  if (SC.on) return;
  const vid = h("video", { playsinline: "", muted: "", autoplay: "" }), ov = h("canvas"), info = h("div", { class: "sc-info" }, "Đang mở camera…");
  vid.muted = true;
  SC.el = h("div", { class: "sc-full" }, h("div", { class: "sc-stage" }, vid, ov),
    h("div", { class: "sc-top" }, info, h("button", { class: "sc-x", "aria-label": "Đóng", onclick: closeScanner, html: IC.close })),
    h("p", { class: "sc-hint" }, "Hướng camera về phía lớp, lia chậm qua từng dãy bàn. Khung xanh là thẻ đã nhận."));
  SC.info = info; SC.vid = vid; SC.ov = ov; document.body.append(SC.el); SC.on = true; paintScan();
  try {
    if (!SC.det) { const { AR } = await import("../vendor/aruco.js"); SC.det = new AR.Detector({ dictionaryName: "ARUCO_MIP_16h3" }); }
    SC.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    if (!SC.on) { SC.stream.getTracks().forEach(t => t.stop()); return; }
    vid.srcObject = SC.stream; await vid.play(); SC.cv = document.createElement("canvas"); scanLoop();
  } catch (e) {
    info.textContent = e?.name === "NotAllowedError" ? "Chưa được phép dùng camera. Hãy cho phép camera trong cài đặt trình duyệt." : "Không mở được camera của điện thoại.";
  }
}
function closeScanner() {
  SC.on = false; clearTimeout(SC.t); SC.stream?.getTracks().forEach(t => t.stop()); SC.stream = null; SC.el?.remove(); SC.el = null;
}
function paintScan() {
  if (!SC.on || !SC.info) return;
  const c = P.state?.cards;
  SC.info.innerHTML = c ? `<b>${c.got}/${c.total}</b> thẻ đã nhận · câu ${c.q + 1}` : "Máy chiếu chưa ở bước giơ thẻ";
  SC.el.classList.toggle("idle", !c);
}
function scanLoop() {
  if (!SC.on) return;
  const v = SC.vid, vw = v.videoWidth, vh = v.videoHeight, c = P.state?.cards;
  if (c && c.q !== SC.q) { SC.q = c.q; SC.seen.clear(); SC.sent.clear(); SC.pend = {}; }
  if (vw && c) {
    const k = Math.min(1, 1920 / Math.max(vw, vh)), w = Math.round(vw * k), hh = Math.round(vh * k);
    if (SC.cv.width !== w || SC.cv.height !== hh) { SC.cv.width = SC.ov.width = w; SC.cv.height = SC.ov.height = hh; }
    const x = SC.cv.getContext("2d", { willReadFrequently: true }); x.drawImage(v, 0, 0, w, hh);
    let ms = []; try { ms = SC.det.detect(x.getImageData(0, 0, w, hh)); } catch (e) {}
    const o = SC.ov.getContext("2d"); o.clearRect(0, 0, w, hh); o.lineWidth = Math.max(3, w / 300);
    let fresh = false;
    for (const m of ms) {
      const a = cardAnswer(m); if (a < 0) continue;
      const s = SC.seen.get(m.id); if (!s || s.a !== a) SC.seen.set(m.id, { a, k: 1 }); else s.k++;
      const ok = SC.seen.get(m.id).k >= 2;
      if (ok && SC.sent.get(m.id) !== a) { SC.sent.set(m.id, a); SC.pend[m.id] = a; fresh = true; }
      o.strokeStyle = ok ? "#22c55e" : "#fbbf24"; o.fillStyle = ok ? "rgba(34,197,94,.3)" : "rgba(251,191,36,.25)";
      o.beginPath(); m.corners.forEach((p, j) => j ? o.lineTo(p.x, p.y) : o.moveTo(p.x, p.y)); o.closePath(); o.fill(); o.stroke();
    }
    if (fresh) buzz(15);
    if (Object.keys(SC.pend).length && Date.now() - SC.sendT > 400) { if (P.ch?.send({ t: "cards", m: SC.pend, tk, id: ID, dev: DEV, from: "phone" })) { SC.pend = {}; SC.sendT = Date.now(); } }
  } else if (SC.ov.width) SC.ov.getContext("2d").clearRect(0, 0, SC.ov.width, SC.ov.height);
  SC.t = setTimeout(scanLoop, 50);
}

function onMsg(m) {
  if (!m || m.tk !== tk || m.from === "phone") return;
  P.lastHost = Date.now();
  if (m.t === "state") { P.state = m; render(); paintScan(); }
  else if (m.t === "roster") { P.roster = m; if (P.tab !== "screen") render(); }
  else if (m.t === "picked") { P.picked = m.names || []; buzz(30); if (P.tab === "pick") render(); else toast("Mời em " + P.picked.join(", ")); }
  else if (m.t === "toast") toast(m.msg);
  else if (m.t === "host") { send({ t: "hello" }); }
  else if (m.t === "bye") { P.state = null; render(); toast("Máy chiếu đã tắt điều khiển hoặc tạo mã mới"); }
}
if (name && tk) {
  const cfg = window.LHVT_CLOUD;
  if (!cfg) { P.status = "error"; render(); toast("Trang chưa được cấu hình máy chủ kết nối"); }
  else {
    P.ch = openChannel({ url: cfg.url, key: cfg.anonKey, name, onMsg, onStatus: st => { P.status = st; if (st === "online") P.ch.send({ t: "hello", tk, id: ID, dev: DEV, from: "phone" }); render(); } });
    setInterval(() => { if (P.ch?.online) P.ch.send({ t: "ping", tk, id: ID, dev: DEV, from: "phone" }); render(); }, 15000);
    addEventListener("pagehide", () => P.ch?.send({ t: "bye", tk, id: ID, from: "phone" }));
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { P.ch?.send({ t: "hello", tk, id: ID, dev: DEV, from: "phone" }); keepAwake(); } });
  }
}
/* giữ màn hình điện thoại không tự tắt khi đang điều khiển */
let wake = null;
async function keepAwake() { try { if ("wakeLock" in navigator && !wake) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => wake = null); } } catch (e) {} }
keepAwake();
render();
