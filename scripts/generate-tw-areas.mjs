// 產生鄉鎮市區資料：名稱清單（表單下拉用）與地圖座標（足跡亮點用）。
//
// 來源：g0v/twgeojson 的鄉鎮界線 GeoJSON（約 20MB，只在這支腳本裡用，不進 repo）。
// 座標的算法：先從 TaiwanMap.tsx 的 22 個縣市 path 反推每個縣市的形狀重心，
// 再跟 GeoJSON 算出的真實經緯度重心配對，用最小平方法擬合「經緯度 → SVG 座標」的
// 仿射轉換，最後把 368 個鄉鎮的重心投影進同一個 viewBox。
// 這樣亮點不需要任何 GPS 或 API：拿到鄉鎮名字就能查到它在地圖上的位置。
//
// 執行：node scripts/generate-tw-areas.mjs
// 產出：src/lib/twAreas.ts（名稱）、src/lib/twTownPoints.ts（座標）

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const SRC_URL = 'https://raw.githubusercontent.com/g0v/twgeojson/master/json/twTown1982.geo.json';
const ROOT = path.resolve(import.meta.dirname, '..');
const MAP_TSX = path.join(ROOT, 'src/components/TaiwanMap.tsx');
const CACHE = path.join(os.tmpdir(), 'twTown1982.geo.json');

// 這 9 個是直轄市與省轄市，底下一律叫「區」。GeoJSON 是 2014 桃園升格前的版本，
// 桃園底下還是中壢市／龍潭鄉這種舊名（邊界沒變，只有名稱與後綴要換）。
const CITY_LIKE = new Set([
  '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市',
  '基隆市', '新竹市', '嘉義市',
]);

// ---------- 幾何 ----------

// 只支援 TaiwanMap.tsx 實際用到的指令：M m L l H h V v Z z
function pathToPolys(d) {
  const toks = d.match(/[MmLlHhVvZz]|-?\d*\.?\d+/g);
  const polys = [];
  let cur = null, x = 0, y = 0, cmd = null, i = 0;
  const num = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    if (/[MmLlHhVvZz]/.test(toks[i])) cmd = toks[i++];
    if (cmd === 'M' || cmd === 'm') {
      const nx = num(), ny = num();
      x = cmd === 'M' ? nx : x + nx;
      y = cmd === 'M' ? ny : y + ny;
      if (cur && cur.length > 2) polys.push(cur);
      cur = [[x, y]];
      cmd = cmd === 'M' ? 'L' : 'l'; // M 之後的隱含指令是 L
    } else if (cmd === 'L' || cmd === 'l') {
      const nx = num(), ny = num();
      x = cmd === 'L' ? nx : x + nx;
      y = cmd === 'L' ? ny : y + ny;
      cur.push([x, y]);
    } else if (cmd === 'H' || cmd === 'h') {
      const nx = num(); x = cmd === 'H' ? nx : x + nx; cur.push([x, y]);
    } else if (cmd === 'V' || cmd === 'v') {
      const ny = num(); y = cmd === 'V' ? ny : y + ny; cur.push([x, y]);
    } else if (cmd === 'Z' || cmd === 'z') {
      if (cur && cur.length > 2) polys.push(cur);
      cur = null;
    } else i++;
  }
  if (cur && cur.length > 2) polys.push(cur);
  return polys;
}

// 面積加權重心（shoelace）。多個子多邊形時，帶洞或離島會自然被面積權重稀釋。
function centroid(polys) {
  let A = 0, cx = 0, cy = 0;
  for (const p of polys) {
    let a = 0, x0 = 0, y0 = 0;
    for (let k = 0; k < p.length; k++) {
      const [x1, y1] = p[k];
      const [x2, y2] = p[(k + 1) % p.length];
      const cr = x1 * y2 - x2 * y1;
      a += cr; x0 += (x1 + x2) * cr; y0 += (y1 + y2) * cr;
    }
    a /= 2;
    if (Math.abs(a) < 1e-12) continue;
    A += a; cx += x0 / 6; cy += y0 / 6;
  }
  return A === 0 ? null : [cx / A, cy / A];
}

function inPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

const inAny = (pt, polys) => polys.some(p => inPoly(pt, p));

// 3x3 高斯消去
function solve3(M, b) {
  const A = M.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k <= 3; k++) A[r][k] -= f * A[c][k];
    }
  }
  return A.map((r, i) => r[3] / r[i]);
}

// ---------- 名稱正規化 ----------

