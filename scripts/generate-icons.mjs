import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

// 主 icon：黑底 + 金色「食」字（含內外圈）
const iconSvg = (size = 1024) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0a0a0a"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.42}" fill="none" stroke="#c9a961" stroke-width="${size*0.006}" opacity="0.35"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.40}" fill="none" stroke="#c9a961" stroke-width="${size*0.003}" opacity="0.6"/>
  <text x="${size/2}" y="${size*0.66}" font-family="'Noto Serif TC','Songti TC','Source Han Serif TC',serif" font-size="${size*0.55}" font-weight="500" fill="#c9a961" text-anchor="middle">食</text>
  <text x="${size/2}" y="${size*0.85}" font-family="sans-serif" font-size="${size*0.05}" letter-spacing="${size*0.015}" fill="#c9a961" opacity="0.6" text-anchor="middle">WANT TO EAT</text>
</svg>`;

// maskable icon：留 safe-area，外圍多留空間
const maskableSvg = (size = 512) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0a0a0a"/>
  <text x="${size/2}" y="${size*0.62}" font-family="'Noto Serif TC','Songti TC',serif" font-size="${size*0.40}" font-weight="500" fill="#c9a961" text-anchor="middle">食</text>
</svg>`;

const tasks = [
  { svg: iconSvg(1024), size: 192, name: 'icon-192.png' },
  { svg: iconSvg(1024), size: 512, name: 'icon-512.png' },
  { svg: iconSvg(1024), size: 180, name: 'apple-touch-icon.png' },
  { svg: iconSvg(1024), size: 32,  name: 'favicon-32.png' },
  { svg: iconSvg(1024), size: 16,  name: 'favicon-16.png' },
  { svg: maskableSvg(512), size: 512, name: 'icon-maskable-512.png' },
];

for (const { svg, size, name } of tasks) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, name));
  console.log(`✓ ${name} (${size}x${size})`);
}

// favicon.svg 同步輸出一份
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), iconSvg(64));
console.log('✓ favicon.svg');

console.log('\nDone.');
