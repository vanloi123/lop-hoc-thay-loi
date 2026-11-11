/* =====================================================================
   MÔ PHỎNG 3D: LẮP MẠNG VLAN
   Một trường nhỏ: phòng giáo viên (2 máy) và phòng máy học sinh (3 máy) dùng chung một switch.
   Học sinh nối cáp, tạo VLAN, gán cổng access/trunk, tạo cổng con trên router rồi thử ping.
   Gói tin chạy trên dây theo màu VLAN; bên trái hiện lệnh Cisco IOS tương ứng với mỗi thao tác.
   ===================================================================== */
import { makeKit, THREE, rng } from "./kit.js";

const HOSTS = [
  { id: "gv1", name: "GV-1", room: "gv", ip: "192.168.10.11", net: 10, pos: [-27, 0] },
  { id: "gv2", name: "GV-2", room: "gv", ip: "192.168.10.12", net: 10, pos: [-14, 0] },
  { id: "hs1", name: "HS-1", room: "hs", ip: "192.168.20.21", net: 20, pos: [11, 0] },
  { id: "hs2", name: "HS-2", room: "hs", ip: "192.168.20.22", net: 20, pos: [23, 0] },
  { id: "hs3", name: "HS-3", room: "hs", ip: "192.168.20.23", net: 20, pos: [17, 12] }
];
const PORTS = ["Fa0/1", "Fa0/2", "Fa0/3", "Fa0/4", "Fa0/5", "Fa0/6", "Fa0/7", "Fa0/8", "Gi0/1"];
const VCOL = { 1: "#8a93a3", 10: "#f08c2e", 20: "#2fb36b", 30: "#9b6bff", trunk: "#2f7bff" };
const VLAN_CHOICES = [[10, "GIAOVIEN"], [20, "HOCSINH"], [30, "KHACH"]];
const TASKS = [
  { id: "cable", t: "Nối cáp 5 máy tính vào switch", tab: "cable",
    d: "Mỗi máy tính nối vào một cổng của switch bằng cáp mạng (cáp xoắn đôi, đầu RJ45). Switch chuyển gói tin giữa các máy cắm vào nó." },
  { id: "router", t: "Nối router vào cổng Gi0/1 của switch", tab: "cable",
    d: "Router nối các mạng khác nhau với nhau. Cắm router vào cổng Gi0/1, cổng tốc độ cao (Gigabit) của switch." },
  { id: "vlans", t: "Tạo VLAN 10 (GIAOVIEN) và VLAN 20 (HOCSINH)", tab: "switch",
    d: "VLAN (mạng LAN ảo) chia một switch thành nhiều mạng riêng biệt. Máy ở VLAN này không nhận được gói tin quảng bá của VLAN kia." },
  { id: "access", t: "Gán cổng máy giáo viên vào VLAN 10, máy học sinh vào VLAN 20", tab: "switch",
    d: "Cổng access chỉ thuộc một VLAN. Máy tính cắm vào cổng nào thì ở VLAN của cổng đó." },
  { id: "trunk", t: "Đặt cổng nối router ở chế độ trunk", tab: "switch",
    d: "Cổng trunk chở được nhiều VLAN trên cùng một sợi cáp. Mỗi gói tin được gắn thẻ số VLAN (chuẩn 802.1Q) để router biết gói tin thuộc mạng nào." },
  { id: "subif", t: "Tạo cổng con G0/0.10 và G0/0.20 trên router", tab: "router",
    d: "Mỗi VLAN là một mạng IP riêng (192.168.10.0 và 192.168.20.0). Router dùng hai cổng con làm cổng mặc định (gateway) cho từng mạng để chuyển gói tin giữa hai VLAN." },
  { id: "ping", t: "Ping thử: GV-1 → GV-2, HS-1 → HS-3, HS-2 → GV-1", tab: "test",
    d: "Lệnh ping gửi gói tin thử để xem hai máy có liên lạc được với nhau không. Cùng VLAN thì đi thẳng qua switch; khác VLAN thì phải đi vòng qua router." }
];
const TESTS = [["gv1", "gv2"], ["hs1", "hs3"], ["hs2", "gv1"]];