// `安平區(海)`、`梧棲鎮(海區` 這種是海域／海埔地的獨立多邊形，要併回本體而不是各列一筆。
// 併回去之後再把舊制的鄉／鎮／市後綴換成區（只對直轄市與省轄市）。
function normalizeTown(county, rawName) {
  const base = rawName.split('(')[0].trim();
  if (!CITY_LIKE.has(county)) return base;
  return base.replace(/[鄉鎮市]$/, '區');
}

const normalizeCounty = c => (c === '桃園縣' ? '桃園市' : c);

// 2014 之後才改的名稱（來源資料仍是舊制）。邊界沒變，只換名字。
const RENAMES = {
  '彰化縣/員林鎮': '員林市', // 2015-08 升格為縣轄市
  '苗栗縣/頭份鎮': '頭份市', // 2015-10 升格為縣轄市
};

// 來源資料把高雄的兩個「三民」併成同一筆：市區的三民區，跟山上的舊三民鄉（今那瑪夏區）。
// 用同一個 repo 的村里檔（twVillage1982）驗證過：這 91 個里分成兩群，
// 民族里／民權里／民生里（120.68~120.74E、23.21~23.31N）是那瑪夏，其餘 88 個里是市區。
// 這裡直接用兩群各自的面積加權重心覆蓋掉合併後的錯誤重心。
const SPLIT_OVERRIDES = {
  '高雄市/三民區': [
    { town: '三民區', lng: 120.317943, lat: 22.649940 },
    { town: '那瑪夏區', lng: 120.721090, lat: 23.263372 },
  ],
};

// 來源資料沒有金門縣烏坵鄉（實際由金門代管、位置遠在馬祖與台灣之間），這裡也就不會有。

// ---------- 主流程 ----------

async function loadGeoJson() {
  if (fs.existsSync(CACHE)) {
    console.log(`使用快取：${CACHE}`);
    return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  }
  console.log(`下載 ${SRC_URL} …`);
  const res = await fetch(SRC_URL);
  if (!res.ok) throw new Error(`下載失敗：HTTP ${res.status}`);
  const text = await res.text();
  fs.writeFileSync(CACHE, text);
  console.log(`已快取到 ${CACHE}（${(text.length / 1024 / 1024).toFixed(1)} MB）`);
  return JSON.parse(text);
}

const geo = await loadGeoJson();

// 縣市的 SVG 形狀
const tsx = fs.readFileSync(MAP_TSX, 'utf8');
const svgPolys = {};
for (const m of tsx.matchAll(/name: '([^']+)', d: '([^']+)'/g)) {
  svgPolys[m[1]] = pathToPolys(m[2]);
}
const svgCentroid = {};
for (const [name, polys] of Object.entries(svgPolys)) svgCentroid[name] = centroid(polys);
console.log(`從 TaiwanMap.tsx 讀到 ${Object.keys(svgPolys).length} 個縣市 path`);

// 鄉鎮的經緯度環（同名的併在一起，海域多邊形自然併回本體）
const townRings = new Map();   // "縣市/鄉鎮" → 環陣列
const countyRings = new Map(); // "縣市" → 環陣列
for (const f of geo.features) {
  const county = normalizeCounty(f.properties.COUNTYNAME);
  const town = normalizeTown(county, f.properties.TOWNNAME);
  const g = f.geometry;
  const rings = g.type === 'Polygon' ? g.coordinates : g.coordinates.flat();
  const key = `${county}/${town}`;
  if (!townRings.has(key)) townRings.set(key, []);
  townRings.get(key).push(...rings);
  if (!countyRings.has(county)) countyRings.set(county, []);
  countyRings.get(county).push(...rings);
}
console.log(`GeoJSON ${geo.features.length} 筆多邊形 → 正規化後 ${townRings.size} 個鄉鎮市區`);

// 擬合經緯度 → SVG 座標（本島縣市當校正點；離島形狀小、重心誤差大，不拿來校正）
const ISLANDS = new Set(['澎湖縣', '金門縣', '連江縣']);
const geoCentroid = {};
for (const [county, rings] of countyRings) geoCentroid[county] = centroid(rings);
const calib = [...countyRings.keys()].filter(c => svgCentroid[c] && !ISLANDS.has(c));

function fitAxis(axis) {
  const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const v = [0, 0, 0];
  for (const c of calib) {
    const [lng, lat] = geoCentroid[c];
    const target = axis === 'x' ? svgCentroid[c][0] : svgCentroid[c][1];
    const row = [lng, lat, 1];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) M[i][j] += row[i] * row[j];
      v[i] += row[i] * target;
    }
  }
  return solve3(M, v);
}
const fx = fitAxis('x');
const fy = fitAxis('y');
const project = (lng, lat) => [
  fx[0] * lng + fx[1] * lat + fx[2],
  fy[0] * lng + fy[1] * lat + fy[2],
];

