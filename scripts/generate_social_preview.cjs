const fs = require("node:fs");
const path = require("node:path");
const sharp = require("C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");

const root = path.resolve(__dirname, "..");
const logo = fs.readFileSync(path.join(root, "assets/brand/px-icon.svg"));
const card = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#102a43"/>
      <stop offset="0.58" stop-color="#0b3853"/>
      <stop offset="1" stop-color="#061d33"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#24cdd4"/>
      <stop offset="1" stop-color="#59d8e2"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#001525" flood-opacity=".45"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#background)"/>
  <circle cx="1090" cy="-50" r="360" fill="none" stroke="#72dfe7" stroke-opacity=".08" stroke-width="2"/>
  <circle cx="1090" cy="-50" r="270" fill="none" stroke="#72dfe7" stroke-opacity=".06" stroke-width="2"/>
  <path d="M0 535C210 465 375 550 600 510s355-145 600-45v165H0Z" fill="#061d33" fill-opacity=".38"/>
  <rect x="90" y="311" width="92" height="7" rx="3.5" fill="url(#accent)"/>
  <text x="90" y="410" fill="#ffffff" font-family="Noto Sans TC, Microsoft JhengHei, Arial, sans-serif" font-size="64" font-weight="700" letter-spacing="1">PX 通路工作台</text>
  <text x="90" y="472" fill="#bee4e9" font-family="Noto Sans TC, Microsoft JhengHei, Arial, sans-serif" font-size="27" font-weight="400">毛利試算｜回推售價｜PX 商品資料｜實銷分析</text>
  <text x="90" y="548" fill="#7db7c1" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="3">PX BUSINESS WORKSPACE</text>
</svg>`);

async function main() {
  const logoPng = await sharp(logo).resize(144, 144, { fit: "contain" }).png().toBuffer();
  await sharp(card)
    .composite([{ input: logoPng, left: 90, top: 105 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, "social-preview.png"));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