export default function runVlan(st, g, api) {
  const { h, on, Sfx, FX, toast, hud, Result } = api;
  const ts = [];
  const root = h("div", { class: "vln" }); st.append(root);
  const left = h("aside", { class: "vln-left" }), stageEl = h("div", { class: "pcb-stage vln-stage" }), right = h("aside", { class: "vln-right" });
  const cvWrap = h("div", { class: "pcb-cv" }), hsLayer = h("div", { class: "pcb-hs" }), tools = h("div", { class: "pcb-tools" });
  stageEl.append(cvWrap, hsLayer, tools); root.append(left, stageEl, right);

  /* ---------- trạng thái mạng ---------- */
  const ports = Object.fromEntries(PORTS.map(p => [p, { dev: null, mode: "access", vlan: 1 }]));
  const vlans = new Map([[1, "default"]]);
  const subifs = new Map();          // thẻ VLAN → true
  const pingOk = new Set();          // "gv1>gv2" đã ping thành công
  const cli = [];
  let mode = null, tab = "cable", selDev = null, pSrc = "gv1", pDst = "gv2", busy = false, checks = 0, finished = false, t0 = 0;
  const DEV = Object.fromEntries([...HOSTS.map(x => [x.id, x]), ["r1", { id: "r1", name: "Router R1" }]]);
  const portOf = id => PORTS.find(p => ports[p].dev === id) || null;
  const vlanOfPort = p => ports[p].mode === "trunk" ? 1 : ports[p].vlan;
  const log = (dev, lines, kind = "") => { lines.forEach(t => cli.push({ dev, t, kind })); while (cli.length > 120) cli.shift(); paintCli(); };

  /* ---------- cảnh 3D ---------- */
  const light = document.body.classList.contains("light");
  const K = makeKit(cvWrap, { light });
  const { scene, camera, controls, renderer, mat, tex, box, rbox, cyl, cable, label } = K;
  const R = rng(5);
  camera.position.set(4, 52, 66); controls.target.set(-1, 4, -2); controls.minDistance = 20; controls.maxDistance = 140; controls.maxPolarAngle = Math.PI * .47;
  // sàn gạch + chữ tên phòng
  const floorT = tex(512, 512, (x, w) => { x.fillStyle = light ? "#d9dde4" : "#2a332e"; x.fillRect(0, 0, w, w); x.strokeStyle = light ? "#c4c9d2" : "#323d37"; x.lineWidth = 4; for (let i = 0; i <= w; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, w); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); } }, [8, 5]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(86, 56), mat("#ffffff", { map: floorT, roughness: .9 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0); scene.add(floor);
  const roomLabel = (t, c) => label(1024, 160, [[t, 96, 118, "800", c, "center"]], { bg: "rgba(0,0,0,0)" });
  const rl = (t, c, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 4), mat("#ffffff", { map: roomLabel(t, c), transparent: true, roughness: .9 })); m.rotation.x = -Math.PI / 2; m.position.set(x, .05, z); scene.add(m); };
  rl("PHÒNG GIÁO VIÊN", "#e07b1f", -20, 22); rl("PHÒNG MÁY HỌC SINH", "#1f9a58", 18, 22);
  // vách ngăn kính mờ giữa hai phòng + tường sau
  const glass = new THREE.Mesh(new THREE.BoxGeometry(.4, 11, 36), mat("#bcd3e6", { transparent: true, opacity: .28, roughness: .1, metalness: .1 })); glass.position.set(-1, 5.5, 6); scene.add(glass);
  box(.6, 11.4, .6, "#6b7486", -1, 5.7, -12, scene); box(.6, 11.4, .6, "#6b7486", -1, 5.7, 24, scene); box(.6, .6, 36, "#6b7486", -1, 11.2, 6, scene);
  box(86, 16, .8, light ? "#cfd5de" : "#26302b", 0, 8, -27.6, scene, { roughness: .9 });

  /* tủ mạng: khung, switch 8 cổng + 1 cổng Gigabit, router */
  const RACK = new THREE.Group(); RACK.position.set(-1, 0, -21); scene.add(RACK);
  // tủ mở mặt trước: hai vách bên, nóc, đáy, lưng
  [-3.6, 3.6].forEach(x => rbox(.3, 20, 7, .1, "#1d2026", x, 10, 0, RACK, { metalness: .5, roughness: .45 }));
  rbox(7.5, .4, 7, .1, "#1d2026", 0, 20, 0, RACK, { metalness: .5 }); rbox(7.5, .5, 7, .1, "#1d2026", 0, .25, 0, RACK, { metalness: .5 });
  box(7, 19.5, .25, "#101215", 0, 10, -3.4, RACK);
  [[-3, 10], [3, 10]].forEach(([x]) => box(.25, 18.6, .3, "#8a93a3", x, 10, 3.4, RACK, { metalness: .8, roughness: .3 }));
  const swFace = tex(1024, 128, (x, w, hh) => {
    x.fillStyle = "#2a3039"; x.fillRect(0, 0, w, hh); x.fillStyle = "#aeb6c2"; x.font = "bold 30px sans-serif"; x.fillText("SWITCH SW1", 24, 50); x.font = "500 20px sans-serif"; x.fillText("8 × 10/100 + 1 × Gigabit", 24, 90);
    for (let i = 0; i < 9; i++) { const px = 330 + i * 72 + (i === 8 ? 28 : 0); x.fillStyle = "#0b0c0e"; x.fillRect(px, 52, 54, 50); x.fillStyle = "#c9a227"; x.fillRect(px + 10, 56, 34, 6); x.fillStyle = "#c7ccd5"; x.font = "bold 16px sans-serif"; x.fillText(PORTS[i].replace("Fa0/", "").replace("Gi0/1", "G1"), px + 18, 44); }
  });
  const SW = new THREE.Group(); SW.position.set(0, 9.6, 3.2); RACK.add(SW);
  box(6.2, .9, 6, [mat("#2a3039"), mat("#2a3039"), mat("#2a3039", { metalness: .5 }), mat("#2a3039"), mat("#ffffff", { map: swFace, roughness: .5 }), mat("#2a3039")], 0, 0, -3, SW);
  const portX = i => -3.1 + (330 + i * 72 + (i === 8 ? 28 : 0) + 27) / 1024 * 6.2;
  const leds = PORTS.map((p, i) => box(.16, .1, .06, "#1c2a22", portX(i), .36, .02, SW, { emissive: "#000000" }));
  const portPos = p => SW.localToWorld(new THREE.Vector3(portX(PORTS.indexOf(p)), -.05, .1));
  const rtFace = tex(1024, 128, (x, w, hh) => { x.fillStyle = "#1f3046"; x.fillRect(0, 0, w, hh); x.fillStyle = "#c3d2e6"; x.font = "bold 30px sans-serif"; x.fillText("ROUTER R1", 24, 52); x.font = "500 20px sans-serif"; x.fillText("G0/0", 760, 40); x.fillStyle = "#0b0c0e"; x.fillRect(760, 52, 60, 52); x.fillStyle = "#c9a227"; x.fillRect(772, 56, 36, 6); for (let i = 0; i < 4; i++) { x.fillStyle = "#344a66"; x.fillRect(420 + i * 70, 50, 50, 50); } });
  const RT = new THREE.Group(); RT.position.set(0, 13.2, 3.2); RACK.add(RT);
  box(6.2, 1.1, 6, [mat("#1f3046"), mat("#1f3046"), mat("#1f3046", { metalness: .5 }), mat("#1f3046"), mat("#ffffff", { map: rtFace, roughness: .5 }), mat("#1f3046")], 0, 0, -3, RT);
  const rtLed = box(.2, .12, .06, "#1c2a22", 1.4, .4, .02, RT, { emissive: "#000000" });
  const routerPort = () => RT.localToWorld(new THREE.Vector3(-3.1 + 790 / 1024 * 6.2, -.1, .1));
  // giá dưới: ổ cắm điện, tủ mát
  box(6.2, 2, 6, "#15181c", 0, 3, 0, RACK); box(6.2, 1, 6, "#2b3038", 0, 6.2, 0, RACK);

  /* bàn + máy tính (màn hình hiện tên, IP, VLAN) */
  const screens = {}, towers = {};
  function screenTex(hst) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 300; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.c = c; return t;
  }
  function paintScreen(id) {
    const hst = DEV[id], t = screens[id], c = t.userData.c, x = c.getContext("2d"), p = portOf(id), v = p ? vlanOfPort(p) : null;
    const col = v ? VCOL[v] || VCOL[1] : "#4b5563";
    x.fillStyle = "#0e1726"; x.fillRect(0, 0, 512, 300);
    x.fillStyle = col; x.fillRect(0, 0, 512, 54);
    x.fillStyle = "#fff"; x.font = "bold 38px sans-serif"; x.fillText(hst.name, 22, 40);
    x.font = "bold 26px sans-serif"; x.textAlign = "right"; x.fillText(v ? `VLAN ${v}` : "Chưa nối", 490, 38); x.textAlign = "left";
    x.fillStyle = "#cfe0ff"; x.font = "600 30px monospace"; x.fillText(hst.ip, 22, 118);
    x.fillStyle = "#8ea3c2"; x.font = "500 22px sans-serif"; x.fillText("Mặt nạ 255.255.255.0", 22, 160); x.fillText(`Cổng mặc định 192.168.${hst.net}.1`, 22, 196);
    x.fillStyle = p ? "#7CFC9A" : "#ff9a9a"; x.font = "600 22px sans-serif"; x.fillText(p ? `Đã nối cổng ${p}` : "Chưa cắm cáp mạng", 22, 250);
    t.needsUpdate = true;
  }
  const deskTop = tex(256, 128, (x, w, hh) => { x.fillStyle = "#c79d6e"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(110,70,30,${R() * .25})`; x.beginPath(); const y = R() * hh; x.moveTo(0, y); x.bezierCurveTo(w * .3, y + 6, w * .6, y - 6, w, y + R() * 4); x.stroke(); } });
  HOSTS.forEach(hst => {
    const G = new THREE.Group(); G.position.set(hst.pos[0], 0, hst.pos[1]); scene.add(G);
    rbox(10, .45, 5, .1, mat("#ffffff", { map: deskTop, roughness: .7 }), 0, 7.4, 0, G);
    [[-4.6, -2.2], [4.6, -2.2], [-4.6, 2.2], [4.6, 2.2]].forEach(([x, z]) => box(.35, 7.2, .35, "#4b5563", x, 3.6, z, G, { metalness: .6 }));
    // màn hình
    rbox(6.4, 3.9, .3, .1, "#15181d", 0, 10.6, -1.4, G, { metalness: .4 });
    screens[hst.id] = screenTex(hst);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.5), mat("#ffffff", { map: screens[hst.id], emissive: "#ffffff", emissiveMap: screens[hst.id], emissiveIntensity: .55, roughness: .4 })); scr.position.set(0, 10.6, -1.24); G.add(scr);
    box(.5, 1.8, .4, "#2b3038", 0, 8.4, -1.5, G); rbox(2.4, .2, 1.4, .08, "#2b3038", 0, 7.7, -1.5, G);
    rbox(4.6, .2, 1.4, .08, "#1d2026", -.2, 7.72, .8, G); rbox(.7, .2, 1, .3, "#1d2026", 3, 7.72, .9, G);
    // thân máy dưới gầm bàn
    const tw = rbox(2, 4.4, 4.4, .15, "#22262d", 3.4, 2.25, -.6, G, { metalness: .5, roughness: .4 }); towers[hst.id] = G;
    box(.05, .3, .3, "#3ad16b", 4.42, 3.9, 1.2, G, { emissive: "#1fbf55" });
  });

  /* ---------- dây cáp & gói tin ---------- */
  const cables = {}; // id thiết bị → { mesh, curve }
  function hostCurve(id, p) {
    const hst = DEV[id], [x, z] = hst.pos, end = portPos(p), i = HOSTS.indexOf(hst), lane = -14.5 - i * .35;
    return new THREE.CatmullRomCurve3([new THREE.Vector3(x + 3.4, 2.5, z - 2.8), new THREE.Vector3(x + 3.4, .25, z - 3.4), new THREE.Vector3(x + 3.4, .25, lane), new THREE.Vector3(end.x, .25, lane - 1), new THREE.Vector3(end.x, .25, end.z + 2.4), new THREE.Vector3(end.x, end.y - 1.2, end.z + .8), end]);
  }
  function routerCurve(p) { const a = routerPort(), b = portPos(p); return new THREE.CatmullRomCurve3([a, a.clone().add(new THREE.Vector3(.4, -.4, 1.2)), new THREE.Vector3((a.x + b.x) / 2 + 1.6, (a.y + b.y) / 2, a.z + 1.6), b.clone().add(new THREE.Vector3(.2, .4, 1.2)), b]); }
  function cableColor(p) { return ports[p].mode === "trunk" ? VCOL.trunk : VCOL[ports[p].vlan] || VCOL[1]; }
  function drawCable(id) {
    if (cables[id]) { scene.remove(cables[id].mesh); cables[id].mesh.geometry.dispose(); delete cables[id]; }
    const p = portOf(id); if (!p) return;
    const curve = id === "r1" ? routerCurve(p) : hostCurve(id, p);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, .16, 8, false), mat(cableColor(p), { roughness: .5 })); mesh.castShadow = true;
    scene.add(mesh); cables[id] = { mesh, curve };
  }
  function refresh3D() {
    Object.keys(DEV).forEach(drawCable);
    PORTS.forEach((p, i) => { leds[i].material = ports[p].dev ? mat("#3ad16b", { emissive: "#1fbf55", emissiveIntensity: 1.2 }) : mat("#1c2a22", { emissive: "#000000" }); });
    rtLed.material = portOf("r1") ? mat("#3ad16b", { emissive: "#1fbf55", emissiveIntensity: 1.2 }) : mat("#1c2a22");
    HOSTS.forEach(x => paintScreen(x.id));
  }
  const packets = [];
  function sendPacket(segs, color, onDone) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(.9, 18, 14), mat(color, { emissive: color, emissiveIntensity: 1.4 }));
    scene.add(m); packets.push({ m, segs, i: 0, t: 0, onDone });
  }
  // đoạn đường: [id thiết bị, chiều đi ra (true: thiết bị → switch)]
  const seg = (id, out) => ({ curve: cables[id].curve, out });

  /* ---------- logic ping ---------- */
  function evaluate(a, b) {
    const A = DEV[a], B = DEV[b], pa = portOf(a), pb = portOf(b);
    if (a === b) return { ok: false, why: "Hãy chọn hai máy khác nhau." };
    if (!pa) return { ok: false, why: `${A.name} chưa cắm cáp vào switch.` };
    if (!pb) return { ok: false, why: `${B.name} chưa cắm cáp vào switch.` };
    const va = vlanOfPort(pa), vb = vlanOfPort(pb);
    for (const [p, v, X] of [[pa, va, A], [pb, vb, B]]) if (!vlans.has(v)) return { ok: false, why: `Cổng ${p} của ${X.name} gán VLAN ${v} nhưng VLAN ${v} chưa được tạo trên switch.`, stop: "sw" };
    if (A.net === B.net) {
      if (va === vb) return { ok: true, route: "direct", why: `Cùng VLAN ${va} và cùng mạng 192.168.${A.net}.0, switch chuyển thẳng gói tin.` };
      return { ok: false, stop: "sw", why: `${A.name} ở VLAN ${va}, ${B.name} ở VLAN ${vb}. Hai VLAN khác nhau nên switch không chuyển gói tin sang.` };
    }
    // khác mạng IP: phải đi qua router
    const pr = portOf("r1");
    if (!pr) return { ok: false, stop: "sw", why: `${A.name} và ${B.name} thuộc hai mạng IP khác nhau, cần router để chuyển gói tin, nhưng router chưa được nối.` };
    if (ports[pr].mode !== "trunk") return { ok: false, stop: "sw", why: `Cổng ${pr} nối router đang ở chế độ access nên chỉ chở được một VLAN. Hãy đặt cổng này là trunk.` };
    for (const [v, X] of [[va, A], [vb, B]]) {
      if (!subifs.has(v)) return { ok: false, stop: "rt", why: `Router chưa có cổng con cho VLAN ${v} (G0/0.${v}), nên ${X.name} không có cổng mặc định để gửi gói tin ra ngoài.` };
      if (v !== X.net) return { ok: false, stop: "sw", why: `${X.name} có IP thuộc mạng 192.168.${X.net}.0 nhưng đang ở VLAN ${v}. Cổng mặc định 192.168.${X.net}.1 nằm ở VLAN ${X.net}, nên gói tin không tới được router.` };
    }
    return { ok: true, route: "router", why: `Khác VLAN: gói tin đi từ ${A.name} lên router (gắn thẻ VLAN ${va} trên đường trunk), router chuyển sang VLAN ${vb} rồi trả về switch tới ${B.name}.` };
  }
  function runPing(a, b, silent) {
    if (busy) return; const A = DEV[a], B = DEV[b], r = evaluate(a, b);
    log(A.name, [`${A.name}> ping ${B.ip}`]);
    const color = VCOL[portOf(a) ? vlanOfPort(portOf(a)) : 1] || VCOL[1];
    const done = () => {
      busy = false;
      if (r.ok) { pingOk.add(`${a}>${b}`); log(A.name, [`Reply from ${B.ip}: bytes=32 time<1ms TTL=${r.route === "router" ? 127 : 128}`, `Ping thành công (4/4 gói tin).`], "ok"); Sfx.right(); }
      else { log(A.name, ["Request timed out.", "Ping thất bại (0/4 gói tin)."], "bad"); Sfx.wrong(); }
      lastPing = { a, b, ...r }; paintRight(); checkTasks(); updHud();
    };
    if (!portOf(a)) return done();
    busy = true; paintRight();
    if (r.ok && r.route === "direct") sendPacket([seg(a, true), seg(b, false)], color, done);
    else if (r.ok) sendPacket([seg(a, true), seg("r1", false), seg("r1", true), seg(b, false)], color, done);
    else if (r.stop === "rt" && portOf("r1")) sendPacket([seg(a, true), seg("r1", false)], color, done);
    else sendPacket([seg(a, true)], color, done);
  }
  let lastPing = null;

  /* ---------- thao tác cấu hình ---------- */
  function connect(id, p) {
    if (ports[p].dev) { Sfx.wrong(); toast(`Cổng ${p} đã có ${DEV[ports[p].dev].name} cắm vào.`, 1800); return; }
    const old = portOf(id); if (old) ports[old].dev = null;
    ports[p].dev = id; selDev = null; Sfx.drop();
    log("SW1", [`%LINK-3-UPDOWN: Interface ${p}, changed state to up (${DEV[id].name})`], "sys");
    refresh3D(); paintRight(); checkTasks();
  }
  function unplug(id) { const p = portOf(id); if (!p) return; ports[p].dev = null; log("SW1", [`%LINK-3-UPDOWN: Interface ${p}, changed state to down`], "sys"); Sfx.tick(); refresh3D(); paintRight(); checkTasks(); }
  function createVlan(id, name) {
    if (vlans.has(id)) return;
    vlans.set(id, name); Sfx.right();
    log("SW1", [`SW1(config)# vlan ${id}`, `SW1(config-vlan)# name ${name}`]); paintRight(); checkTasks();
  }
  function deleteVlan(id) {
    vlans.delete(id); log("SW1", [`SW1(config)# no vlan ${id}`]); Sfx.tick(); refresh3D(); paintRight(); checkTasks();
  }
  function setMode(p, m) {
    if (ports[p].mode === m) return; ports[p].mode = m; Sfx.tick();
    log("SW1", [`SW1(config)# interface ${p.toLowerCase()}`, `SW1(config-if)# switchport mode ${m}`].concat(m === "access" && ports[p].vlan !== 1 ? [`SW1(config-if)# switchport access vlan ${ports[p].vlan}`] : []));
    refresh3D(); paintRight(); checkTasks();
  }
  function setVlan(p, v) {
    ports[p].vlan = v; if (ports[p].mode !== "access") ports[p].mode = "access"; Sfx.tick();
    log("SW1", [`SW1(config)# interface ${p.toLowerCase()}`, "SW1(config-if)# switchport mode access", `SW1(config-if)# switchport access vlan ${v}`]);
    refresh3D(); paintRight(); checkTasks();
  }
  function toggleSubif(v) {
    if (subifs.has(v)) { subifs.delete(v); log("R1", [`R1(config)# no interface g0/0.${v}`]); Sfx.tick(); }
    else {
      const first = !subifs.size; subifs.set(v, true); Sfx.right();
      log("R1", (first ? ["R1(config)# interface g0/0", "R1(config-if)# no shutdown"] : []).concat([`R1(config)# interface g0/0.${v}`, `R1(config-subif)# encapsulation dot1Q ${v}`, `R1(config-subif)# ip address 192.168.${v}.1 255.255.255.0`]));
    }
    paintRight(); checkTasks();
  }

  /* ---------- nhiệm vụ ---------- */
  const isDone = {
    cable: () => HOSTS.every(x => portOf(x.id)),
    router: () => portOf("r1") === "Gi0/1",
    vlans: () => vlans.has(10) && vlans.has(20),
    access: () => HOSTS.every(x => { const p = portOf(x.id); return p && ports[p].mode === "access" && ports[p].vlan === x.net; }),
    trunk: () => { const p = portOf("r1"); return !!p && ports[p].mode === "trunk"; },
    subif: () => subifs.has(10) && subifs.has(20),
    ping: () => TESTS.every(([a, b]) => pingOk.has(`${a}>${b}`))
  };
  const doneSet = new Set();
  function checkTasks() {
    let changed = false;
    TASKS.forEach(t => { const d = isDone[t.id](); if (d && !doneSet.has(t.id)) { doneSet.add(t.id); changed = true; if (mode === "learn") { Sfx.right(); FX.burstEl?.(left.querySelector(`[data-task=${t.id}]`), 12); } } else if (!d && doneSet.has(t.id) && t.id !== "ping") { doneSet.delete(t.id); changed = true; } });
    paintLeft(); updHud();
    if (mode === "learn" && doneSet.size === TASKS.length && !finished) ts.push(setTimeout(() => finish(TASKS.length), 1600));
  }
  const updHud = () => hud({ progress: mode === "challenge" ? `Lần chấm <b>${checks}</b>` : `Nhiệm vụ <b>${doneSet.size}/${TASKS.length}</b>`, score: null, extra: `Ping thành công <b>${pingOk.size}</b>` });

  /* ---------- giao diện bên trái: nhiệm vụ + lệnh CLI ---------- */
  const cliBox = h("pre", { class: "vln-cli", "aria-label": "Lệnh tương đương trên thiết bị Cisco" });
  function paintCli() {
    cliBox.replaceChildren(...(cli.length ? cli : [{ t: "! Mỗi thao tác của em sẽ hiện ra lệnh Cisco IOS tương ứng ở đây.", kind: "sys" }]).map(l => h("div", { class: "cl " + (l.kind || "") }, l.t)));
    cliBox.scrollTop = cliBox.scrollHeight;
  }
  function paintLeft() {
    const cur = mode === "learn" ? TASKS.find(t => !doneSet.has(t.id)) : null;
    left.replaceChildren(
      h("div", { class: "pcb-th" }, h("b", {}, mode === "challenge" ? "Yêu cầu" : "Nhiệm vụ"), h("small", {}, mode === "challenge" ? "Xong thì bấm Chấm bài" : `${doneSet.size}/${TASKS.length}`)),
      h("ol", { class: "vln-tasks" }, TASKS.map(t => {
        const d = doneSet.has(t.id), c = cur === t;
        const li = h("li", { class: (d && mode === "learn" ? "done" : "") + (c ? " cur" : ""), "data-task": t.id }, h("i", { html: d && mode === "learn" ? '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : "" }), h("span", {}, h("b", {}, t.t), c ? h("small", {}, t.d) : null));
        if (mode === "learn") on(li, () => { tab = t.tab; paintRight(); });
        return li;
      })),
      h("div", { class: "vln-cli-h" }, h("b", {}, "Lệnh tương đương (Cisco IOS)")), cliBox);
    paintCli(); left.querySelector(".vln-tasks li.cur")?.scrollIntoView({ block: "nearest" });
  }

  /* ---------- giao diện bên phải: các thẻ cấu hình ---------- */
  const chip = (txt, active, fn, extra = "") => on(h("button", { class: "vchip" + (active ? " on" : "") + (extra ? " " + extra : ""), "data-hit": true }, txt), fn);
  const vdot = v => h("i", { class: "vdot", style: `--v:${v === "trunk" ? VCOL.trunk : VCOL[v] || VCOL[1]}` });
  function paintRight() {
    const tabs = [["cable", "Nối cáp"], ["switch", "Switch"], ["router", "Router"], ["test", "Kiểm tra"]];
    const body = h("div", { class: "vln-body" });
    if (tab === "cable") {
      body.append(h("p", { class: "vln-hint" }, selDev ? `Chọn cổng trên switch để cắm cáp cho ${DEV[selDev].name}.` : "Chọn một thiết bị, rồi chọn cổng trên switch để cắm cáp."));
      Object.values(DEV).forEach(d => {
        const p = portOf(d.id), s = selDev === d.id;
        body.append(h("div", { class: "vrow" + (s ? " sel" : "") },
          on(h("button", { class: "vdev", "data-hit": true, "aria-pressed": s ? "true" : "false" }, h("b", {}, d.name), h("small", {}, d.ip || "Cổng G0/0")), () => { selDev = s ? null : d.id; paintRight(); }),
          p ? h("span", { class: "vport" }, vdot(ports[p].mode === "trunk" ? "trunk" : ports[p].vlan), p) : h("span", { class: "vport none" }, "Chưa nối"),
          p ? chip("Rút cáp", false, () => unplug(d.id), "ghost") : null));
      });
      body.append(h("div", { class: "vsw" + (selDev ? " pick" : "") }, h("small", {}, "Mặt trước switch SW1"),
        h("div", { class: "vsw-ports" }, PORTS.map(p => { const d = ports[p].dev; const b = h("button", { class: "vsp" + (d ? " used" : "") + (p === "Gi0/1" ? " giga" : ""), "data-hit": true, disabled: !selDev || (d && d !== selDev), title: d ? `${p}: ${DEV[d].name}` : p }, h("span", {}, p.replace("Fa0/", "")), h("small", {}, d ? DEV[d].name : p === "Gi0/1" ? "Gigabit" : "trống")); on(b, () => selDev && connect(selDev, p)); return b; }))));
    } else if (tab === "switch") {
      body.append(h("h4", {}, "Danh sách VLAN"),
        h("div", { class: "vlist" }, [...vlans].map(([id, name]) => h("div", { class: "vli" }, vdot(id), h("b", {}, `VLAN ${id}`), h("span", {}, name), id !== 1 ? chip("Xóa", false, () => deleteVlan(id), "ghost") : h("small", { class: "muted" }, "mặc định")))),
        h("div", { class: "vadd" }, h("small", {}, "Tạo VLAN mới:"), ...VLAN_CHOICES.filter(([id]) => !vlans.has(id)).map(([id, name]) => chip(`+ VLAN ${id} ${name}`, false, () => createVlan(id, name)))),
        h("h4", {}, "Các cổng đang dùng"));
      const used = PORTS.filter(p => ports[p].dev);
      if (!used.length) body.append(h("p", { class: "vln-hint" }, "Chưa có cổng nào được cắm cáp. Sang thẻ Nối cáp trước."));
      used.forEach(p => {
        const P = ports[p];
        body.append(h("div", { class: "vport-row" },
          h("div", { class: "vpr-h" }, vdot(P.mode === "trunk" ? "trunk" : P.vlan), h("b", {}, p), h("span", {}, DEV[P.dev].name)),
          h("div", { class: "vpr-c" }, h("small", {}, "Chế độ"), chip("Access", P.mode === "access", () => setMode(p, "access")), chip("Trunk", P.mode === "trunk", () => setMode(p, "trunk"))),
          P.mode === "access" ? h("div", { class: "vpr-c" }, h("small", {}, "VLAN"), ...[...vlans.keys()].map(v => chip(String(v), P.vlan === v, () => setVlan(p, v)))) : h("p", { class: "vln-mini" }, "Trunk: chở mọi VLAN, gói tin được gắn thẻ 802.1Q.")));
      });
    } else if (tab === "router") {
      const pr = portOf("r1");
      body.append(h("p", { class: "vln-hint" }, pr ? `Cổng G0/0 của router đang nối vào ${pr} của switch (${ports[pr].mode === "trunk" ? "trunk" : "access, VLAN " + ports[pr].vlan}).` : "Router chưa được nối vào switch."),
        h("h4", {}, "Cổng con trên G0/0 (mỗi VLAN một cổng mặc định)"));
      [10, 20, 30].forEach(v => {
        const has = subifs.has(v);
        body.append(h("div", { class: "vport-row" },
          h("div", { class: "vpr-h" }, vdot(v), h("b", {}, `G0/0.${v}`), h("span", {}, `VLAN ${v}, IP 192.168.${v}.1/24`)),
          h("div", { class: "vpr-c" }, chip(has ? "Đã tạo, bấm để xóa" : "Tạo cổng con", has, () => toggleSubif(v)))));
      });
      body.append(h("p", { class: "vln-mini" }, "Máy giáo viên dùng cổng mặc định 192.168.10.1, máy học sinh dùng 192.168.20.1."));
    } else {
      const pick = (lbl, cur, fn) => h("div", { class: "vpr-c vwrap" }, h("small", {}, lbl), ...HOSTS.map(x => chip(x.name, cur === x.id, () => { fn(x.id); paintRight(); })));
      body.append(pick("Máy gửi", pSrc, v => pSrc = v), pick("Máy nhận", pDst, v => pDst = v),
        on(h("button", { class: "btn primary block", "data-hit": true, disabled: busy }, busy ? "Đang gửi gói tin…" : `Ping từ ${DEV[pSrc].name} tới ${DEV[pDst].name}`), () => runPing(pSrc, pDst)),
        h("h4", {}, "Ping theo nhiệm vụ"),
        h("div", { class: "vtests" }, TESTS.map(([a, b]) => { const ok = pingOk.has(`${a}>${b}`); return on(h("button", { class: "vtest" + (ok ? " ok" : ""), "data-hit": true, disabled: busy }, h("span", {}, `${DEV[a].name} → ${DEV[b].name}`), h("small", {}, ok ? "Thành công" : "Chưa thử / chưa được")), () => { pSrc = a; pDst = b; runPing(a, b); }); })));
      if (lastPing) body.append(h("div", { class: "vres " + (lastPing.ok ? "ok" : "bad") }, h("b", {}, `${DEV[lastPing.a].name} → ${DEV[lastPing.b].name}: ${lastPing.ok ? "thành công" : "thất bại"}`), h("p", {}, lastPing.why)));
      if (mode === "challenge") body.append(on(h("button", { class: "btn lg block", "data-hit": true, disabled: busy }, "Chấm bài"), grade));
    }
    right.replaceChildren(h("div", { class: "vtabs", role: "tablist" }, tabs.map(([k, l]) => on(h("button", { class: "vtab" + (tab === k ? " on" : ""), role: "tab", "aria-selected": tab === k ? "true" : "false", "data-hit": true }, l), () => { tab = k; paintRight(); }))), body);
  }

  /* ---------- thử thách: chấm theo yêu cầu ---------- */
  function grade() {
    checks++;
    const res = TASKS.map(t => [t, t.id === "ping" ? TESTS.every(([a, b]) => evaluate(a, b).ok) : isDone[t.id]()]);
    const pass = res.filter(([, ok]) => ok).length;
    log("Chấm bài", res.map(([t, ok]) => `${ok ? "[ĐẠT]" : "[CHƯA]"} ${t.t}`), pass === res.length ? "ok" : "bad");
    if (pass === res.length) { Sfx.win(); finish(pass); }
    else { Sfx.wrong(); toast(`Đạt ${pass}/${res.length} yêu cầu. Xem phần [CHƯA] ở khung lệnh bên trái.`, 3200); updHud(); }
  }
  function finish(pass) {
    if (finished) return; finished = true;
    const secs = Math.round((performance.now() - t0) / 1000), mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, "0");
    const score = mode === "challenge" ? Math.max(40, 160 - (checks - 1) * 20 - Math.floor(secs / 10)) : 100;
    Result(g, { score, correct: pass, total: TASKS.length, label: "Yêu cầu đạt", noRecord: mode !== "challenge",
      title: mode === "challenge" ? (checks === 1 ? "Cấu hình chuẩn ngay lần đầu!" : "Mạng VLAN đã chạy!") : "Hoàn thành bài lắp mạng VLAN!",
      note: `Hai VLAN chạy riêng, liên lạc với nhau qua router. Thời gian ${mm} phút ${ss} giây${mode === "challenge" ? `, chấm ${checks} lần` : ""}.`,
      stats: [["Yêu cầu đạt", `${pass}/${TASKS.length}`], ["Ping thành công", String(pingOk.size)], ["Thời gian", `${mm}:${ss}`]].concat(mode === "challenge" ? [["Số lần chấm", String(checks)]] : []) });
  }

  /* ---------- nhãn thiết bị trên cảnh 3D (bấm để chọn) ---------- */
  const labels = {};
  const LBL = [...HOSTS.map(x => [x.id, () => new THREE.Vector3(x.pos[0], 13.6, x.pos[1] - 1.4)]), ["sw", () => SW.localToWorld(new THREE.Vector3(-3.8, 0, 0))], ["r1", () => RT.localToWorld(new THREE.Vector3(-3.8, 0, 0))]];
  LBL.forEach(([id]) => {
    const b = h("button", { class: "pc-hs vl-hs", "data-hit": true, "data-dev": id }, h("span", {}, id === "sw" ? "Switch SW1" : DEV[id].name));
    on(b, () => { if (id === "sw") tab = "switch"; else if (id === "r1" && portOf("r1")) tab = "router"; else { tab = "cable"; selDev = id; } paintRight(); });
    hsLayer.append(b); labels[id] = b;
  });

  /* ---------- camera ---------- */
  let fly = null;
  const VIEWS = { all: { t: [-1, 4, -2], p: [4, 52, 66] }, rack: { t: [-1, 11, -18], p: [10, 18, 6] }, gv: { t: [-20, 6, 0], p: [-14, 30, 36] }, hs: { t: [17, 6, 4], p: [24, 30, 40] } };
  const flyTo = v => { const V = VIEWS[v], k = Math.max(1, 1.25 / camera.aspect), t = new THREE.Vector3(...V.t), p = new THREE.Vector3(...V.p); fly = { target: t, pos: t.clone().add(p.sub(t).multiplyScalar(k)) }; };
  controls.addEventListener("start", () => { fly = null; });
  tools.replaceChildren(...[["all", "Toàn cảnh"], ["rack", "Tủ mạng"], ["gv", "Phòng GV"], ["hs", "Phòng HS"]].map(([v, l]) => on(h("button", { class: "btn sm", "data-hit": true }, l), () => flyTo(v))));

  /* ---------- chọn chế độ ---------- */
  function chooseMode() {
    stageEl.append(h("div", { class: "pcb-start" }, h("div", { class: "pcb-start-c" },
      h("h2", {}, "Lắp mạng VLAN"),
      h("p", {}, "Trường có phòng giáo viên (2 máy) và phòng máy học sinh (3 máy) dùng chung một switch. Hãy chia hai phòng thành hai VLAN riêng, rồi cho chúng liên lạc với nhau qua router."),
      h("div", { class: "pcb-modes" },
        on(h("button", { class: "pcb-mode", "data-hit": true }, h("b", {}, "Học từng bước"), h("span", {}, "7 nhiệm vụ có giải thích: VLAN là gì, cổng access, cổng trunk, định tuyến giữa các VLAN.")), () => start("learn")),
        on(h("button", { class: "pcb-mode", "data-hit": true }, h("b", {}, "Thử thách"), h("span", {}, "Tự cấu hình theo yêu cầu rồi bấm Chấm bài. Chấm càng ít lần, làm càng nhanh thì điểm càng cao.")), () => start("challenge"))))));
  }
  function start(m) { mode = m; t0 = performance.now(); stageEl.querySelector(".pcb-start")?.remove(); Sfx.right(); paintLeft(); paintRight(); updHud(); flyTo("all"); }

  /* ---------- vòng vẽ ---------- */
  const v3 = new THREE.Vector3();
  let raf = 0, alive = true, last = performance.now(), blink = 0;
  function frame(now) {
    if (!alive) return; raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(.25, (now - last) / 1000); last = now; blink += dt;
    for (let i = packets.length - 1; i >= 0; i--) {
      const pk = packets[i], s = pk.segs[pk.i]; pk.t += dt / .85;
      const u = Math.min(1, pk.t); s.curve.getPointAt(s.out ? u : 1 - u, pk.m.position);
      if (pk.t >= 1) { pk.i++; pk.t = 0; if (pk.i >= pk.segs.length) { scene.remove(pk.m); pk.m.geometry.dispose(); packets.splice(i, 1); pk.onDone?.(); } }
    }
    if (packets.length) PORTS.forEach((p, i) => { if (ports[p].dev) leds[i].material = (blink * 8 | 0) % 2 ? mat("#ffb020", { emissive: "#ff9800", emissiveIntensity: 1.3 }) : mat("#3ad16b", { emissive: "#1fbf55", emissiveIntensity: 1.2 }); });
    if (fly) { controls.target.lerp(fly.target, .08); camera.position.lerp(fly.pos, .08); if (camera.position.distanceTo(fly.pos) < .3) fly = null; }
    controls.update(); renderer.render(scene, camera);
    const w = cvWrap.clientWidth, hh = cvWrap.clientHeight;
    LBL.forEach(([id, at]) => {
      const b = labels[id]; if (!mode) { b.hidden = true; return; }
      v3.copy(at()).project(camera); const x = (v3.x + 1) / 2 * w, y = (1 - v3.y) / 2 * hh, vis = v3.z < 1 && x > -40 && x < w + 40 && y > -20 && y < hh + 20;
      b.hidden = !vis; if (vis) b.style.transform = `translate(${x}px,${y}px)`;
      b.classList.toggle("hint", id === selDev);
    });
  }
  refresh3D(); K.shadows(scene); floor.castShadow = false; glass.castShadow = false;
  raf = requestAnimationFrame(frame);
  paintLeft(); paintRight(); chooseMode();
  hud({ progress: `Nhiệm vụ <b>0/${TASKS.length}</b>`, score: null });
  return () => { alive = false; cancelAnimationFrame(raf); ts.forEach(clearTimeout); K.dispose(); };
}
