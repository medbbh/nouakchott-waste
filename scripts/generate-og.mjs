import sharp from 'sharp';

const W = 1200, H = 630;

// Dark overlay PNG via sharp create
const darkOverlay = await sharp({
  create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.72 } },
}).png().toBuffer();

// Orange bar
const orangeBar = await sharp({
  create: { width: 14, height: H, channels: 4, background: { r: 249, g: 115, b: 22, alpha: 1 } },
}).png().toBuffer();

const textSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <text x="80" y="185" font-family="Arial, sans-serif" font-size="30" font-weight="700"
    fill="#f97316" letter-spacing="3">0DECHETS.COM</text>
  <text x="80" y="300" font-family="Arial, sans-serif" font-size="82" font-weight="800"
    fill="white">Signalez les</text>
  <text x="80" y="395" font-family="Arial, sans-serif" font-size="82" font-weight="800"
    fill="white">dépôts sauvages</text>
  <rect x="80" y="440" width="400" height="68" rx="34" fill="#f97316"/>
  <text x="280" y="484" font-family="Arial, sans-serif" font-size="30" font-weight="700"
    fill="white" text-anchor="middle">Signaler maintenant →</text>
</svg>`);

await sharp('public/map-bg.png')
  .resize(W, H, { fit: 'cover', position: 'centre' })
  .composite([
    { input: darkOverlay, blend: 'over' },
    { input: orangeBar, blend: 'over', left: 0, top: 0 },
    { input: textSvg, blend: 'over' },
  ])
  .jpeg({ quality: 93 })
  .toFile('public/og-image.png');

console.log('og-image.png generated');