const residuals = calib.map(c => {
  const [px, py] = project(...geoCentroid[c]);
  return Math.hypot(px - svgCentroid[c][0], py - svgCentroid[c][1]);
});
console.log(
  `仿射校正：${calib.length} 個本島縣市，` +
  `平均誤差 ${(residuals.reduce((a, b) => a + b, 0) / residuals.length).toFixed(1)} px、` +
  `最大 ${Math.max(...residuals).toFixed(1)} px`
);

// 投影每個鄉鎮，落在自己縣市形狀外的（離島、被簡化吃掉的迷你行政區）往形狀內拉。
// 作法：朝縣市重心逐步靠近，找到第一個落在形狀內的位置。
function clampInto(pt, county) {
  const polys = svgPolys[county];
  if (!polys || inAny(pt, polys)) return { pt, clamped: false };
  const target = svgCentroid[county];
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const cand = [pt[0] + (target[0] - pt[0]) * t, pt[1] + (target[1] - pt[1]) * t];
    if (inAny(cand, polys)) return { pt: cand, clamped: true };
  }
  return { pt: target, clamped: true }; // 極端情況才會走到這：直接用縣市重心
}

const townsByCounty = {};
const pointsByCounty = {};
let clampedCount = 0;
for (const [key, rings] of [...townRings].sort(([a], [b]) => a.localeCompare(b, 'zh-TW'))) {
  const [county] = key.split('/');

  // 一筆來源資料通常對到一個鄉鎮；被合併的（三民／那瑪夏）要拆成兩個
  let entries;
  if (SPLIT_OVERRIDES[key]) {
    entries = SPLIT_OVERRIDES[key].map(o => ({ town: o.town, lnglat: [o.lng, o.lat] }));
  } else {
    const c = centroid(rings);
    if (!c) { console.warn(`  ⚠ ${key} 算不出重心，略過`); continue; }
    entries = [{ town: RENAMES[key] ?? key.split('/')[1], lnglat: c }];
  }

  for (const { town, lnglat } of entries) {
    const { pt, clamped } = clampInto(project(...lnglat), county);
    if (clamped) clampedCount++;
    (townsByCounty[county] ??= []).push(town);
    (pointsByCounty[county] ??= {})[town] = [
      Math.round(pt[0] * 10) / 10,
      Math.round(pt[1] * 10) / 10,
    ];
  }
}
for (const list of Object.values(townsByCounty)) list.sort((a, b) => a.localeCompare(b, 'zh-TW'));

console.log(`落在縣市形狀外、已往內修正的：${clampedCount} 個`);
console.log('\n各縣市鄉鎮數：');
for (const [c, list] of Object.entries(townsByCounty).sort()) {
  console.log(`  ${c.padEnd(4)} ${String(list.length).padStart(2)}  ${list.join(' ')}`);
}
const total = Object.values(townsByCounty).reduce((n, l) => n + l.length, 0);
console.log(`\n合計 ${total} 個鄉鎮市區`);

// ---------- 寫檔 ----------

const HEADER = (what, extra = '') =>
  `// 由 scripts/generate-tw-areas.mjs 產生，請勿手動編輯。\n` +
  `// ${what}\n` +
  `// 來源：g0v/twgeojson 鄉鎮界線（2014 桃園升格前的版本，邊界未變、名稱已正規化為現制）。\n` +
  (extra ? `// ${extra}\n` : '');

const areasTs =
  HEADER('鄉鎮市區名稱，依縣市分組（表單下拉用）。') +
  `\nexport const TOWNS_BY_COUNTY: Record<string, string[]> = ${JSON.stringify(townsByCounty, null, 2)};\n`;

const pointsTs =
  HEADER(
    '鄉鎮市區在台灣地圖上的座標（足跡亮點用）。',
    `座標系是 TaiwanMap.tsx 的 viewBox 0 0 1000 1295，由經緯度仿射轉換而來（本島平均誤差 ${(residuals.reduce((a, b) => a + b, 0) / residuals.length).toFixed(1)} px）。`
  ) +
  `\nexport const TOWN_POINTS: Record<string, Record<string, [number, number]>> = ${JSON.stringify(pointsByCounty, null, 2)};\n`;

fs.writeFileSync(path.join(ROOT, 'src/lib/twAreas.ts'), areasTs);
fs.writeFileSync(path.join(ROOT, 'src/lib/twTownPoints.ts'), pointsTs);
console.log(`\n已寫入 src/lib/twAreas.ts（${(areasTs.length / 1024).toFixed(1)} KB）`);
console.log(`已寫入 src/lib/twTownPoints.ts（${(pointsTs.length / 1024).toFixed(1)} KB）`);
