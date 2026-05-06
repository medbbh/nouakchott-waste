import sharp from 'sharp';

// ── LinkedIn Logo (300×300) — square corners (no rx) ────────────────────────
const logoSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#f97316"/>
  <g transform="translate(256, 256) scale(12.5) translate(-12, -12)" stroke="white" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.25 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" fill="white" fill-opacity="0.25"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </g>
</svg>`);

await sharp(logoSvg)
  .resize(300, 300)
  .png()
  .toFile('public/linkedin-logo.png');

console.log('✓ linkedin-logo.png (300×300)');

// ── LinkedIn Cover (1128×191) ────────────────────────────────────────────────
const W = 1128, H = 191;

const darkOverlay = await sharp({
  create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.72 } },
}).png().toBuffer();

const accentBar = await sharp({
  create: { width: 8, height: H, channels: 4, background: { r: 249, g: 115, b: 22, alpha: 1 } },
}).png().toBuffer();

// Leaf icon SVG embedded inline, scaled to ~44px at left
const leafSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#f97316" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.25 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" fill="#f97316" fill-opacity="0.25"/>
  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
</svg>`;

const textSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <!-- Leaf icon at 40,74 (centered in 44px height) -->
  <image href="data:image/svg+xml;base64,${Buffer.from(leafSvg).toString('base64')}" x="40" y="74" width="44" height="44"/>

  <!-- Brand name -->
  <text x="96" y="108" font-family="Arial, sans-serif" font-size="42" font-weight="800"
    fill="white">0Déchets</text>

  <!-- Tagline -->
  <text x="40" y="148" font-family="Arial, sans-serif" font-size="20" font-weight="400"
    fill="#d1d5db">Signalez les dépôts sauvages en Mauritanie</text>

  <!-- URL — right side -->
  <text x="${W - 40}" y="108" font-family="Arial, sans-serif" font-size="22" font-weight="700"
    fill="#f97316" text-anchor="end">0dechets.com</text>

  <!-- CTA pill outline -->
  <rect x="${W - 260}" y="120" width="220" height="44" rx="22"
    fill="none" stroke="#f97316" stroke-width="2"/>
  <text x="${W - 150}" y="148" font-family="Arial, sans-serif" font-size="18" font-weight="700"
    fill="#f97316" text-anchor="middle">Signaler maintenant →</text>
</svg>`);

await sharp('public/map-bg.png')
  .resize(W, H, { fit: 'cover', position: 'centre' })
  .composite([
    { input: darkOverlay, blend: 'over' },
    { input: accentBar, blend: 'over', left: 0, top: 0 },
    { input: textSvg, blend: 'over' },
  ])
  .png({ quality: 95 })
  .toFile('public/linkedin-cover.png');

console.log('✓ linkedin-cover.png (1128×191)');
