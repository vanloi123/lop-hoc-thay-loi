/* =====================================================================
   MÔ PHỎNG 3D: LẮP RÁP MÁY TÍNH
   Học sinh chọn linh kiện ở khay rồi chạm vào đúng vị trí trên mô hình 3D.
   Vị trí lắp là các nút HTML (data-hit) đặt chồng lên khung 3D, nên điều khiển được
   bằng chuột, màn hình cảm ứng, bàn tay qua webcam hoặc điện thoại.
   Mô hình dựng hoàn toàn bằng mã (không tải tệp ngoài) để chạy được khi không có mạng.
   Đơn vị trong cảnh: 1 = 1 cm.
   ===================================================================== */
import { makeKit, THREE, rng } from "./kit.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/* ---------- nội dung bài học ---------- */
const low = t => t.charAt(0).toLowerCase() + t.slice(1);
const SLOT_NAME = {
  socket: "Đế cắm CPU", dimm: "Khe cắm RAM", m2: "Khe M.2", mount: "Trụ gắn bo mạch chủ", psuBay: "Khoang bộ nguồn",
  pcie: "Khe PCIe x16", bay: "Khoang ổ đĩa", atx24: "Cổng nguồn 24 chân", cpu8: "Cổng nguồn CPU 8 chân", power: "Nút nguồn"
};
const PARTS = [
  { id: "cpu", name: "CPU", full: "CPU (bộ vi xử lý)", slot: "socket", req: [],
    func: "Bộ não của máy tính: thực hiện các phép tính và điều khiển các bộ phận khác.",
    where: "Đế cắm CPU (socket) ở giữa phía trên bo mạch chủ.",
    tip: "Cầm CPU ở mép, không chạm vào mặt tiếp xúc. Khớp dấu tam giác vàng ở góc CPU với dấu tam giác trên đế rồi mới hạ xuống." },
  { id: "cooler", name: "Quạt tản nhiệt CPU", full: "Quạt tản nhiệt CPU", slot: "socket", req: ["cpu"],
    why: "Quạt tản nhiệt đặt chồng lên CPU, nên phải lắp CPU trước.",
    func: "Hút nhiệt từ CPU và thổi ra ngoài để CPU không bị quá nóng.",
    where: "Đặt chồng lên CPU, trên đế cắm CPU.",
    tip: "Bôi một lớp keo tản nhiệt mỏng lên mặt CPU trước khi đặt quạt, rồi cắm dây quạt vào chân CPU_FAN." },
  { id: "ram", name: "RAM", full: "RAM (bộ nhớ trong)", slot: "dimm", req: [],
    func: "Lưu tạm dữ liệu và chương trình đang chạy. Khi tắt máy, dữ liệu trong RAM bị mất.",
    where: "Khe cắm RAM (khe DIMM) dài, nằm ngay cạnh đế CPU.",
    tip: "Khớp khấc lõm ở chân RAM với gờ trong khe, ấn đều hai đầu đến khi chốt bật lên kêu “tách”." },
  { id: "m2", name: "Ổ SSD M.2", full: "Ổ cứng SSD M.2", slot: "m2", req: [],
    func: "Lưu trữ lâu dài hệ điều hành, phần mềm và tài liệu. Nhanh hơn ổ cứng HDD nhiều lần.",
    where: "Khe M.2 nhỏ nằm ngang, phía dưới khe PCIe.",
    tip: "Cắm nghiêng khoảng 30 độ, ấn thanh SSD xuống rồi bắt vít giữ ở đầu kia." },
  { id: "mb", name: "Bo mạch chủ", full: "Bo mạch chủ (mainboard)", slot: "mount", req: ["cpu", "cooler"],
    why: "Nên lắp CPU và quạt tản nhiệt khi bo mạch còn ở ngoài bàn, vì trong thùng máy rất chật.",
    func: "Tấm mạch lớn nối tất cả linh kiện với nhau, cấp điện và truyền dữ liệu giữa chúng.",
    where: "Các trụ đồng (standoff) trên vách trong của thùng máy.",
    tip: "Lắp tấm chắn cổng sau (I/O shield) vào lưng thùng trước, rồi đặt bo mạch sao cho lỗ vít khớp với các trụ đồng." },
  { id: "psu", name: "Bộ nguồn", full: "Bộ nguồn (PSU)", slot: "psuBay", req: [],
    func: "Đổi điện 220 V của ổ cắm thành điện một chiều 12 V, 5 V, 3,3 V để cấp cho các linh kiện.",
    where: "Khoang nguồn ở đáy, phía sau thùng máy.",
    tip: "Quạt của bộ nguồn hướng xuống lưới thông gió ở đáy thùng để hút được khí mát." },
  { id: "gpu", name: "Card đồ họa", full: "Card đồ họa (GPU)", slot: "pcie", req: ["mb"],
    why: "Card đồ họa cắm vào bo mạch chủ, nên cần đưa bo mạch chủ vào thùng máy trước.",
    func: "Xử lý hình ảnh, video, trò chơi 3D và đưa hình ra màn hình.",
    where: "Khe PCIe x16, khe dài nhất nằm ngang trên bo mạch chủ.",
    tip: "Tháo nắp che khe ở lưng thùng, cắm card đến khi chốt khóa bật lên, rồi bắt vít vào thùng." },
  { id: "hdd", name: "Ổ cứng HDD", full: "Ổ cứng HDD", slot: "bay", req: [],
    func: "Lưu trữ dữ liệu dung lượng lớn với giá rẻ, nhưng chậm hơn ổ SSD.",
    where: "Khoang ổ đĩa 3,5 inch ở phía trước, dưới đáy thùng máy.",
    tip: "Sau khi lắp, nối cáp dữ liệu SATA vào bo mạch chủ và cáp nguồn SATA từ bộ nguồn." },
  { id: "atx24", name: "Cáp nguồn 24 chân", full: "Cáp nguồn 24 chân", slot: "atx24", req: ["mb", "psu"],
    why: "Cáp nối từ bộ nguồn sang bo mạch chủ, nên cần có cả hai trong thùng máy trước.",
    func: "Dẫn điện chính từ bộ nguồn vào bo mạch chủ.",
    where: "Cổng 24 chân dài ở mép trước của bo mạch chủ.",
    tip: "Đầu cắm có lẫy nên chỉ cắm được một chiều. Ấn đến khi lẫy khóa lại." },
  { id: "cpu8", name: "Cáp nguồn CPU 8 chân", full: "Cáp nguồn CPU 8 chân", slot: "cpu8", req: ["mb", "psu"],
    why: "Cáp nối từ bộ nguồn sang bo mạch chủ, nên cần có cả hai trong thùng máy trước.",
    func: "Cấp điện riêng cho CPU, vì CPU dùng nhiều điện nhất trên bo mạch.",
    where: "Cổng 8 chân ở góc trên của bo mạch chủ, gần CPU.",
    tip: "Đừng nhầm với cáp 8 chân PCIe dành cho card đồ họa: hai loại trông giống nhau nhưng khác dây." }
];
const PART_IC = {
  cpu: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9" y="9" width="6" height="6"/><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3"/></svg>',
  cooler: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.8"/><path d="M12 10.2c0-3 1-5 3.5-5.6M13.8 12c3 0 5 1 5.6 3.5M12 13.8c0 3-1 5-3.5 5.6M10.2 12c-3 0-5-1-5.6-3.5"/></svg>',
  ram: '<svg viewBox="0 0 24 24"><rect x="2.5" y="7" width="19" height="9" rx="1"/><path d="M6 10h2v3H6zM10 10h2v3h-2zM14 10h2v3h-2zM5 16v2M8 16v2M11 16v2M15 16v2M18 16v2"/></svg>',
  m2: '<svg viewBox="0 0 24 24"><rect x="2.5" y="8.5" width="19" height="7" rx="1"/><path d="M6 10.5h4v3H6zM12 10.5h3v3h-3zM19 12h.01"/></svg>',
  mb: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="1.5"/><rect x="11" y="5.5" width="5" height="5"/><path d="M7 5.5v8M8.8 5.5v8M5.5 16h11M5.5 18.5h6"/></svg>',
  psu: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="1.5"/><circle cx="10" cy="12" r="3.6"/><path d="M10 8.4v7.2M6.4 12h7.2M17 9.5v5"/></svg>',
  gpu: '<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="10" rx="1.5"/><circle cx="8" cy="11" r="3"/><circle cx="16" cy="11" r="3"/><path d="M5 16v3h6v-3"/></svg>',
  hdd: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="1.5"/><circle cx="12" cy="10" r="4"/><circle cx="12" cy="10" r=".8"/><path d="M12 10l3.5 6"/></svg>',
  atx24: '<svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="8" rx="1"/><path d="M9.5 5h.01M12 5h.01M14.5 5h.01M9.5 8h.01M12 8h.01M14.5 8h.01M10 10.5v4c0 3-4 3-4 7M14 10.5v4c0 3 4 3 4 7M12 10.5v11"/></svg>',
  cpu8: '<svg viewBox="0 0 24 24"><rect x="8" y="3" width="8" height="6" rx="1"/><path d="M10.5 5.3h.01M13.5 5.3h.01M10.5 7h.01M13.5 7h.01M11 9v4c0 3-3 4-3 8M13 9v4c0 3 3 4 3 8"/></svg>',
  power: '<svg viewBox="0 0 24 24"><path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/></svg>'
};

