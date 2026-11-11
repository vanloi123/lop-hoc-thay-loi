/* Bộ công cụ dùng chung cho các mô phỏng 3D: khởi tạo cảnh, vật liệu, texture vẽ bằng canvas,
   quạt khung vuông, hộp bo góc, dây cáp bọc lưới. Mọi thứ dựng bằng mã, không tải tệp ngoài. */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export { THREE };

/* số ngẫu nhiên có hạt giống: texture giống nhau mỗi lần mở */
export function rng(seed = 7) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function makeKit(container, { light = true, bg } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = light ? 1.05 : .95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg || (light ? "#e6eaf1" : "#141d18"));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environment = envTex; scene.environmentIntensity = light ? .85 : .6;
  const camera = new THREE.PerspectiveCamera(36, 1.6, 1, 800);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .12; controls.enablePan = false;
  scene.add(new THREE.HemisphereLight(0xffffff, light ? 0x8a93a6 : 0x1e2a24, light ? .55 : .45));
  const sun = new THREE.DirectionalLight(0xffffff, light ? 2.1 : 1.7);
  sun.position.set(70, 110, 60); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 300 });
  scene.add(sun);

  const disposables = [envTex, pmrem];
  const mats = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o, (key, v) => v && v.isTexture ? v.uuid : v); if (!mats.has(k)) { const m = new THREE.MeshStandardMaterial({ color: c, roughness: .55, metalness: .05, ...o }); mats.set(k, m); } return mats.get(k); };
  const tex = (w, h, draw, repeat) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); draw(x, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    disposables.push(t); return t;
  };
  /* hộp; m có thể là màu, vật liệu, hoặc mảng 6 vật liệu (+x,-x,+y,-y,+z,-z) */
  const box = (w, h, d, m, x, y, z, parent, o) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === "string" ? mat(m, o) : m); mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
  const rbox = (w, h, d, r, m, x, y, z, parent, o) => { const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), typeof m === "string" ? mat(m, o) : m); mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
  const cyl = (r, len, m, parent, o, seg = 28, r2) => { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r2 ?? r, len, seg), typeof m === "string" ? mat(m, o) : m); parent.add(mesh); return mesh; };
  /* mặt trên (+z) dán texture, các mặt còn lại một màu */
  const faceMats = (side, top, axis = "z", o = {}) => { const s = typeof side === "string" ? mat(side, o) : side; const arr = [s, s, s, s, s, s]; arr[{ x: 0, y: 2, z: 4, "-z": 5, "-x": 1, "-y": 3 }[axis]] = top; return arr; };
  const shapeMesh = (shape, depth, m, parent, o, bevel = 0) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 24 }); const mesh = new THREE.Mesh(g, typeof m === "string" ? mat(m, o) : m); parent.add(mesh); return mesh; };
  const rrect = (w, h, r) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };

  /* quạt khung vuông: khung nhựa có lỗ tròn, lỗ vít, 7 cánh cong nghiêng, trục giữa có tem */
  const fans = [];
  function fan(parent, size, opt = {}) {
    const { frame = "#15181d", blade = "#23272e", hubLabel = true } = opt;
    const g = new THREE.Group(); parent.add(g);
    const r = size * .465, depth = size * .2;
    const sh = rrect(size, size, size * .07); const hole = new THREE.Path(); hole.absarc(0, 0, r, 0, Math.PI * 2, true); sh.holes.push(hole);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { const p = new THREE.Path(); p.absarc(a * size * .41, b * size * .41, size * .03, 0, Math.PI * 2, true); sh.holes.push(p); });
    const fr = shapeMesh(sh, depth, frame, g, { roughness: .7 }); fr.position.z = -depth / 2;
    const hubR = r * .36;
    const hub = cyl(hubR, depth * .7, frame, g); hub.rotation.x = Math.PI / 2;
    if (hubLabel) { const lab = new THREE.Mesh(new THREE.CircleGeometry(hubR * .9, 28), mat("#ffffff", { map: tex(128, 128, (x, w) => { x.fillStyle = "#2a2f38"; x.fillRect(0, 0, w, w); x.strokeStyle = "#8b93a1"; x.lineWidth = 6; x.beginPath(); x.arc(64, 64, 44, 0, 7); x.stroke(); x.fillStyle = "#c7ccd5"; x.font = "bold 22px sans-serif"; x.textAlign = "center"; x.fillText("12V", 64, 72); }) })); lab.position.z = depth * .36; g.add(lab); }
    for (let k = 0; k < 4; k++) { const s = box(r * 1.95, size * .025, size * .03, frame, 0, 0, -depth * .45, g); s.rotation.z = k * Math.PI / 4 + Math.PI / 8; }
    const blades = new THREE.Group(); g.add(blades);
    const bs = new THREE.Shape(); bs.moveTo(hubR * .9, -size * .07); bs.quadraticCurveTo(r * .62, -size * .14, r * .97, -size * .015); bs.quadraticCurveTo(r * .78, size * .12, hubR * .9, size * .075); bs.closePath();
    const bgeo = new THREE.ExtrudeGeometry(bs, { depth: size * .012, bevelEnabled: false, curveSegments: 14 });
    for (let k = 0; k < 7; k++) { const w = new THREE.Group(); w.rotation.z = k / 7 * Math.PI * 2; const b = new THREE.Mesh(bgeo, mat(blade, { roughness: .45, side: THREE.DoubleSide })); b.rotation.x = .42; w.add(b); blades.add(w); }
    fans.push(blades); return g;
  }
  /* dây cáp bọc lưới (sọc chéo) theo đường cong */
  const braid = tex(64, 64, (x, w) => { x.fillStyle = "#121418"; x.fillRect(0, 0, w, w); x.strokeStyle = "#2b3038"; x.lineWidth = 6; for (let i = -64; i < 128; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 64, 64); x.stroke(); } }, [1, 30]);
  function cable(points, r, color) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => p.isVector3 ? p : new THREE.Vector3(...p)));
    const m = color ? mat(color, { roughness: .6 }) : mat("#ffffff", { map: braid, roughness: .8 });
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, r, 12, false), m); mesh.castShadow = true; return mesh;
  }
  /* nhãn dán: chữ trên nền */
  function label(w, h, lines, { bg = "#f4f5f7", fg = "#1b1f27", accent, border } = {}) {
    return tex(w, h, (x) => {
      x.fillStyle = bg; x.fillRect(0, 0, w, h);
      if (accent) { x.fillStyle = accent; x.fillRect(0, 0, w, h * .14); }
      if (border) { x.strokeStyle = border; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, h - 12); }
      lines.forEach(([t, size, y, weight = "bold", color = fg, align = "left", xx]) => { x.fillStyle = color; x.font = `${weight} ${size}px "Be Vietnam Pro", system-ui, sans-serif`; x.textAlign = align; x.fillText(t, xx ?? (align === "center" ? w / 2 : w * .07), y); });
    });
  }
  function shadows(root) { root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
  function resize() { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(container);
  function dispose() {
    ro.disconnect(); controls.dispose();
    scene.traverse(o => o.geometry?.dispose?.());
    mats.forEach(m => m.dispose()); disposables.forEach(d => d.dispose?.());
    renderer.dispose(); renderer.forceContextLoss?.(); renderer.domElement.remove();
  }
  return { THREE, renderer, scene, camera, controls, sun, mat, tex, box, rbox, cyl, faceMats, shapeMesh, rrect, fan, fans, cable, label, shadows, dispose };
}
