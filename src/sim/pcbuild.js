/* =====================================================================
   MÔ PHỎNG 3D: LẮP RÁP MÁY TÍNH
   Học sinh chọn linh kiện ở khay rồi chạm vào đúng vị trí trên mô hình 3D.
   Vị trí lắp là các nút HTML (data-hit) đặt chồng lên khung 3D, nên điều khiển được
   bằng chuột, màn hình cảm ứng, bàn tay qua webcam hoặc điện thoại.
   Mô hình dựng hoàn toàn bằng mã (không tải tệp ngoài) để chạy được khi không có mạng.
   Đơn vị trong cảnh: 1 = 1 cm.
   ===================================================================== */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

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
  const css = getComputedStyle(document.body);
  const light = document.body.classList.contains("light");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  cvWrap.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(light ? "#e9edf4" : "#16201b");
  const camera = new THREE.PerspectiveCamera(36, 1.6, 1, 600);
  camera.position.set(80, 46, 40);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(-4, 22, 12); controls.enableDamping = true; controls.dampingFactor = .12;
  controls.minDistance = 22; controls.maxDistance = 160; controls.maxPolarAngle = Math.PI * .62; controls.enablePan = false;
  scene.add(new THREE.HemisphereLight(0xffffff, light ? 0x9aa3b5 : 0x24302a, light ? 1.35 : 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(60, 90, 50); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbfd4ff, .55); fill.position.set(-40, 30, 70); scene.add(fill);
  const inner = new THREE.PointLight(0xffffff, 900, 90, 1.6); inner.position.set(14, 30, 4); scene.add(inner);

  const mats = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: .6, metalness: .1, ...o })); return mats.get(k); };
  const box = (w, hh, d, c, x, y, z, parent, o) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), typeof c === "string" ? mat(c, o) : c); m.position.set(x, y, z); parent.add(m); return m; };
  const cyl = (r, len, c, parent, o, seg = 24) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat(c, o)); parent.add(m); return m; };
  const fans = [];
  function fan(parent, r, x, y, z, axis = "z", color = "#2a2f38") {
    const gp = new THREE.Group(); gp.position.set(x, y, z); parent.add(gp);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * .08, 8, 32), mat("#1c2027")); gp.add(ring);
    const hub = cyl(r * .28, r * .25, "#3b414c", gp); hub.rotation.x = Math.PI / 2;
    const blades = new THREE.Group(); gp.add(blades);
    for (let k = 0; k < 7; k++) { const b = box(r * .62, r * .26, .08, color, r * .5, 0, 0, new THREE.Group()); const holder = b.parent; holder.rotation.z = k / 7 * Math.PI * 2; b.rotation.x = .5; blades.add(holder); }
    if (axis === "x") gp.rotation.y = Math.PI / 2; else if (axis === "y") gp.rotation.x = Math.PI / 2;
    fans.push(blades); return gp;
  }

  /* thùng máy: mở vách bên phải (phía camera, trục +x) */
  const CASE = new THREE.Group(); scene.add(CASE);
  const caseC = light ? "#3b4250" : "#2b313b", caseIn = light ? "#6b7486" : "#46505e";
  box(.5, 44, 42, caseIn, -10.6, 22, 0, CASE, { metalness: .4, roughness: .5 });                 // vách trong
  box(21, .5, 42, caseC, 0, 44, 0, CASE, { metalness: .4 });                                       // nóc
  box(21, .5, 42, caseC, 0, 0, 0, CASE, { metalness: .4 });                                         // đáy
  box(21, 44, .5, caseC, 0, 22, -21, CASE, { metalness: .4 });                                      // lưng
  box(21, 44, .8, light ? "#2c323d" : "#232831", 0, 22, 21.2, CASE, { metalness: .3 });            // mặt trước
  const ioCut = box(.3, 8.5, 2.2, "#11151b", -6.4, 34, -20.8, CASE);                                 // lỗ cổng sau
  for (let k = 0; k < 7; k++) box(14, .9, .3, "#11151b", -2, 14 + k * 1.6, -20.6, CASE);           // nắp che khe PCIe
  const powerBtn = cyl(1.1, .5, "#d8dee9", CASE, { metalness: .6, roughness: .3 }); powerBtn.position.set(3, 44.4, 16);
  const powerLed = cyl(.3, .4, "#2b3340", CASE, { emissive: "#000000" }); powerLed.position.set(6, 44.4, 16);
  // trụ đồng gắn bo mạch
  const standoffs = new THREE.Group(); CASE.add(standoffs);
  [[-19.2, 41.2], [-19.2, 27], [-19.2, 13], [-7.8, 41.2], [-7.8, 13], [3.6, 41.2], [3.6, 27], [3.6, 13]].forEach(([z, y]) => { const s = cyl(.35, .9, "#c9a227", standoffs, { metalness: .8, roughness: .3 }); s.rotation.z = Math.PI / 2; s.position.set(-9.9, y, z); });
  // khoang ổ đĩa phía trước
  const cage = new THREE.Group(); CASE.add(cage);
  box(.3, 13, 12, "#4c5566", 3.4, 7, 14.5, cage, { metalness: .5 }); box(.3, 13, 12, "#4c5566", -9.6, 7, 14.5, cage, { metalness: .5 });
  for (let k = 0; k < 4; k++) box(13, .25, 12, "#4c5566", -3.1, 1.2 + k * 3.6, 14.5, cage, { metalness: .5 });
  // lưới thông gió đáy (dưới khoang nguồn)
  for (let k = 0; k < 6; k++) box(13, .1, .5, "#11151b", -2.4, .3, -19 + k * 2.4, CASE);

  /* bàn lắp ráp: bo mạch chủ dựng trên giá trước thùng máy */
  const BENCH = new THREE.Group(); scene.add(BENCH);
  box(26, 1.2, 34, light ? "#c5cad6" : "#2d3a33", -6, 5.4, 39, BENCH);
  box(24, .2, 30, light ? "#5f7ea8" : "#3b5a7e", -6, 6.1, 39, BENCH, { roughness: .9 }); // thảm chống tĩnh điện
  box(4, 2.2, 2, "#5b6372", -9.4, 7.2, 30, BENCH); box(4, 2.2, 2, "#5b6372", -9.4, 7.2, 48, BENCH);

  /* bo mạch chủ: mặt phẳng XY cục bộ, pháp tuyến +Z; xoay 90° quanh Y để pháp tuyến hướng +x (về phía camera) */
  const MB = new THREE.Group(); scene.add(MB); MB.rotation.y = Math.PI / 2;
  const BENCH_POS = new THREE.Vector3(-9.4, 23.4, 39), CASE_POS = new THREE.Vector3(-9.6, 27, -7.8);
  MB.position.copy(BENCH_POS);
  const pcb = light ? "#1f5c3f" : "#226645";
  box(24.4, 30.5, .16, pcb, 0, 0, 0, MB, { roughness: .7 });
  const S = .08; // mặt trên tấm mạch
  // đế CPU + dấu tam giác ở góc (+x, +y)
  const socket = box(5.6, 5.6, .45, "#1a1d22", 3, 7.5, S + .22, MB);
  box(4.6, 4.6, .05, "#b9a26a", 3, 7.5, S + .47, MB, { metalness: .8, roughness: .35 });
  const lever = box(.25, 5.2, .25, "#c7ccd4", 6.1, 7.5, S + .4, MB, { metalness: .8 });
  const triS = new THREE.Mesh(new THREE.CircleGeometry(.8, 3), mat("#f2c84b", { emissive: "#6b4f00" })); triS.position.set(5.1, 9.6, S + .5); triS.rotation.z = Math.PI / 4; MB.add(triS);
  // khe RAM (2 khe) + chốt trắng
  const DIMM_X = [-4.2, -5.6];
  DIMM_X.forEach(x => { box(.75, 13.3, .9, "#121418", x, 6, S + .45, MB); box(.8, .8, 1.3, "#e6e8ec", x, 12.9, S + .65, MB); box(.8, .8, 1.3, "#e6e8ec", x, -.9, S + .65, MB); });
  // cổng nguồn
  box(1.1, 5.4, 1.2, "#e8e8e3", -11.2, 3, S + .6, MB);
  box(2.2, 1.1, 1.2, "#e8e8e3", 8, 14.2, S + .6, MB);
  // khe PCIe x16 + khe phụ
  box(9, .8, 1.1, "#121418", 2.5, -4, S + .55, MB); box(.9, .9, 1.4, "#e6e8ec", -2.4, -4, S + .7, MB);
  box(3.5, .7, .9, "#121418", 6.5, -11.5, S + .45, MB);
  // khe M.2 + nhãn
  box(.9, 2.4, .5, "#121418", 3.2, -8.5, S + .25, MB); box(.4, .4, .4, "#c9a227", -5.2, -8.5, S + .2, MB, { metalness: .8 });
  // tản nhiệt chipset, cổng SATA, cụm cổng sau, tụ điện, chip BIOS
  box(4.2, 4.2, .9, "#5d6675", -6.5, -11, S + .45, MB, { metalness: .6, roughness: .35 });
  for (let k = 0; k < 4; k++) box(1, .7, .9, "#26324a", -11.6, -6 - k * 1.1, S + .45, MB);
  box(1.8, 9, 3.2, "#2b2f36", 11.1, 9, S + 1.6, MB, { metalness: .5 });
  box(4.5, 3, 1.4, "#4d5664", 5.5, 13.4, S + .7, MB, { metalness: .6 }); box(1.4, 9, 1.4, "#4d5664", 9.4, 5, S + .7, MB, { metalness: .6 }); // tản nhiệt VRM
  for (let k = 0; k < 6; k++) { const c = cyl(.32, .8, "#1f242b", MB, { metalness: .5 }); c.rotation.x = Math.PI / 2; c.position.set(-1 + k * .8, 12.4, S + .4); }
  box(.9, .9, .2, "#141414", -9, -13, S + .1, MB);
  // các lỗ vít
  [[-11.2, 14.2], [-11.2, 0], [-11.2, -14.2], [0, 14.2], [0, -14.2], [11.2, 14.2], [11.2, 0], [11.2, -14.2]].forEach(([x, y]) => { const r = new THREE.Mesh(new THREE.RingGeometry(.25, .45, 16), mat("#c9a227", { metalness: .8 })); r.position.set(x, y, S + .01); MB.add(r); });

  /* ---------- mô hình linh kiện (hiện khi đã lắp) ---------- */
  const M = {};
  // CPU: nắp kim loại + đế xanh + tam giác vàng ở một góc
  M.cpu = new THREE.Group(); MB.add(M.cpu);
  box(4.5, 4.5, .18, "#2d6b3f", 0, 0, 0, M.cpu); box(3.9, 3.9, .22, "#c3c8d0", 0, 0, .2, M.cpu, { metalness: .9, roughness: .28 });
  const triC = new THREE.Mesh(new THREE.CircleGeometry(.62, 3), mat("#f2c84b", { emissive: "#6b4f00" })); triC.position.set(1.7, 1.7, .33); triC.rotation.z = Math.PI / 4; M.cpu.add(triC);
  M.cpu.userData.home = new THREE.Vector3(3, 7.5, S + .58);
  // quạt tản nhiệt: khối lá nhôm + quạt
  M.cooler = new THREE.Group(); MB.add(M.cooler);
  for (let k = 0; k < 13; k++) box(9, .16, 5.2, "#c2c8d1", 0, -4.3 + k * .72, 2.6, M.cooler, { metalness: .85, roughness: .3 });
  box(9.2, 9.2, .4, "#9aa2ae", 0, 0, .2, M.cooler, { metalness: .8 });
  fan(M.cooler, 4.1, 0, 0, 5.6, "z", "#30363f");
  M.cooler.userData.home = new THREE.Vector3(3, 7.5, S + .9);
  // RAM: 2 thanh dựng đứng, viền đèn LED
  M.ram = new THREE.Group(); MB.add(M.ram);
  const ramLeds = [];
  DIMM_X.forEach(x => {
    box(.42, 13.3, 3.1, "#1b5e3b", x, 0, 1.55, M.ram);
    box(.62, 13.1, 2.4, light ? "#2b3c63" : "#33467a", x, 0, 1.9, M.ram, { metalness: .6, roughness: .35 });
    ramLeds.push(box(.66, 12.9, .35, "#6d7685", x, 0, 3.25, M.ram, { emissive: "#000000" }));
  });
  M.ram.userData.home = new THREE.Vector3(0, 6, S + .9);
  // SSD M.2
  M.m2 = new THREE.Group(); MB.add(M.m2);
  box(8, 2.2, .14, "#1d4f35", 0, 0, 0, M.m2); box(2.8, 1.6, .2, "#16181c", -1.6, 0, .15, M.m2); box(2.2, 1.6, .2, "#16181c", 1.6, 0, .15, M.m2); box(1.2, 1.2, .2, "#2b2f36", -3.4, 0, .15, M.m2);
  M.m2.userData.home = new THREE.Vector3(-1, -8.5, S + .32);
  // card đồ họa: tấm nằm ngang, vuông góc với bo mạch, 2 quạt hướng xuống
  M.gpu = new THREE.Group(); MB.add(M.gpu);
  box(26, .2, 11, "#1b2a22", 0, .1, 0, M.gpu);
  box(25, 3.2, 10.6, light ? "#20242b" : "#1a1d22", 0, -1.7, 0, M.gpu, { metalness: .5, roughness: .4 });
  box(25.2, .3, 10.8, "#5f6b7d", 0, -3.4, 0, M.gpu, { metalness: .7 });
  fan(M.gpu, 3.9, -6, -3.6, 0, "y"); fan(M.gpu, 3.9, 4, -3.6, 0, "y");
  box(.3, 4, 11.4, "#b8bec8", 13, -1.5, 0, M.gpu, { metalness: .9 });
  const gpuStripe = box(18, .3, .3, "#6d7685", -2, -1.2, 5.4, M.gpu, { emissive: "#000000" });
  M.gpu.userData.home = new THREE.Vector3(-.4, -4.1, S + 6.6);
  // bộ nguồn (trong thùng máy, toạ độ thế giới)
  M.psu = new THREE.Group(); CASE.add(M.psu);
  box(15, 8.6, 14, "#1f2329", 0, 0, 0, M.psu, { metalness: .5, roughness: .45 });
  box(15.1, .3, 14.1, "#3a414d", 0, 4.3, 0, M.psu, { metalness: .6 });
  fan(M.psu, 5.4, 0, -4.5, 0, "y", "#3a414d");
  const psuLabel = box(.05, 3, 6, "#e8e8e3", 7.53, 1, 0, M.psu); psuLabel.material = mat("#e8e8e3");
  M.psu.userData.home = new THREE.Vector3(-2.4, 5, -13.8);
  // ổ cứng HDD
  M.hdd = new THREE.Group(); CASE.add(M.hdd);
  box(10.2, 2.6, 14.7, "#b5bcc7", 0, 0, 0, M.hdd, { metalness: .8, roughness: .35 }); box(9.6, .1, 9, "#e3e6ea", 0, 1.35, -1.5, M.hdd);
  M.hdd.userData.home = new THREE.Vector3(-3.1, 2.9, 14.4);
  // cáp nguồn (đường cong ống)
  function cable(points, color, r) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return new THREE.Mesh(new THREE.TubeGeometry(curve, 60, r, 10, false), mat(color, { roughness: .8 }));
  }
  const W = (x, y) => { const v = new THREE.Vector3(x, y, S + 1.2); return v.applyMatrix4(new THREE.Matrix4().compose(CASE_POS, MB.quaternion, new THREE.Vector3(1, 1, 1))); };
  const p24 = W(-11.2, 3), p8 = W(8, 14.2);
  M.atx24 = new THREE.Group(); CASE.add(M.atx24);
  M.atx24.add(cable([[1, 9.6, -8], [5, 12, -3], [5, 20, 4], [p24.x + 3, p24.y - 2, p24.z + 1.5], [p24.x + 1, p24.y, p24.z]], "#16191e", .75));
  box(1.6, 5.6, 1.4, "#16191e", p24.x + .6, p24.y, p24.z, M.atx24);
  M.cpu8 = new THREE.Group(); CASE.add(M.cpu8);
  M.cpu8.add(cable([[-5, 9.6, -19.4], [-8.6, 16, -20.2], [-8.6, 42.5, -20.2], [p8.x + 1.5, 43, p8.z - 1], [p8.x + 1, p8.y, p8.z]], "#16191e", .45));
  box(1.4, 1.3, 2.4, "#16191e", p8.x + .5, p8.y, p8.z, M.cpu8);
  M.atx24.userData.home = M.atx24.position.clone(); M.cpu8.userData.home = M.cpu8.position.clone();
  Object.values(M).forEach(m => { m.visible = false; m.userData.home ||= m.position.clone(); m.position.copy(m.userData.home); });

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
          h("span", { class: "pc-ic", html: PART_IC[p.id] }), h("span", { class: "pc-nm" }, p.name),
          isDone ? h("span", { class: "pc-st ok", html: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' }) : nxt ? h("span", { class: "pc-st" }, "Tiếp theo") : null);
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
      parts.push(h("small", { class: "pcb-i-k" }, done.has(p.id) ? "Đã lắp" : `Bước ${ORDER.indexOf(p.id) + 1} trên ${PARTS.length}`), h("b", { class: "pcb-i-t" }, p.full),
        h("dl", {}, h("dt", {}, "Chức năng"), h("dd", {}, p.func), h("dt", {}, "Lắp vào"), h("dd", {}, p.where), h("dt", {}, "Lưu ý"), h("dd", {}, p.tip)),
        sel ? null : h("p", { class: "pcb-hint" }, `Chọn “${p.name}” trong khay bên trái.`));
    } else if (p) {
      parts.push(h("b", { class: "pcb-i-t" }, p.full), h("p", {}, "Chạm vào vị trí đúng trên mô hình để lắp."));
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
    done.add("cpu"); if (!triedWrong.has("cpu")) firstTry.add("cpu");
    sel = null; Sfx.right(); paintTray(); updHud();
    paintInfo({ kind: "ok", text: `Đã lắp ${p.name} đúng chiều.` + (mode === "learn" ? " Tiếp theo: quạt tản nhiệt." : "") });
  }
  function powerOn() {
    powered = true; sel = null; paintTray(); Sfx.right();
    powerLed.material = mat("#38d26b", { emissive: "#1fbf55", emissiveIntensity: 1.2 });
    ramLeds.forEach((l, i) => l.material = mat(i ? "#7c5cff" : "#2aa7ff", { emissive: i ? "#6a4dff" : "#1e90ff", emissiveIntensity: 1.1 }));
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

  /* ---------- vòng vẽ ---------- */
  const v3 = new THREE.Vector3();
  let raf = 0, alive = true, last = performance.now();
  function frame(now) {
    if (!alive) return; raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i], t = Math.min(1, (now - a.t0) / a.dur), e = ease(t);
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
  const ro = new ResizeObserver(() => { const w = cvWrap.clientWidth, hh = cvWrap.clientHeight; if (!w || !hh) return; renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix(); });
  ro.observe(cvWrap);
  raf = requestAnimationFrame(frame);
  paintTray(); paintTools(); chooseMode();
  hud({ progress: `Đã lắp <b>0/${PARTS.length}</b>`, score: null });

  return () => {
    alive = false; cancelAnimationFrame(raf); ro.disconnect(); ts.forEach(clearTimeout); controls.dispose();
    scene.traverse(o => { o.geometry?.dispose?.(); });
    mats.forEach(m => m.dispose()); renderer.dispose(); renderer.forceContextLoss?.(); renderer.domElement.remove();
  };
}