export default function runPcBuild(st, g, api) {
  const { h, on, Sfx, FX, toast, TTS, hud, Result } = api;
  const ts = [];
  const root = h("div", { class: "pcb" }); st.append(root);
  const tray = h("aside", { class: "pcb-tray", "aria-label": "Khay linh kiện" });
  const stageEl = h("div", { class: "pcb-stage" });
  const cvWrap = h("div", { class: "pcb-cv" }), hsLayer = h("div", { class: "pcb-hs" });
  const info = h("div", { class: "pcb-info", "aria-live": "polite" });
  const tools = h("div", { class: "pcb-tools" });
  stageEl.append(cvWrap, hsLayer, tools); root.append(tray, stageEl, info);

  /* ---------- trạng thái ---------- */
  let mode = null, sel = null, done = new Set(), mistakes = 0, firstTry = new Set(), triedWrong = new Set(), score = 100, t0 = 0, powered = false, finished = false;
  let aligning = null; // { rot } khi đang xoay CPU cho khớp dấu tam giác
  const ORDER = PARTS.map(p => p.id);
  const P = Object.fromEntries(PARTS.map(p => [p.id, p]));
  const reqOk = p => p.req.every(r => done.has(r));
  const nextPart = () => PARTS.find(p => !done.has(p.id) && reqOk(p)) || null;

  /* ---------- cảnh 3D ---------- */
  const light = document.body.classList.contains("light");
  const K = makeKit(cvWrap, { light });
  const { renderer, scene, camera, controls, mat, tex, box, rbox, cyl, fan, fans, cable, label } = K;
  camera.position.set(80, 46, 40);
  controls.target.set(-4, 22, 12); controls.minDistance = 22; controls.maxDistance = 170; controls.maxPolarAngle = Math.PI * .62;
  const inner = new THREE.PointLight(0xffffff, 700, 80, 1.6); inner.position.set(14, 32, 4); scene.add(inner);
  const R = rng(11);
  /* tấm decal mỏng dán lên mặt (plane hướng +z cục bộ) */
  const decal = (w, h, map, parent, x, y, z, o = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat("#ffffff", { map, roughness: .5, ...o })); m.position.set(x, y, z); parent.add(m); return m; };
  const metal = (c, r = .32) => ({ metalness: .9, roughness: r });

  /* ===== thùng máy (mở vách phía camera, trục +x) ===== */
  const CASE = new THREE.Group(); scene.add(CASE);
  const caseC = light ? "#2d323b" : "#262b33";
  const brushed = tex(256, 256, (x, w) => { x.fillStyle = "#3a404b"; x.fillRect(0, 0, w, w); for (let i = 0; i < 400; i++) { x.strokeStyle = `rgba(255,255,255,${R() * .05})`; x.beginPath(); const y = R() * w; x.moveTo(0, y); x.lineTo(w, y + R() * 2); x.stroke(); } }, [3, 3]);
  rbox(.6, 44, 42, .2, mat("#ffffff", { map: brushed, metalness: .55, roughness: .55, color: light ? "#9aa3b2" : "#7b8494" }), -10.6, 22, 0, CASE);  // vách trong (sơn xám)
  rbox(21.4, .7, 42.6, .3, caseC, 0, 44.2, 0, CASE, { metalness: .5, roughness: .45 });
  rbox(21.4, .7, 42.6, .3, caseC, 0, -.2, 0, CASE, { metalness: .5, roughness: .45 });
  rbox(21.4, 44.4, .6, .2, caseC, 0, 22, -21.1, CASE, { metalness: .5, roughness: .45 });
  // mặt trước: lưới tản nhiệt
  const mesh = tex(256, 256, (x, w) => { x.fillStyle = "#16191e"; x.fillRect(0, 0, w, w); x.fillStyle = "#2c313a"; for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { x.beginPath(); x.arc(i * 16 + (j % 2) * 8 + 4, j * 16 + 8, 5, 0, 7); x.fill(); } }, [6, 10]);
  rbox(21.6, 44.4, 1.2, .4, mat("#ffffff", { map: mesh, roughness: .7, metalness: .3 }), 0, 22, 21.5, CASE);
  // quạt hút trước + quạt thổi sau
  [[0, 33], [0, 20]].forEach(([x, y]) => { const f = fan(CASE, 12); f.position.set(x, y, 20.4); f.rotation.y = Math.PI; });
  const rf = fan(CASE, 12); rf.position.set(1.8, 33.5, -20.3);
  // nắp che khe PCIe + lỗ cổng sau
  for (let k = 0; k < 7; k++) box(.25, .9, 1.6, "#b8bec8", 3.2, 13.6 + k * 1.6, -20.6, CASE, metal("#b8bec8", .4)).scale.set(1, 1, 1);
  box(.25, 8.5, 2.4, "#0d0f12", -6.5, 34, -20.75, CASE);
  // lỗ luồn dây có gioăng cao su
  [[27, 6.2], [17, 6.2], [43, -14]].forEach(([y, z], i) => { const g = rbox(.4, i === 2 ? 1.6 : 5, i === 2 ? 5 : 1.6, .5, "#0b0c0e", -10.2, y, z, CASE, { roughness: .9 }); });
  // nút nguồn + đèn trên nóc
  const powerBtn = cyl(1.15, .5, "#dfe4ec", CASE, metal("#dfe4ec", .25), 32); powerBtn.position.set(3, 44.7, 16);
  const pbRing = new THREE.Mesh(new THREE.TorusGeometry(1.25, .12, 8, 32), mat("#5f6672")); pbRing.rotation.x = Math.PI / 2; pbRing.position.set(3, 44.95, 16); CASE.add(pbRing);
  const powerLed = cyl(.32, .35, "#2b3340", CASE, { emissive: "#000000" }); powerLed.position.set(6, 44.7, 16);
  // trụ đồng gắn bo mạch
  const standoffs = new THREE.Group(); CASE.add(standoffs);
  [[-19.2, 41.2], [-19.2, 27], [-19.2, 13], [-7.8, 41.2], [-7.8, 13], [3.6, 41.2], [3.6, 27], [3.6, 13]].forEach(([z, y]) => { const s = cyl(.38, .9, "#c9a227", standoffs, metal("#c9a227", .3), 6); s.rotation.z = Math.PI / 2; s.position.set(-9.9, y, z); });
  // khoang ổ đĩa 3,5"
  const cage = new THREE.Group(); CASE.add(cage);
  rbox(.35, 13, 12.5, .1, "#545d6c", 3.5, 7, 14.5, cage, metal("#545d6c", .45)); rbox(.35, 13, 12.5, .1, "#545d6c", -9.7, 7, 14.5, cage, metal("#545d6c", .45));
  for (let k = 0; k < 4; k++) box(13, .22, 12.5, "#545d6c", -3.1, 1.1 + k * 3.6, 14.5, cage, metal("#545d6c", .45));
  for (let k = 0; k < 6; k++) box(13, .1, .5, "#0b0c0e", -2.4, .2, -19 + k * 2.4, CASE);

  /* ===== bàn lắp ráp + thảm chống tĩnh điện ===== */
  const BENCH = new THREE.Group(); scene.add(BENCH);
  rbox(26, 1.4, 34, .3, light ? "#c9ced8" : "#2c3832", -6, 5.3, 39, BENCH, { roughness: .8 });
  const esd = tex(512, 512, (x, w) => { x.fillStyle = "#3d6fa8"; x.fillRect(0, 0, w, w); x.strokeStyle = "rgba(255,255,255,.18)"; x.lineWidth = 2; for (let i = 0; i <= w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, w); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); } x.fillStyle = "rgba(255,255,255,.6)"; x.font = "bold 26px sans-serif"; x.fillText("THẢM CHỐNG TĨNH ĐIỆN", 30, 470); });
  const mat1 = box(24, .16, 30, mat("#ffffff", { map: esd, roughness: .95 }), -6, 6.1, 39, BENCH); mat1.material = [mat("#3d6fa8"), mat("#3d6fa8"), mat("#ffffff", { map: esd, roughness: .95 }), mat("#3d6fa8"), mat("#3d6fa8"), mat("#3d6fa8")];
  rbox(4, 2.4, 2, .3, "#5b6372", -9.4, 7.3, 30, BENCH); rbox(4, 2.4, 2, .3, "#5b6372", -9.4, 7.3, 48, BENCH);

  /* ===== bo mạch chủ: mặt phẳng XY cục bộ, pháp tuyến +Z; xoay 90° quanh Y để hướng về camera ===== */
  const MB = new THREE.Group(); scene.add(MB); MB.rotation.y = Math.PI / 2;
  const BENCH_POS = new THREE.Vector3(-9.4, 23.5, 39), CASE_POS = new THREE.Vector3(-9.6, 27, -7.8);
  MB.position.copy(BENCH_POS);
  const S = .08, BW = 24.4, BH = 30.5;
  // texture bo mạch: đường mạch đồng, lỗ via, chữ in lụa
  const pcbMap = tex(1024, 1280, (c, W, H) => {
    const bx = x => (x + BW / 2) / BW * W, by = y => (BH / 2 - y) / BH * H, sc = W / BW;
    c.fillStyle = light ? "#14402b" : "#15442d"; c.fillRect(0, 0, W, H);
    c.globalAlpha = .55; c.lineCap = "round"; c.lineJoin = "round";
    for (let i = 0; i < 150; i++) {
      c.strokeStyle = R() < .5 ? "#1a5236" : "#1e573a"; c.lineWidth = R() < .2 ? 4 : 2;
      let x = R() * W, y = R() * H; c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 3; k++) { const d = 40 + R() * 160, dir = R() * 4 | 0, diag = R() < .4 ? 1 : 0; if (dir === 0) x += d; else if (dir === 1) x -= d; else if (dir === 2) y += d; else y -= d; if (diag) { x += d * .4; y += d * .4; } c.lineTo(x, y); }
      c.stroke(); c.fillStyle = "#8a7a3a"; c.beginPath(); c.arc(x, y, 2.5, 0, 7); c.fill();
    }
    // bó dây song song từ CPU tới khe RAM
    c.strokeStyle = "#2a6a4a"; c.lineWidth = 2;
    for (let k = 0; k < 18; k++) { c.beginPath(); c.moveTo(bx(.6), by(9.6 - k * .26)); c.lineTo(bx(-3.4), by(9.6 - k * .26)); c.stroke(); }
    for (let k = 0; k < 14; k++) { c.beginPath(); c.moveTo(bx(2 + k * .2), by(4.6)); c.lineTo(bx(2 + k * .2), by(-3.2)); c.stroke(); }
    c.globalAlpha = 1;
    // chữ in lụa trắng + khung linh kiện
    c.fillStyle = "#e9efe9"; c.strokeStyle = "#e9efe9"; c.lineWidth = 3;
    const txt = (t, x, y, size = 26, rot = 0) => { c.save(); c.translate(bx(x), by(y)); c.rotate(rot); c.font = `bold ${size}px sans-serif`; c.fillText(t, 0, 0); c.restore(); };
    c.strokeRect(bx(3 - 3.2), by(7.5 + 3.2), 6.4 * sc, 6.4 * sc); txt("CPU1", 3 - 3.1, 7.5 + 3.6);
    txt("DDR4_A1", -3.2, -1.6, 22, -Math.PI / 2); txt("DDR4_B1", -6.3, -1.6, 22, -Math.PI / 2);
    txt("PCIE_X16", -2, -5.2, 24); txt("PCIE_X1", 4.6, -12.5, 20); txt("M.2_1  (NVMe)", -5, -10.3, 22);
    txt("ATX_PWR", -11.9, -0.4, 20, -Math.PI / 2); txt("CPU_PWR", 6.6, 13.2, 20); txt("CPU_FAN", 0, 14.6, 18);
    txt("SATA3", -11.9, -10.6, 18, -Math.PI / 2); txt("CHIPSET", -8.4, -13.8, 18); txt("BIOS", -9.6, -12.4, 16); txt("BAT", 6.2, -6.3, 18);
    txt("BO MẠCH CHỦ ATX", -10.5, -14.6, 28);
    // mạch in quanh lỗ vít
    [[-11.2, 14.2], [-11.2, 0], [-11.2, -14.2], [0, 14.2], [0, -14.2], [11.2, 14.2], [11.2, 0], [11.2, -14.2]].forEach(([x, y]) => { c.fillStyle = "#c9a227"; c.beginPath(); c.arc(bx(x), by(y), 20, 0, 7); c.fill(); c.fillStyle = "#0b0c0e"; c.beginPath(); c.arc(bx(x), by(y), 11, 0, 7); c.fill(); });
  });
  const pcbSide = mat("#1a3a2a", { roughness: .8 });
  box(BW, BH, .16, [pcbSide, pcbSide, pcbSide, pcbSide, mat("#ffffff", { map: pcbMap, roughness: .55, metalness: .05 }), pcbSide], 0, 0, 0, MB);
  // đế CPU kiểu LGA: khung đen, mặt chân tiếp xúc, tấm giữ bằng thép (mở / đóng), cần gạt
  rbox(5.9, 5.9, .5, .08, "#16181c", 3, 7.5, S + .25, MB, { roughness: .7 });
  const pads = tex(256, 256, (x, w) => { x.fillStyle = "#3a3220"; x.fillRect(0, 0, w, w); x.fillStyle = "#d7b45a"; for (let i = 6; i < w; i += 9) for (let j = 6; j < w; j += 9) { x.beginPath(); x.arc(i, j, 2.3, 0, 7); x.fill(); } });
  decal(4.4, 4.4, pads, MB, 3, 7.5, S + .505, metal("#ffffff", .4));
  const triS = new THREE.Mesh(new THREE.CircleGeometry(.8, 3), mat("#f2c84b", { emissive: "#6b4f00" })); triS.position.set(5.15, 9.65, S + .51); triS.rotation.z = Math.PI / 4; MB.add(triS);
  const plateHinge = new THREE.Group(); plateHinge.position.set(.15, 7.5, S + .55); MB.add(plateHinge);
  const plateSh = K.rrect(5.6, 5.6, .3); const ph = new THREE.Path(); ph.moveTo(-1.95, -1.95); ph.lineTo(1.95, -1.95); ph.lineTo(1.95, 1.95); ph.lineTo(-1.95, 1.95); ph.lineTo(-1.95, -1.95); plateSh.holes.push(ph);
  const plate = K.shapeMesh(plateSh, .12, "#c3c9d2", plateHinge, metal("#c3c9d2", .28)); plate.position.set(2.85, 0, 0);
  plateHinge.rotation.y = -1.85; // đang mở, dựng đứng
  const leverPivot = new THREE.Group(); leverPivot.position.set(6.25, 4.6, S + .4); MB.add(leverPivot);
  const leverRod = cyl(.12, 6, "#c7ccd4", leverPivot, metal("#c7ccd4", .25), 12); leverRod.position.set(0, 3, 0);
  const leverEnd = cyl(.12, 1.2, "#c7ccd4", leverPivot, metal("#c7ccd4", .25), 12); leverEnd.rotation.z = Math.PI / 2; leverEnd.position.set(-.55, 6, 0);
  leverPivot.rotation.x = -1.3; // cần gạt đang nhấc lên
  // khe RAM + chốt trắng
  const DIMM_X = [-4.2, -5.6];
  DIMM_X.forEach(x => { rbox(.8, 13.4, .95, .1, "#0f1114", x, 6, S + .47, MB, { roughness: .6 }); rbox(.85, .9, 1.4, .1, "#e6e8ec", x, 13.05, S + .7, MB); rbox(.85, .9, 1.4, .1, "#e6e8ec", x, -1.05, S + .7, MB); });
  // cổng nguồn 24 chân, 8 chân (trắng có lỗ)
  const pinHoles = (cols, rows) => tex(64 * cols, 64 * rows, (x, w, h) => { x.fillStyle = "#e9e8e2"; x.fillRect(0, 0, w, h); x.fillStyle = "#1a1a1a"; for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) x.fillRect(i * 64 + 14, j * 64 + 14, 36, 36); });
  box(1.2, 5.5, 1.25, [mat("#e9e8e2"), mat("#e9e8e2"), mat("#e9e8e2"), mat("#e9e8e2"), mat("#ffffff", { map: pinHoles(2, 12) }), mat("#e9e8e2")], -11.2, 3, S + .63, MB);
  box(2.2, 1.15, 1.25, [mat("#e9e8e2"), mat("#e9e8e2"), mat("#e9e8e2"), mat("#e9e8e2"), mat("#ffffff", { map: pinHoles(4, 2) }), mat("#e9e8e2")], 8, 14.2, S + .63, MB);
  // khe PCIe x16 có viền kim loại, khe x1
  rbox(9.1, .85, 1.15, .1, "#0f1114", 2.5, -4, S + .57, MB); rbox(9.3, 1, .9, .08, "#aab1bc", 2.5, -4, S + .45, MB, metal("#aab1bc", .3));
  rbox(.95, .95, 1.45, .1, "#e6e8ec", -2.45, -4, S + .72, MB);
  rbox(3.6, .75, .95, .1, "#0f1114", 6.5, -11.5, S + .47, MB);
  // khe M.2 + trụ vít
  rbox(.95, 2.5, .55, .08, "#0f1114", 3.25, -8.5, S + .27, MB); cyl(.32, .45, "#c9a227", MB, metal("#c9a227", .3), 12).position.set(-5.2, -8.5, S + .22);
  MB.children[MB.children.length - 1].rotation.x = Math.PI / 2;
  // tản nhiệt VRM có rãnh, tản nhiệt chipset, cụm cổng sau có nắp che
  const fins = tex(256, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#59606b"); g.addColorStop(1, "#7a828e"); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = "rgba(0,0,0,.45)"; for (let i = 8; i < w; i += 20) x.fillRect(i, 0, 7, h); });
  const vrmTop = mat("#ffffff", { map: fins, ...metal("#ffffff", .38) });
  box(4.6, 3, 1.6, [mat("#5c636e", metal("", .4)), mat("#5c636e", metal("", .4)), mat("#5c636e", metal("", .4)), mat("#5c636e", metal("", .4)), vrmTop, mat("#5c636e")], 5.6, 13.4, S + .8, MB);
  box(1.6, 9, 1.6, [mat("#5c636e", metal("", .4)), mat("#5c636e", metal("", .4)), mat("#5c636e", metal("", .4)), mat("#5c636e", metal("", .4)), vrmTop, mat("#5c636e")], 9.4, 5, S + .8, MB);
  const chip = tex(256, 256, (x, w) => { x.fillStyle = "#2f353e"; x.fillRect(0, 0, w, w); x.strokeStyle = "#89919d"; x.lineWidth = 6; x.strokeRect(20, 20, w - 40, w - 40); x.fillStyle = "#aeb5c0"; x.font = "bold 34px sans-serif"; x.textAlign = "center"; x.fillText("CHIPSET", w / 2, w / 2 + 12); });
  rbox(4.3, 4.3, .95, .2, mat("#ffffff", { map: chip, ...metal("#ffffff", .35) }), -6.5, -11, S + .48, MB);
  rbox(2, 9.2, 3.4, .35, "#2a2e35", 11.1, 9, S + 1.7, MB, metal("#2a2e35", .45));
  // tụ điện, pin CMOS, chip BIOS, cổng SATA, chân cắm mặt trước
  const capG = new THREE.CylinderGeometry(.3, .3, .85, 14), capM = mat("#2a2f37", metal("", .35)), capTop = new THREE.CylinderGeometry(.3, .3, .02, 14);
  [[-1.2, 12.4], [-.4, 12.4], [.4, 12.4], [1.2, 12.4], [2, 12.4], [7.2, 9.3], [7.2, 8.5], [7.2, 7.7], [7.2, 6.9], [-8.4, 1], [-8.4, 1.8], [-7.6, -7], [-6.8, -7]].forEach(([x, y]) => { const m = new THREE.Mesh(capG, capM); m.rotation.x = Math.PI / 2; m.position.set(x, y, S + .43); MB.add(m); const t = new THREE.Mesh(capTop, mat("#c7ccd4", metal("", .3))); t.rotation.x = Math.PI / 2; t.position.set(x, y, S + .86); MB.add(t); });
  const bat = cyl(.95, .32, "#d2d7de", MB, metal("#d2d7de", .22), 32); bat.rotation.x = Math.PI / 2; bat.position.set(7.4, -7.3, S + .2);
  box(.95, .95, .18, "#151515", -9.4, -13, S + .1, MB);
  for (let k = 0; k < 4; k++) rbox(1.1, .75, .95, .06, "#26324a", -11.55, -6 - k * 1.1, S + .48, MB);
  for (let k = 0; k < 2; k++) box(2.4, .5, .6, "#121418", 3 + k * 3, -14.4, S + .3, MB);

  /* ===== linh kiện (hiện khi đã lắp) ===== */
  const M = {};
  // CPU: đế xanh viền vàng + nắp tản nhiệt kim loại có khắc chữ + tam giác vàng
  M.cpu = new THREE.Group(); MB.add(M.cpu);
  rbox(4.5, 4.5, .14, .05, "#2f6b3c", 0, 0, 0, M.cpu, { roughness: .5 });
  rbox(3.9, 3.9, .26, .14, "#c9ced6", 0, 0, .2, M.cpu, metal("#c9ced6", .26));
  const cpuMark = tex(256, 256, (x, w) => { x.clearRect(0, 0, w, w); x.fillStyle = "rgba(60,66,76,.75)"; x.font = "bold 30px sans-serif"; x.fillText("CPU", 22, 70); x.font = "600 22px sans-serif"; x.fillText("8 NHÂN 16 LUỒNG", 22, 110); x.fillText("3.6 GHz", 22, 142); x.font = "500 18px monospace"; x.fillText("SN 2026-LHTL", 22, 220); });
  decal(3.6, 3.6, cpuMark, M.cpu, 0, 0, .335, { transparent: true, metalness: .9, roughness: .3 });
  const triC = new THREE.Mesh(new THREE.CircleGeometry(.6, 3), mat("#f2c84b", { emissive: "#6b4f00" })); triC.position.set(1.72, 1.72, .08); triC.rotation.z = Math.PI / 4; M.cpu.add(triC);
  M.cpu.userData.home = new THREE.Vector3(3, 7.5, S + .58);
  // tản nhiệt dạng tháp: đế đồng, 4 ống dẫn nhiệt bằng đồng, 38 lá nhôm, nắp đen, quạt 12 cm
  M.cooler = new THREE.Group(); MB.add(M.cooler);
  rbox(4.2, 4.2, .55, .1, "#c77b45", 0, 0, .28, M.cooler, metal("#c77b45", .3));
  box(9, 1.2, .35, "#aeb5bf", 0, 0, .7, M.cooler, metal("#aeb5bf", .3));
  const finGeo = new THREE.BoxGeometry(5, 12, .055), finInst = new THREE.InstancedMesh(finGeo, mat("#cdd3db", metal("", .3)), 38), dm = new THREE.Object3D();
  for (let k = 0; k < 38; k++) { dm.position.set(0, 0, 3.6 + k * .31); dm.updateMatrix(); finInst.setMatrixAt(k, dm.matrix); } M.cooler.add(finInst);
  [[-1, -3.2], [1, -1.1], [-1, 1.1], [1, 3.2]].forEach(([x, y]) => { const p = cyl(.32, 15.4, "#c87d47", M.cooler, metal("#c87d47", .28), 16); p.rotation.x = Math.PI / 2; p.position.set(x, y, 8.2); const cap = cyl(.34, .3, "#d9dde3", M.cooler, metal("", .25), 16); cap.rotation.x = Math.PI / 2; cap.position.set(x, y, 16); });
  const coolTop = tex(256, 512, (x, w, h) => { x.fillStyle = "#17191d"; x.fillRect(0, 0, w, h); x.strokeStyle = "#3a3f48"; x.lineWidth = 3; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(30, 60 + i * 46); x.lineTo(w - 30, 40 + i * 46); x.stroke(); } x.fillStyle = "#8b93a1"; x.font = "bold 30px sans-serif"; x.save(); x.translate(w / 2 + 10, h / 2); x.rotate(-Math.PI / 2); x.textAlign = "center"; x.fillText("TẢN NHIỆT", 0, 0); x.restore(); });
  rbox(5.4, 12.4, .6, .2, mat("#ffffff", { map: coolTop, roughness: .5, metalness: .4 }), 0, 0, 15.7, M.cooler);
  const cfan = fan(M.cooler, 12, { frame: "#1b1e23", blade: "#2a2f37" }); cfan.rotation.y = -Math.PI / 2; cfan.position.set(-3.85, 0, 9.4);
  M.cooler.userData.home = new THREE.Vector3(3, 7.5, S + .67);
  // RAM: mạch xanh có chân mạ vàng, tản nhiệt nhôm có vát góc, thanh đèn LED ở trên
  M.ram = new THREE.Group(); MB.add(M.ram);
  const ramLeds = [];
  const spr = new THREE.Shape(); spr.moveTo(-6.65, .5); spr.lineTo(6.65, .5); spr.lineTo(6.65, 3.05); spr.lineTo(3.2, 3.05); spr.lineTo(2.6, 2.6); spr.lineTo(-1.2, 2.6); spr.lineTo(-1.8, 3.05); spr.lineTo(-6.65, 3.05); spr.closePath();
  const sprGeo = new THREE.ExtrudeGeometry(spr, { depth: .2, bevelEnabled: false }); sprGeo.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  const ramLabel = label(512, 128, [["DDR4  8 GB  3200 MHz", 44, 78, "bold", "#d8dee8"]], { bg: "#20283a" });
  DIMM_X.forEach(x => {
    box(.12, 13.3, 3.1, "#1b5e3b", x, 0, 1.55, M.ram);
    box(.14, 13, .45, "#d4a63a", x, 0, .3, M.ram, metal("#d4a63a", .25));
    [-1, 1].forEach(sd => { const m = new THREE.Mesh(sprGeo, mat(light ? "#2b3c63" : "#33467a", metal("", .35))); m.position.set(x + sd * .1 - (sd < 0 ? .2 : 0), 0, 0); M.ram.add(m); });
    const d = decal(7.5, 1.6, ramLabel, M.ram, x - .32, -2.2, 1.6); d.setRotationFromMatrix(new THREE.Matrix4().set(0, 0, -1, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
    ramLeds.push(box(.5, 13, .32, "#d9dde4", x, 0, 3.25, M.ram, { transparent: true, opacity: .9, emissive: "#000000", roughness: .3 }));
  });
  M.ram.userData.home = new THREE.Vector3(0, 6, S + .9);
  // SSD M.2: mạch đen, chip nhớ, nhãn dán
  M.m2 = new THREE.Group(); MB.add(M.m2);
  box(8, 2.2, .1, "#13161a", 0, 0, 0, M.m2); box(.6, 2.1, .12, "#d4a63a", 3.7, 0, 0, M.m2, metal("#d4a63a", .25));
  const ssdLab = label(640, 176, [["NVMe SSD", 52, 70, "bold", "#ffffff"], ["512 GB  ·  PCIe 4.0", 34, 128, "600", "#c9d2e0"]], { bg: "#1d2433", accent: "#0066ff" });
  box(6.4, 1.9, .12, [mat("#1d2433"), mat("#1d2433"), mat("#1d2433"), mat("#1d2433"), mat("#ffffff", { map: ssdLab, roughness: .5 }), mat("#1d2433")], -.6, 0, .1, M.m2);
  M.m2.userData.home = new THREE.Vector3(-1, -8.5, S + .32);
  // card đồ họa: tấm mạch, tấm lưng kim loại, vỏ quạt bo góc, 2 quạt, chân mạ vàng, giá kim loại có cổng HDMI/DP, cổng nguồn 8 chân
  M.gpu = new THREE.Group(); MB.add(M.gpu);
  box(25, .16, 10.6, "#1b2a22", 0, 0, 0, M.gpu);
  const bp = tex(512, 256, (x, w, h) => { x.fillStyle = "#3a404a"; x.fillRect(0, 0, w, h); x.strokeStyle = "#555d69"; x.lineWidth = 6; x.strokeRect(14, 14, w - 28, h - 28); x.beginPath(); x.moveTo(60, h - 40); x.lineTo(180, 40); x.lineTo(w - 60, 40); x.stroke(); x.fillStyle = "#7d8594"; x.font = "bold 40px sans-serif"; x.fillText("CARD ĐỒ HỌA", 220, 170); });
  box(25, .3, 10.6, [mat("#3a404a", metal("", .4)), mat("#3a404a", metal("", .4)), mat("#ffffff", { map: bp, ...metal("#ffffff", .4) }), mat("#3a404a", metal("", .4)), mat("#3a404a", metal("", .4)), mat("#3a404a", metal("", .4))], 0, .25, 0, M.gpu);
  const shC = light ? "#1d2027" : "#181b20";
  rbox(25.6, 1.15, 11, .4, shC, 0, -2.75, 0, M.gpu, { metalness: .45, roughness: .4 });
  rbox(1.3, 3, 11, .3, shC, -12.2, -1.7, 0, M.gpu, { metalness: .45, roughness: .4 }); rbox(1.3, 3, 11, .3, shC, 11.6, -1.7, 0, M.gpu, { metalness: .45, roughness: .4 });
  const gfin = new THREE.InstancedMesh(new THREE.BoxGeometry(.05, 2.05, 10.3), mat("#c9cfd8", metal("", .3)), 64);
  for (let k = 0; k < 64; k++) { const o = new THREE.Object3D(); o.position.set(-11.2 + k * .35, -1.15, 0); o.updateMatrix(); gfin.setMatrixAt(k, o.matrix); } M.gpu.add(gfin);
  [-2.6, 0, 2.6].forEach(z => { const hp = cyl(.3, 22.4, "#c87d47", M.gpu, metal("#c87d47", .28), 14); hp.rotation.z = Math.PI / 2; hp.position.set(0, -1.15, z); });
  box(10, .12, .2, "#aeb5bf", -2, -2.55, 5.53, M.gpu, metal("#aeb5bf", .3)).rotation.z = .08;
  [-6.4, 5.2].forEach(x => { const f = fan(M.gpu, 9.2, { frame: "#1d2027" }); f.rotation.x = Math.PI / 2; f.position.set(x, -3.35, 0); });
  box(8.6, .1, .9, "#d4a63a", 2.9, 0, -5.65, M.gpu, metal("#d4a63a", .25));
  const portsT = tex(256, 512, (x, w, h) => { x.fillStyle = "#c3c9d2"; x.fillRect(0, 0, w, h); x.fillStyle = "#0e1013"; [80, 170, 260].forEach(y => x.fillRect(70, y, 110, 46)); x.beginPath(); x.moveTo(70, 350); x.lineTo(180, 350); x.lineTo(170, 400); x.lineTo(80, 400); x.closePath(); x.fill(); for (let i = 0; i < 12; i++) x.fillRect(40 + (i % 2) * 140, 30 + i * 36, 30, 8); });
  const brk = box(.18, 3.6, 12, [mat("#ffffff", { map: portsT, ...metal("#ffffff", .35) }), mat("#c3c9d2", metal("", .35)), mat("#c3c9d2", metal("", .35)), mat("#c3c9d2", metal("", .35)), mat("#c3c9d2", metal("", .35)), mat("#c3c9d2", metal("", .35))], 13.1, -1.4, 0, M.gpu);
  box(2.3, 1, .9, [mat("#151515"), mat("#151515"), mat("#ffffff", { map: pinHoles(4, 2) }), mat("#151515"), mat("#151515"), mat("#151515")], -8, .7, 5.1, M.gpu);
  const gpuStripe = box(9, .3, .1, "#6d7685", 6.5, -2.85, 5.56, M.gpu, { emissive: "#000000" });
  M.gpu.userData.home = new THREE.Vector3(-.4, -4.1, S + 6.6);
  // bộ nguồn: vỏ đen nhám, tem thông số, quạt dưới đáy, ổ cắm dây rời
  M.psu = new THREE.Group(); CASE.add(M.psu);
  const psuT = tex(128, 128, (x, w) => { x.fillStyle = "#1c1f24"; x.fillRect(0, 0, w, w); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${R() * .05})`; x.fillRect(R() * w, R() * w, 1.5, 1.5); } }, [4, 4]);
  rbox(15, 8.6, 14, .4, mat("#ffffff", { map: psuT, roughness: .75, metalness: .35 }), 0, 0, 0, M.psu);
  const psuLab = label(768, 448, [["BỘ NGUỒN", 72, 120, "bold", "#ffffff"], ["650 W", 120, 260, "800", "#ffcc33"], ["80 PLUS Bronze", 44, 340, "600", "#d5dbe5"], ["AC 220 V  ~  DC 12 V / 5 V / 3,3 V", 30, 410, "500", "#9aa3b2"]], { bg: "#22262d", border: "#3b414c" });
  const pl = decal(9.5, 5.5, psuLab, M.psu, 7.52, .2, 0); pl.rotation.y = Math.PI / 2;
  const modT = tex(512, 256, (x, w, h) => { x.fillStyle = "#16191d"; x.fillRect(0, 0, w, h); x.fillStyle = "#050607"; [[30, 30, 200, 80], [260, 30, 110, 60], [390, 30, 90, 60], [260, 120, 110, 60], [390, 120, 90, 60], [30, 140, 200, 60]].forEach(r => x.fillRect(...r)); x.fillStyle = "#8b93a1"; x.font = "bold 20px sans-serif"; x.fillText("24 CHÂN", 70, 130); x.fillText("CPU", 290, 110); x.fillText("PCIE", 405, 110); });
  const pf = decal(13, 6.5, modT, M.psu, 0, 0, 7.02);
  const pfan = fan(M.psu, 11, { frame: "#16191d" }); pfan.rotation.x = Math.PI / 2; pfan.position.set(0, -4.4, 0);
  M.psu.userData.home = new THREE.Vector3(-2.4, 5, -13.8);
  // ổ cứng HDD: vỏ nhôm, tem nhãn, ốc vít, cổng SATA
  M.hdd = new THREE.Group(); CASE.add(M.hdd);
  rbox(10.2, 2.6, 14.7, .25, "#b9c0c9", 0, 0, 0, M.hdd, metal("#b9c0c9", .36));
  const hddLab = label(512, 640, [["Ổ CỨNG HDD", 54, 90, "bold", "#1b1f27"], ["1 TB", 110, 240, "800", "#1b1f27"], ["7200 vòng/phút", 40, 310, "600", "#3d4554"], ["SATA 6 Gb/s · 3,5 inch", 30, 370, "500", "#5b6475"]], { bg: "#eef0f3", accent: "#0066ff" });
  const hl = decal(8.6, 10.8, hddLab, M.hdd, 0, 1.31, -.8); hl.rotation.x = -Math.PI / 2;
  const bars = tex(256, 64, (x, w, h) => { x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.fillStyle = "#111"; for (let i = 6; i < w - 6; i += 3 + (R() * 5 | 0)) x.fillRect(i, 6, 1 + (R() * 3 | 0), h - 12); });
  const bc = decal(4.5, 1.1, bars, M.hdd, 0, 1.32, 5.6); bc.rotation.x = -Math.PI / 2;
  [[-4.4, -6.6], [4.4, -6.6], [-4.4, 6.6], [4.4, 6.6]].forEach(([x, z]) => { const s = cyl(.3, .1, "#6b7280", M.hdd, metal("", .3), 12); s.position.set(x, 1.31, z); });
  box(2.6, .9, .5, "#16181b", -2, -.4, -7.4, M.hdd); box(1.6, .9, .5, "#16181b", 1.4, -.4, -7.4, M.hdd);
  M.hdd.userData.home = new THREE.Vector3(-3.1, 2.9, 14.4);
  // cáp nguồn bọc lưới
  const W = (x, y) => new THREE.Vector3(x, y, S + 1.25).applyMatrix4(new THREE.Matrix4().compose(CASE_POS, MB.quaternion, new THREE.Vector3(1, 1, 1)));
  const p24 = W(-11.2, 3), p8 = W(8, 14.2);
  M.atx24 = new THREE.Group(); CASE.add(M.atx24);
  M.atx24.add(cable([[1, 9.6, -6.6], [5, 12, -2], [5, 20, 4.5], [p24.x + 3, p24.y - 2, p24.z + 1.6], [p24.x + 1.1, p24.y, p24.z]], .8));
  rbox(1.7, 5.7, 1.5, .15, "#121418", p24.x + .65, p24.y, p24.z, M.atx24);
  M.cpu8 = new THREE.Group(); CASE.add(M.cpu8);
  M.cpu8.add(cable([[-5, 9.6, -19.2], [-9, 16, -20.2], [-9, 42.6, -20.2], [p8.x + 1.5, 43.2, p8.z - 1], [p8.x + 1.1, p8.y, p8.z]], .5));
  rbox(1.5, 1.35, 2.5, .12, "#121418", p8.x + .55, p8.y, p8.z, M.cpu8);
  M.atx24.userData.home = M.atx24.position.clone(); M.cpu8.userData.home = M.cpu8.position.clone();
  Object.values(M).forEach(m => { m.visible = false; m.userData.home ||= m.position.clone(); m.position.copy(m.userData.home); });
  /* ===== chi tiết thêm cho giống thật ===== */
  // bo mạch: chân cắm mặt trước, cổng USB trong (đế xanh), chân quạt, tụ âm thanh màu vàng, đèn báo lỗi
  const pinG = new THREE.BoxGeometry(.07, .07, .62), pinM = mat("#d4a63a", metal("", .28));
  const pins = (x0, y0, cols, rows, base = "#141518") => {
    box(cols * .254 + .12, rows * .254 + .12, .26, base, x0 + (cols - 1) * .127, y0 + (rows - 1) * .127, S + .13, MB);
    const inst = new THREE.InstancedMesh(pinG, pinM, cols * rows); let k = 0;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { dm.position.set(x0 + i * .254, y0 + j * .254, S + .42); dm.updateMatrix(); inst.setMatrixAt(k++, dm.matrix); }
    MB.add(inst);
  };
  pins(-10.6, -14.7, 5, 2); pins(-7.4, -14.7, 5, 2, "#1f4fa0"); pins(1.4, 14.5, 4, 1); pins(-11.6, 9, 1, 3); pins(9.6, -14.7, 4, 1);
  [[-10.4, -11.6], [-9.6, -11.6], [-10.4, -12.4]].forEach(([x, y]) => { const c = cyl(.32, .8, "#d6b44c", MB, metal("#d6b44c", .3), 14); c.rotation.x = Math.PI / 2; c.position.set(x, y, S + .4); });
  [["#ff4d4d", 0], ["#ffd24d", .5], ["#ffffff", 1], ["#4dff88", 1.5]].forEach(([c, d]) => box(.2, .3, .12, c, 9.6 + d * .6, 12.2, S + .08, MB, { emissive: "#000000" }));
  // RAM: khấc lõm ở chân cắm; CPU: linh kiện dán nhỏ ở mép đế
  DIMM_X.forEach(x => box(.17, .5, .5, "#1b5e3b", x, -1.6, .3, M.ram));
  for (let k = 0; k < 9; k++) box(.18, .1, .06, k % 2 ? "#8c6a3c" : "#c9a96b", -1.6 + k * .4, -2.05, .1, M.cpu);
  K.shadows(scene);

  /* ===== ảnh linh kiện: chụp từng mô hình trong "phòng chụp" riêng để làm ảnh cho khay ===== */
  const THUMB = {};
  function makeThumbs() {
    let r2;
    try { r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return; }
    r2.setPixelRatio(1); r2.setSize(360, 270, false); r2.outputColorSpace = THREE.SRGBColorSpace; r2.toneMapping = THREE.ACESFilmicToneMapping; r2.toneMappingExposure = 1.1;
    const sc = new THREE.Scene(), pm = new THREE.PMREMGenerator(r2), env = pm.fromScene(new RoomEnvironment(), .04).texture; sc.environment = env;
    sc.add(new THREE.HemisphereLight(0xffffff, 0x8a93a6, .7)); const d1 = new THREE.DirectionalLight(0xffffff, 2.4); d1.position.set(4, 7, 5); sc.add(d1);
    const d2 = new THREE.DirectionalLight(0xcfe0ff, .9); d2.position.set(-6, 3, -2); sc.add(d2);
    const cam = new THREE.PerspectiveCamera(28, 4 / 3, .1, 800);
    /* đầu cắm nguồn + một đoạn dây bọc lưới cuộn nhẹ */
    const plug = (len, cols, rows) => {
      const gp = new THREE.Group();
      const face = mat("#ffffff", { map: tex(64 * cols, 64 * rows, (x, w, hh) => { x.fillStyle = "#131416"; x.fillRect(0, 0, w, hh); x.fillStyle = "#d4a63a"; for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { x.fillRect(i * 64 + 18, j * 64 + 18, 28, 28); } }) });
      const cm = mat("#16181b", { roughness: .6 });
      box(cols * .42 + .2, 1.4, rows * .42 + .2, [cm, cm, cm, face, cm, cm], 0, 0, 0, gp);
      box(.5, .5, .3, "#16181b", 0, .3, rows * .21 + .25, gp);
      for (let k = 0; k < cols; k++) gp.add(cable([[-cols * .19 + k * .42, .7, 0], [-cols * .19 + k * .42, 3, .2], [k * .3 - 1, 6, 1.6], [2, 8.5, 1 + k * .1], [5, 9, -1]], .17, k % 3 === 2 ? "#e8d23a" : "#141518"));
      gp.rotation.z = -.35; return gp;
    };
    const prep = (src, rx = 0, ry = 0) => { const c = src.clone(true); c.visible = true; c.position.set(0, 0, 0); c.rotation.set(rx, ry, 0); return c; };
    const views = {
      cpu: () => prep(M.cpu, -Math.PI / 2), cooler: () => prep(M.cooler, -Math.PI / 2, 2.5), ram: () => prep(M.ram, -Math.PI / 2, 2.3),
      m2: () => prep(M.m2, -Math.PI / 2), psu: () => prep(M.psu, 0, .2), gpu: () => prep(M.gpu, -Math.PI / 2, -.35), hdd: () => prep(M.hdd, 0, .5),
      atx24: () => plug(5.6, 12, 2), cpu8: () => plug(1.35, 4, 2),
      mb: () => { const c = MB.clone(true); c.children.slice().forEach(ch => { if (!ch.visible) c.remove(ch); }); c.position.set(0, 0, 0); c.rotation.set(-Math.PI / 2, 0, 0); return c; }
    };
    for (const id in views) {
      const o = views[id](), g0 = new THREE.Group(); g0.add(o); sc.add(g0);
      const b = new THREE.Box3().setFromObject(g0), c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
      o.position.sub(c);
      const dist = sz.length() / 2 / Math.sin(cam.fov * Math.PI / 360) * .82;
      cam.position.set(dist * .62, dist * .68, dist * .86); cam.lookAt(0, 0, 0);
      r2.render(sc, cam); THUMB[id] = r2.domElement.toDataURL("image/png"); sc.remove(g0);
    }
    env.dispose(); pm.dispose(); r2.dispose(); r2.forceContextLoss?.();
  }
  try { makeThumbs(); } catch (e) { console.warn("Không tạo được ảnh linh kiện", e); }
  /* ảnh chụp thật (nếu có): đặt tệp vào public/parts/<mã>.jpg, ví dụ public/parts/cpu.jpg */
  const photo = id => { const img = h("img", { alt: P[id]?.full || "", loading: "lazy", src: `parts/${id}.jpg` }); img.onerror = () => { img.onerror = null; if (THUMB[id]) img.src = THUMB[id]; else img.replaceWith(h("span", { class: "pc-ic", html: PART_IC[id] })); }; return img; };

  /* ---------- vị trí lắp (nút HTML đặt chồng lên cảnh) ---------- */
  const local = (x, y, z = 1.2) => () => MB.localToWorld(new THREE.Vector3(x, y, S + z));
  const SPOTS = {
    socket: { at: local(3, 7.5, 1.5), area: "mb" },
    dimm: { at: local(-4.9, 3, 1.4), area: "mb" },
    m2: { at: local(-1, -8.5, 1), area: "mb" },
    pcie: { at: local(4.5, -4, 1.6), area: "mb" },
    atx24: { at: local(-11.2, 3, 1.8), area: "case" },
    cpu8: { at: local(8, 14.2, 1.8), area: "case" },
    mount: { at: () => new THREE.Vector3(-9.6, 27, -7.8), area: "case" },
    psuBay: { at: () => new THREE.Vector3(-2.4, 5.5, -13.8), area: "case" },
    bay: { at: () => new THREE.Vector3(-3.1, 6, 14.4), area: "case" },
    power: { at: () => new THREE.Vector3(3, 45.2, 16), area: "case" }
  };
  const spotFilled = k => ({ socket: done.has("cooler"), dimm: done.has("ram"), m2: done.has("m2"), pcie: done.has("gpu"), atx24: done.has("atx24"), cpu8: done.has("cpu8"),
    mount: done.has("mb"), psuBay: done.has("psu"), bay: done.has("hdd"), power: powered })[k];
  const spotUsable = k => k === "power" ? done.size === PARTS.length && !powered : (["atx24", "cpu8", "pcie"].includes(k) ? done.has("mb") : true) && !spotFilled(k);
  const hsBtns = {};
  Object.keys(SPOTS).forEach((k, i) => {
    const b = h("button", { class: "pc-hs", "data-hit": true, "data-spot": k, "aria-label": SLOT_NAME[k] }, h("i", {}, String(i + 1)), h("span", {}, SLOT_NAME[k]));
    on(b, () => trySpot(k)); hsLayer.append(b); hsBtns[k] = b;
  });

  /* ---------- camera ---------- */
  let fly = null;
  const VIEWS = {
    mb: () => { const c = MB.position.clone(); return { target: c.clone().add(new THREE.Vector3(0, -1, 0)), pos: c.clone().add(new THREE.Vector3(54, 9, 12)) }; },
    case: () => ({ target: new THREE.Vector3(-4, 23, -1), pos: new THREE.Vector3(76, 34, 16) }),
    all: () => ({ target: new THREE.Vector3(-5, 21, 14), pos: new THREE.Vector3(98, 56, 52) })
  };
  /* màn hẹp (điện thoại dựng đứng): lùi camera ra xa để vẫn thấy trọn vật */
  const flyTo = v => { const t = VIEWS[v](), k = Math.max(1, 1.25 / camera.aspect); fly = { target: t.target, pos: t.target.clone().add(t.pos.clone().sub(t.target).multiplyScalar(k)) }; };
  controls.addEventListener("start", () => { fly = null; });

  /* ---------- giao diện: khay, công cụ, thẻ thông tin ---------- */
  function paintTray() {
    tray.replaceChildren(...[
      h("div", { class: "pcb-th" }, h("b", {}, mode === "challenge" ? "Thử thách" : "Linh kiện"), h("small", {}, `Đã lắp ${done.size}/${PARTS.length}`)),
      h("div", { class: "pcb-list" }, PARTS.map(p => {
        const isDone = done.has(p.id), nxt = mode === "learn" && nextPart() === p;
        const b = h("button", { class: "pc-part" + (isDone ? " done" : "") + (sel === p.id ? " sel" : "") + (nxt ? " next" : ""), "data-hit": true, disabled: isDone || !mode || powered, "aria-pressed": sel === p.id ? "true" : "false" },
          h("span", { class: "pc-photo" }, photo(p.id), isDone ? h("span", { class: "pc-st ok", html: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' }) : nxt ? h("span", { class: "pc-st" }, "Tiếp theo") : null),
          h("span", { class: "pc-nm" }, p.name));
        on(b, () => pick(p.id)); return b;
      })),
      done.size === PARTS.length ? on(h("button", { class: "btn primary lg pc-power", "data-hit": true, disabled: powered }, h("span", { class: "ico", html: PART_IC.power }), powered ? "Đang khởi động…" : "Bật nguồn"), () => trySpot("power")) : null].filter(Boolean));
  }
  function paintTools() {
    const vb = (v, t) => on(h("button", { class: "btn sm", "data-hit": true }, t), () => flyTo(v));
    const rot = (d, t, lbl) => on(h("button", { class: "btn sm icon", "data-hit": true, "aria-label": lbl, title: lbl, html: t }), () => { fly = null; const off = camera.position.clone().sub(controls.target); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), d); camera.position.copy(controls.target.clone().add(off)); });
    tools.replaceChildren(vb("mb", "Bo mạch"), vb("case", "Thùng máy"), vb("all", "Toàn cảnh"),
      rot(.35, '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/></svg>', "Xoay trái"),
      rot(-.35, '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4h-4"/></svg>', "Xoay phải"));
  }
  function paintInfo(msg) {
    if (!mode) return;
    const p = sel ? P[sel] : (mode === "learn" ? nextPart() : null);
    const parts = [];
    if (msg) parts.push(h("p", { class: "pcb-msg " + msg.kind }, msg.text));
    if (aligning) {
      parts.push(h("b", { class: "pcb-i-t" }, "Khớp dấu tam giác"),
        h("p", {}, "Xoay CPU đến khi dấu tam giác vàng ở góc CPU nằm cùng góc với dấu tam giác vàng trên đế, rồi hạ CPU xuống."),
        h("div", { class: "row" }, on(h("button", { class: "btn", "data-hit": true }, "Xoay CPU 90°"), rotateCpu), on(h("button", { class: "btn primary", "data-hit": true }, "Hạ CPU xuống"), lowerCpu)));
    } else if (p && mode === "learn") {
      parts.push(h("figure", { class: "pcb-fig" }, photo(p.id), h("figcaption", {}, p.full)),
        h("small", { class: "pcb-i-k" }, done.has(p.id) ? "Đã lắp" : `Bước ${ORDER.indexOf(p.id) + 1} trên ${PARTS.length}`), h("b", { class: "pcb-i-t" }, p.full),
        h("dl", {}, h("dt", {}, "Chức năng"), h("dd", {}, p.func), h("dt", {}, "Lắp vào"), h("dd", {}, p.where), h("dt", {}, "Lưu ý"), h("dd", {}, p.tip)),
        sel ? null : h("p", { class: "pcb-hint" }, `Chọn “${p.name}” trong khay bên trái.`));
    } else if (p) {
      parts.push(h("figure", { class: "pcb-fig" }, photo(p.id), h("figcaption", {}, p.full)), h("p", {}, "Chạm vào vị trí đúng trên mô hình để lắp."));
    } else if (!powered && done.size < PARTS.length) parts.push(h("p", {}, "Chọn một linh kiện trong khay rồi chạm vào vị trí lắp trên mô hình."));
    else if (!powered) parts.push(h("b", { class: "pcb-i-t" }, "Lắp xong!"), h("p", {}, "Bấm nút nguồn trên nóc thùng máy để khởi động."));
    info.replaceChildren(...parts.filter(Boolean));
  }
  const updHud = () => hud({ progress: `Đã lắp <b>${done.size}/${PARTS.length}</b>`, score: mode === "challenge" ? score : null, extra: mode === "challenge" ? `Lắp sai <b>${mistakes}</b>` : "" });

  /* ---------- luồng chơi ---------- */
  function pick(id) {
    if (done.has(id) || powered || aligning) return;
    sel = sel === id ? null : id; Sfx.pick?.() || Sfx.tick();
    if (sel) { const p = P[sel]; flyTo(SPOTS[p.slot].area === "mb" && !done.has("mb") ? "mb" : SPOTS[p.slot].area === "mb" ? "case" : "case"); if (mode === "learn") TTS.say?.(`${p.full}. ${p.func}`); }
    paintTray(); paintInfo();
  }
  function wrong(text, penalty) {
    mistakes++; if (sel) triedWrong.add(sel);
    if (mode === "challenge") { score = Math.max(0, score - penalty); }
    Sfx.wrong(); paintInfo({ kind: "bad", text }); updHud();
    const b = sel && $q(`.pc-part.sel`); b?.classList.remove("shake"); void b?.offsetWidth; b?.classList.add("shake");
  }
  const $q = s => root.querySelector(s);
  function trySpot(k) {
    if (!mode || finished || aligning) return;
    if (k === "power") {
      if (done.size < PARTS.length) return wrong("Chưa lắp đủ linh kiện. Máy tính chưa thể khởi động.", 5);
      return powerOn();
    }
    if (!sel) { Sfx.tick(); paintInfo({ kind: "", text: `Đây là ${low(SLOT_NAME[k])}. Hãy chọn một linh kiện trong khay trước.` }); return; }
    const p = P[sel];
    if (p.slot !== k) return wrong(`${p.name} không lắp vào ${low(SLOT_NAME[k])}.${mode === "learn" || triedWrong.has(p.id) ? " Gợi ý: " + p.where : ""}`, 10);
    if (!reqOk(p)) return wrong(`Chưa lắp ${p.name} lúc này được. ${p.why || ""}`, 5);
    if (p.id === "cpu") return startAlign();
    install(p);
  }
  function install(p) {
    const m = M[p.id];
    if (p.id === "mb") { animate(MB, MB.position.clone(), CASE_POS, 900); }
    else {
      m.visible = true;
      const lift = p.id === "psu" || p.id === "hdd" ? new THREE.Vector3(18, 6, 0) : new THREE.Vector3(0, 0, 7);
      animate(m, m.userData.home.clone().add(lift), m.userData.home.clone(), 550);
    }
    done.add(p.id); if (!triedWrong.has(p.id)) firstTry.add(p.id);
    sel = null; Sfx.right(); FX.burstEl?.(hsBtns[p.slot], 14);
    if (p.id === "mb") standoffs.visible = false;
    paintTray(); updHud();
    paintInfo({ kind: "ok", text: `Đã lắp ${p.name}.` + (mode === "learn" && nextPart() ? ` Tiếp theo: ${nextPart().name}.` : "") });
    ts.push(setTimeout(() => flyTo(p.id === "mb" || SPOTS[p.slot].area === "case" ? "case" : "mb"), p.id === "mb" ? 950 : 350));
    if (done.size === PARTS.length) ts.push(setTimeout(() => { flyTo("all"); paintInfo(); }, 1200));
  }
  /* CPU: phải xoay cho dấu tam giác khớp với đế */
  function startAlign() {
    aligning = { rot: 1 + (Math.random() * 3 | 0) };
    const m = M.cpu; m.visible = true; m.rotation.z = aligning.rot * Math.PI / 2;
    animate(m, m.userData.home.clone().add(new THREE.Vector3(0, 0, 9)), m.userData.home.clone().add(new THREE.Vector3(0, 0, 4)), 450);
    triS.material = mat("#ffd54a", { emissive: "#b88600" });
    paintInfo(); flyTo("mb");
  }
  function rotateCpu() { if (!aligning) return; aligning.rot = (aligning.rot + 1) % 4; Sfx.tick(); spinTo(M.cpu, aligning.rot * Math.PI / 2); }
  function lowerCpu() {
    if (!aligning) return;
    if (aligning.rot % 4) { return wrong("Sai chiều! Ép CPU sai chiều sẽ làm cong chân trên đế. Hãy xoay cho hai dấu tam giác cùng một góc.", 5); }
    aligning = null; triS.material = mat("#f2c84b", { emissive: "#6b4f00" });
    const p = P.cpu; animate(M.cpu, M.cpu.position.clone(), M.cpu.userData.home.clone(), 400);
    tween(500, e => { plateHinge.rotation.y = -1.85 * (1 - e); }, 420); tween(450, e => { leverPivot.rotation.x = -1.3 * (1 - e); }, 900);
    done.add("cpu"); if (!triedWrong.has("cpu")) firstTry.add("cpu");
    sel = null; Sfx.right(); paintTray(); updHud();
    paintInfo({ kind: "ok", text: `Đã lắp ${p.name} đúng chiều.` + (mode === "learn" ? " Tiếp theo: quạt tản nhiệt." : "") });
  }
  function powerOn() {
    powered = true; sel = null; paintTray(); Sfx.right();
    powerLed.material = mat("#38d26b", { emissive: "#1fbf55", emissiveIntensity: 1.2 });
    ramLeds.forEach((l, i) => l.material = mat(i ? "#b9a7ff" : "#8fd3ff", { emissive: i ? "#6a4dff" : "#1e90ff", emissiveIntensity: 1.6, transparent: true, opacity: .95 }));
    gpuStripe.material = mat("#2aa7ff", { emissive: "#1e90ff", emissiveIntensity: 1.1 });
    const scr = h("div", { class: "pcb-post", role: "status" }); stageEl.append(scr); flyTo("case");
    const lines = ["Đang kiểm tra phần cứng…", "CPU: OK", "Bộ nhớ RAM: 16 GB, OK", "Ổ SSD M.2: OK", "Ổ cứng HDD: OK", "Card đồ họa: OK", "Khởi động hệ điều hành…"];
    lines.forEach((t, i) => ts.push(setTimeout(() => { scr.append(h("div", {}, t)); Sfx.tick(); }, 500 + i * 420)));
    ts.push(setTimeout(finish, 500 + lines.length * 420 + 900));
  }
  function finish() {
    if (finished) return; finished = true;
    const secs = Math.round((performance.now() - t0) / 1000), mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, "0");
    const timeBonus = mode === "challenge" ? Math.max(0, 60 - Math.floor(secs / 5)) : 0;
    const final = mode === "challenge" ? score + timeBonus : 100;
    Result(g, { score: final, correct: firstTry.size, total: PARTS.length, label: "Lắp đúng ngay lần đầu", noRecord: mode !== "challenge",
      title: mistakes === 0 ? "Lắp ráp hoàn hảo!" : firstTry.size >= 8 ? "Lắp ráp rất tốt!" : "Máy đã chạy, cố gắng nhớ thứ tự nhé!",
      note: mode === "challenge" ? `Thử thách lắp ráp máy tính trong ${mm} phút ${ss} giây, lắp sai ${mistakes} lần.` : `Học lắp ráp máy tính trong ${mm} phút ${ss} giây.`,
      stats: [["Lắp đúng ngay lần đầu", `${firstTry.size}/${PARTS.length}`], ["Số lần lắp sai", String(mistakes)], ["Thời gian", `${mm}:${ss}`]].concat(mode === "challenge" ? [["Điểm", String(final)]] : []) });
  }

  /* ---------- chọn chế độ ---------- */
  function chooseMode() {
    const ov = h("div", { class: "pcb-start" }, h("div", { class: "pcb-start-c" },
      h("h2", {}, "Lắp ráp máy tính"),
      h("p", {}, "10 linh kiện thật của một máy tính để bàn. Chọn linh kiện trong khay, rồi chạm vào đúng chỗ lắp trên mô hình. Kéo chuột trên mô hình để xoay, lăn chuột để phóng to."),
      h("div", { class: "pcb-modes" },
        on(h("button", { class: "pcb-mode", "data-hit": true }, h("b", {}, "Học lắp ráp"), h("span", {}, "Hướng dẫn từng bước: chức năng, chỗ lắp và lưu ý của mỗi linh kiện. Không trừ điểm.")), () => start("learn")),
        on(h("button", { class: "pcb-mode", "data-hit": true }, h("b", {}, "Thử thách"), h("span", {}, "Không có gợi ý, vị trí lắp chỉ đánh số. Lắp sai bị trừ điểm, lắp nhanh được thưởng.")), () => start("challenge")))));
    stageEl.append(ov);
  }
  function start(m) {
    mode = m; t0 = performance.now(); root.querySelector(".pcb-start")?.remove();
    root.classList.toggle("challenge", m === "challenge"); Sfx.right();
    paintTray(); paintTools(); paintInfo(); updHud(); flyTo("mb");
  }

  /* ---------- hoạt ảnh ---------- */
  const anims = [];
  function animate(obj, from, to, dur) { obj.position.copy(from); anims.push({ obj, from, to, t0: performance.now(), dur, kind: "pos" }); }
  function spinTo(obj, rz) { anims.push({ obj, from: obj.rotation.z, to: rz < obj.rotation.z - .01 ? rz + Math.PI * 2 : rz, t0: performance.now(), dur: 260, kind: "rot" }); }
  const ease = t => 1 - Math.pow(1 - t, 3);
  /* tween chung: gọi fn(e) với e từ 0 tới 1 */
  function tween(dur, fn, delay = 0) { anims.push({ kind: "fn", fn, t0: performance.now() + delay, dur }); }

  /* ---------- vòng vẽ ---------- */
  const v3 = new THREE.Vector3();
  let raf = 0, alive = true, last = performance.now();
  function frame(now) {
    if (!alive) return; raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i], t = Math.max(0, Math.min(1, (now - a.t0) / a.dur)), e = ease(t);
      if (a.kind === "fn") { a.fn(e); if (t >= 1) anims.splice(i, 1); continue; }
      if (a.kind === "pos") a.obj.position.lerpVectors(a.from, a.to, e); else a.obj.rotation.z = a.from + (a.to - a.from) * e;
      if (t >= 1) { if (a.kind === "rot") a.obj.rotation.z = a.to % (Math.PI * 2); anims.splice(i, 1); }
    }
    if (fly) {
      controls.target.lerp(fly.target, .08); camera.position.lerp(fly.pos, .08);
      if (camera.position.distanceTo(fly.pos) < .3) fly = null;
    }
    if (powered) fans.forEach((f, i) => f.rotation.z += dt * (14 + i * 3));
    controls.update(); renderer.render(scene, camera);
    // đặt các nút vị trí lắp lên toạ độ màn hình
    const w = cvWrap.clientWidth, hh = cvWrap.clientHeight, hint = mode === "learn" && sel ? P[sel].slot : null, nxt = mode === "learn" && !sel ? nextPart()?.slot : null;
    for (const k in SPOTS) {
      const b = hsBtns[k], show = mode && !aligning && spotUsable(k) && (k !== "mount" || !done.has("mb"));
      if (!show) { b.hidden = true; b.classList.remove("hint"); continue; }
      v3.copy(SPOTS[k].at()).project(camera);
      const x = (v3.x + 1) / 2 * w, y = (1 - v3.y) / 2 * hh, vis = v3.z < 1 && x > -20 && x < w + 20 && y > -20 && y < hh + 20;
      b.hidden = !vis; if (!vis) continue;
      b.style.transform = `translate(${x}px,${y}px)`;
      b.classList.toggle("hint", hint === k || nxt === k);
    }
  }
  raf = requestAnimationFrame(frame);
  paintTray(); paintTools(); chooseMode();
  hud({ progress: `Đã lắp <b>0/${PARTS.length}</b>`, score: null });

  return () => {
    alive = false; cancelAnimationFrame(raf); ts.forEach(clearTimeout); K.dispose();
  };
}
