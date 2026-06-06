import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

const SRC = process.argv[2] || 'C:/Users/ericy/Downloads/IMG_1890-removebg-preview.png';
const BG = { r: 10, g: 10, b: 10, alpha: 1 }; // #0a0a0a 黑底

// 把去背 logo 置中合成到黑色方形上
async function makeIcon(size, logoRatio, outName) {
  const logoSize = Math.round(size * logoRatio);
  const logo = await sharp(SRC)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, outName));

  console.log(`✓ ${outName} (${size}px, logo ${Math.round(logoRatio * 100)}%)`);
}

// 一般 icon：logo 佔滿一點
await makeIcon(192, 0.92, 'icon-192.png');
await makeIcon(512, 0.92, 'icon-512.png');
await makeIcon(180, 0.92, 'apple-touch-icon.png');
await makeIcon(32, 0.96, 'favicon-32.png');
await makeIcon(16, 0.98, 'favicon-16.png');

// maskable：留 safe area，logo 縮小避免被裁切
await makeIcon(512, 0.66, 'icon-maskable-512.png');

// favicon.svg：簡單包一張 png（瀏覽器分頁用）
const png32 = fs.readFileSync(path.join(publicDir, 'favicon-32.png')).toString('base64');
fs.writeFileSync(
  path.join(publicDir, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><image width="32" height="32" href="data:image/png;base64,${png32}"/></svg>`
);
console.log('✓ favicon.svg');

console.log('\nDone.');
