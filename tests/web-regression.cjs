const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve(__dirname, "..");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  if (pathname === "/favicon.ico") {
    response.writeHead(204).end();
    return;
  }
  const target = path.resolve(root, pathname === "/" ? "index.html" : `.${pathname}`);
  if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream" });
  fs.createReadStream(target).pipe(response);
});

async function main() {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.addInitScript(() => localStorage.clear());
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: "networkidle" });

  assert.equal(await page.evaluate(() => eval("PX_Q3_PRODUCTS.length")), 54, "product master count");
  assert.equal(await page.evaluate(() => Object.keys(window.PX_SALES_DATA).length), 53, "validated mapping count");
  assert.equal(await page.evaluate(() => window.PX_SALES_PERIODS.length), 21, "period count");
  const staticHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.equal((staticHtml.match(/全聯毛利率（前毛）/g) || []).length, 9, "PX margin label coverage");
  assert.doesNotMatch(staticHtml, />全聯毛利率</, "legacy PX margin label removed");
  const replacementSource = fs.readFileSync(path.join(root, "px-replacement-data.js"), "utf8");
  assert.doesNotMatch(replacementSource, /摺疊保鮮盒/, "excluded folding containers");
  assert.equal(await page.evaluate(() => Object.keys(window.PX_HISTORICAL_PRODUCTS).length), 3, "historical product count");
  assert.equal(await page.evaluate(() => window.PRODUCT_REPLACEMENT_MAPPING.length), 2, "replacement group count");
  const replacementModel = await page.evaluate(() => ({
    historical: Object.values(window.PX_HISTORICAL_PRODUCTS).map(product => ({ name: product.name, status: product.status, cost: product.cost })),
    activeNames: window.PRODUCT_REPLACEMENT_MAPPING.flatMap(group => group.activeProductNames),
    oldIds: window.PRODUCT_REPLACEMENT_MAPPING.flatMap(group => group.oldProductIds),
    historicalIds: Object.keys(window.PX_HISTORICAL_PRODUCTS),
    activeMasterNames: eval("PX_Q3_PRODUCTS.map(product => product.name)"),
  }));
  assert.ok(replacementModel.historical.every(product => product.status === "DISCONTINUED" && product.cost === null), "historical products have no inferred cost");
  assert.ok(replacementModel.activeNames.every(name => replacementModel.activeMasterNames.filter(item => item === name).length === 1), "active replacements uniquely exist in product master");
  assert.ok(replacementModel.oldIds.every(id => replacementModel.historicalIds.includes(id)), "all mapped historical IDs exist");
  assert.ok(replacementModel.historical.every(product => !replacementModel.activeMasterNames.includes(product.name)), "historical products excluded from active master");
  const auditRows = fs.readFileSync(path.join(root, "PX_SALES_MAPPING_AUDIT.csv"), "utf8").trim().split(/\r?\n/).slice(1);
  assert.equal(auditRows.length, 58, "complete source audit count");
  assert.equal(auditRows.filter(row => row.includes(",MATCHED,MATCHED,")).length, 48, "initial matched count");
  assert.equal(auditRows.filter(row => row.includes(",UNMATCHED,UNMATCHED,")).length, 5, "initial unmatched count");
  assert.equal(auditRows.filter(row => row.includes(",CONFLICT,MATCHED,")).length, 5, "manual mapping count");

  await page.locator("#cProduct").fill("鋁箔");
  assert.equal(await page.locator("#cProductOptions .product-option").count(), 2, "name search");
  await page.locator("#cProduct").fill("65010209");
  assert.equal(await page.locator("#cProduct").inputValue(), "OP無雙酚A鋁箔800公分-12入", "code search selection");
  assert.equal(await page.locator("#cCost").inputValue(), "25.22", "auto cost fill");
  assert.equal(await page.locator("#cPx").inputValue(), "24.68", "supplemental margin does not overwrite calculator input");
  assert.match(await page.locator("#cProductInfo").innerText(), /26\.18%/);
  assert.match(await page.locator("#cProductInfo").innerText(), /全聯毛利率（前毛）/);
  assert.match(await page.locator("#cProductInfo").innerText(), /越庫/);
  assert.match(await page.locator("#cProductInfo").innerText(), /99%/);
  assert.match(await page.locator("#cProductInfo").innerText(), /1,271 店/);
  assert.match(await page.locator("#cSalesPerformance").innerText(), /2024\/12/);
  assert.match(await page.locator("#cSalesPerformance").innerText(), /10,073/);
  assert.match(await page.locator("#cSalesPerformance").innerText(), /▲ 34\.4%/);
  assert.equal(await page.locator("#cSalesPerformance .month-row").count(), 21, "full month expansion data");
  assert.ok(await page.locator("#cSalesPerformance .trend-line").getAttribute("d"), "trend path");

  await page.locator("#cCost").fill("24.50");
  assert.match(await page.locator("#cProductInfo").innerText(), /\$24\.50/);
  await page.locator("#cProduct").fill("4710660886567");
  assert.equal(await page.locator("#cProduct").inputValue(), "OP無雙酚A鋁箔1500公分-12入", "barcode search selection");
  assert.equal(await page.locator("#cCost").inputValue(), "40.02", "new product overwrites manual cost");

  await page.locator("#cProduct").fill("63020159");
  const newProductText = await page.locator("#cSalesPerformance").innerText();
  assert.match(newProductText, /上市月份\s*2026\/08/);
  assert.match(newProductText, /上市第 1 個月/);
  assert.match(newProductText, /上市至今月均銷/);
  assert.match(newProductText, /— 尚未上市/);
  assert.ok(Number(await page.locator("#cSalesPerformance .prelaunch-zone").getAttribute("width")) > 0, "pre-launch region");

  const zeroCases = await page.evaluate(() => {
    const postLaunchZero = Array(21).fill(null);
    postLaunchZero[18] = 100;
    postLaunchZero[19] = 0;
    postLaunchZero[20] = 200;
    const priorYearZero = Array(21).fill(10);
    priorYearZero[8] = 0;
    priorYearZero[20] = 200;
    return {
      average: window.__PX_ANALYTICS__.analyzePxSales({ sales: postLaunchZero, stores: 100 }).shortAverage,
      yoy: window.__PX_ANALYTICS__.analyzePxSales({ sales: priorYearZero, stores: 100 }).yoyText,
    };
  });
  assert.equal(zeroCases.average, 100, "post-launch zero is included in average");
  assert.equal(zeroCases.yoy, "— 去年同期為 0", "YoY zero guard");

  const replacementEffects = await page.evaluate(() => ({
    lowerMargin: window.__PX_ANALYTICS__.compareReplacementEffect("pxMargin", 0.285, 0.258),
    higherMargin: window.__PX_ANALYTICS__.compareReplacementEffect("pxMargin", 0.25, 0.275),
    flatMargin: window.__PX_ANALYTICS__.compareReplacementEffect("pxMargin", 0.25, 0.25),
    higherSales: window.__PX_ANALYTICS__.compareReplacementEffect("sales", 100, 120),
    lowerListingRate: window.__PX_ANALYTICS__.compareReplacementEffect("listingRate", 0.8, 0.7),
    higherListingRate: window.__PX_ANALYTICS__.compareReplacementEffect("listingRate", 0.82, 0.97),
    moreStores: window.__PX_ANALYTICS__.compareReplacementEffect("stores", 1050, 1240),
    zeroBase: window.__PX_ANALYTICS__.compareReplacementEffect("sales", 0, 100),
    missing: window.__PX_ANALYTICS__.compareReplacementEffect("pxMargin", NaN, 0.25),
    accumulating: window.__PX_ANALYTICS__.replacementStatus(4000, 5000, 2),
    plusFive: window.__PX_ANALYTICS__.replacementStatus(4000, 4200, 3),
    aboveFive: window.__PX_ANALYTICS__.replacementStatus(4000, 4204, 3),
    minusFive: window.__PX_ANALYTICS__.replacementStatus(4000, 3800, 3),
    belowFive: window.__PX_ANALYTICS__.replacementStatus(4000, 3796, 3),
    rules: window.__PX_ANALYTICS__.replacementEffectRules,
  }));
  assert.deepEqual(
    { changeText: replacementEffects.lowerMargin.changeText, effectText: replacementEffects.lowerMargin.effectText, tone: replacementEffects.lowerMargin.tone },
    { changeText: "▼ 2.7pt", effectText: "對 OP 有利", tone: "positive" },
    "lower PX margin is favorable to OP",
  );
  assert.deepEqual(
    { changeText: replacementEffects.higherMargin.changeText, effectText: replacementEffects.higherMargin.effectText, tone: replacementEffects.higherMargin.tone },
    { changeText: "▲ 2.5pt", effectText: "對 OP 不利", tone: "negative" },
    "higher PX margin is unfavorable to OP",
  );
  assert.deepEqual(
    { changeText: replacementEffects.flatMargin.changeText, effectText: replacementEffects.flatMargin.effectText, tone: replacementEffects.flatMargin.tone },
    { changeText: "— 0.0pt", effectText: "中性", tone: "neutral" },
    "flat PX margin is neutral",
  );
  assert.equal(replacementEffects.higherSales.tone, "positive", "higher sales is favorable");
  assert.equal(replacementEffects.lowerListingRate.tone, "negative", "lower listing rate is unfavorable");
  assert.equal(replacementEffects.higherSales.changeText, "▲ 20.0%", "sales uses relative change");
  assert.equal(replacementEffects.higherListingRate.changeText, "▲ 15.0pt", "listing rate uses percentage points");
  assert.equal(replacementEffects.moreStores.changeText, "▲ 190店", "store count uses absolute stores");
  assert.equal(replacementEffects.zeroBase.changeText, "—", "zero old sales guard");
  assert.equal(replacementEffects.missing.changeText, "—", "missing KPI guard");
  assert.equal(replacementEffects.accumulating.label, "資料累積中", "under three months status");
  assert.equal(replacementEffects.plusFive.label, "大致持平", "positive 5% boundary");
  assert.equal(replacementEffects.aboveFive.label, "優於舊品", "above positive 5% boundary");
  assert.equal(replacementEffects.minusFive.label, "大致持平", "negative 5% boundary");
  assert.equal(replacementEffects.belowFive.label, "低於舊品", "below negative 5% boundary");
  assert.equal(replacementEffects.rules.sales.direction, 1, "sales higher is better");
  assert.equal(replacementEffects.rules.perStore.direction, 1, "per-store sales higher is better");
  assert.equal(replacementEffects.rules.listingRate.direction, 1, "listing rate higher is better");
  assert.equal(replacementEffects.rules.stores.direction, 1, "stores higher is better");
  assert.equal(replacementEffects.rules.pxMargin.direction, -1, "front margin lower is better for OP");

  await page.locator("#cProduct").fill("OP植材抗菌保鮮膜300尺");
  const filmView = await page.evaluate(() => window.__PX_ANALYTICS__.buildReplacementView(window.PRODUCT_REPLACEMENT_MAPPING[0]));
  assert.equal(filmView.oldLastIndex, 10, "film old last month index");
  assert.equal(filmView.newFirstIndex, 11, "film new launch index");
  assert.equal(filmView.oldAverage, 4168, "film old last 3M average");
  assert.ok(Math.abs(filmView.newAverage - 3293.6666666667) < 1e-8, "film new latest 3M average");
  assert.equal(filmView.salesEffect.changeText, "▼ 21.0%", "film sales difference");
  assert.equal(filmView.status.label, "低於舊品", "film replacement status");
  const filmCard = page.locator("[data-replacement-id='cling-film-420-to-plant-300']");
  assert.match(await filmCard.innerText(), /舊品最後銷售\s*2025\/10/);
  assert.match(await filmCard.innerText(), /新品開始銷售\s*2025\/11/);
  assert.match(await filmCard.innerText(), /4,168\.0 → 3,293\.7/);
  assert.match(await filmCard.innerText(), /全聯毛利率（前毛）\s*— → 26\.68%/);
  assert.ok(await filmCard.locator(".replacement-old-line").getAttribute("d"), "film old timeline path");
  assert.ok(await filmCard.locator(".replacement-new-line").getAttribute("d"), "film new timeline path");
  assert.equal(await filmCard.locator(".replacement-new-dot").count(), 10, "film new timeline numeric points");
  assert.equal(await filmCard.locator(".replacement-marker-text").textContent(), "商品替換", "film replacement marker");

  await page.locator("#cProduct").fill("OP指尖強化手套-薰衣紫M");
  const gloveView = await page.evaluate(() => window.__PX_ANALYTICS__.buildReplacementView(window.PRODUCT_REPLACEMENT_MAPPING[1]));
  assert.equal(gloveView.oldLastIndex, 20, "glove old last month index");
  assert.equal(gloveView.newFirstIndex, 20, "glove new launch index");
  assert.ok(Math.abs(gloveView.oldAverage - 8741.6666666667) < 1e-8, "glove old series last 3M average");
  assert.equal(gloveView.newAverage, 7082, "glove new series launch average");
  assert.deepEqual(gloveView.oldSales.slice(-3), [12619, 11606, 2000], "glove M+L is summed by month before averaging");
  assert.equal(gloveView.newSales[20], 7082, "glove new M+L launch month total");
  assert.ok(gloveView.newSales.slice(0, 20).every(value => value === null), "glove pre-launch series months remain null");
  assert.equal(gloveView.salesEffect.changeText, "▼ 19.0%", "glove series sales difference");
  assert.equal(gloveView.status.label, "資料累積中", "glove accumulating status");
  assert.equal(gloveView.sizeViews.length, 2, "glove size-level rows");
  assert.ok(Math.abs(gloveView.sizeViews[0].oldPerStore - 1173 / 1263) < 1e-10, "old M per-store sales");
  assert.ok(Math.abs(gloveView.sizeViews[0].newPerStore - 4022 / 1242) < 1e-10, "new M per-store sales");
  assert.ok(Math.abs(gloveView.sizeViews[1].oldPerStore - 827 / 1243) < 1e-10, "old L per-store sales");
  assert.ok(Math.abs(gloveView.sizeViews[1].newPerStore - 3060 / 1242) < 1e-10, "new L per-store sales");
  const gloveCard = page.locator("[data-replacement-id='lemon-to-lavender-gloves']");
  assert.equal(await gloveCard.locator(".replacement-kpi").count(), 1, "series overview only aggregates sales");
  assert.equal(await gloveCard.locator(".replacement-size").count(), 2, "series size-level KPI cards");
  assert.match(await gloveCard.innerText(), /資料累積中・上市第 1 個月/);
  assert.match(await gloveCard.innerText(), /24\.68% → 26\.68%/);
  assert.match(await gloveCard.innerText(), /24\.69% → 26\.68%/);
  assert.doesNotMatch(await gloveCard.innerText(), /系列單店月銷/);
  assert.ok(await gloveCard.locator(".replacement-old-line").getAttribute("d"), "glove old series timeline path");
  assert.ok(await gloveCard.locator(".replacement-new-line").getAttribute("d"), "glove new series timeline path");
  assert.equal(await gloveCard.locator(".replacement-new-dot").count(), 1, "single-month new series remains visible as a point");

  await page.locator("#cProduct").fill("OP無雙酚A鋁箔800公分-12入");
  assert.equal(await page.locator(".replacement-card").count(), 0, "unrelated active product has no replacement card");

  const manualMappings = {
    "OP專科防臭袋S": 39,
    "OP專科防臭袋M": 38,
    "OP加長保護手套耐用強化 M": 51,
    "OP環保舒適手套-綠茶香氛S": 44,
    "OP細柔無砂海綿菜瓜布": 41,
  };
  for (const [productName, sourceRow] of Object.entries(manualMappings)) {
    await page.locator("#cProduct").fill(productName);
    assert.equal(await page.evaluate(name => window.PX_SALES_DATA[name].sourceRow, productName), sourceRow, `${productName} source row`);
    assert.equal(await page.evaluate(name => window.PX_SALES_DATA[name].matchMethod, productName), "manual_mapping", `${productName} method`);
    assert.doesNotMatch(await page.locator("#cSalesPerformance").innerText(), /尚無 PX 補充資料/, `${productName} PX data`);
  }

  await page.locator("#cProduct").fill("OP天然棉紗布(3片入)");
  assert.equal(await page.locator("#cCost").inputValue(), "22.66", "missing PX data keeps cost fill");
  assert.match(await page.locator("#cProductInfo").innerText(), /尚無 PX 補充資料/);
  assert.match(await page.locator("#cSalesPerformance").innerText(), /原毛利試算仍可正常使用/);
  assert.notEqual(await page.locator("#cMargin").innerText(), "—", "margin calculator still works");

  for (const tab of ["reverse", "scenario", "promo", "basis", "calc"]) {
    await page.locator(`.tab[data-tab='${tab}']`).click();
    assert.ok(await page.locator(`#${tab}`).evaluate(element => element.classList.contains("active")), `${tab} tab`);
  }
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  assert.ok(dimensions.scroll <= dimensions.client, `375px overflow: ${JSON.stringify(dimensions)}`);
  await page.setViewportSize({ width: 700, height: 900 });
  const desktopDimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  assert.ok(desktopDimensions.scroll <= desktopDimensions.client, `desktop overflow: ${JSON.stringify(desktopDimensions)}`);
  if (process.env.PX_SCREENSHOT) {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator("#cProduct").fill(process.env.PX_SCREENSHOT_PRODUCT || "65010209");
    await page.screenshot({ path: process.env.PX_SCREENSHOT, fullPage: true });
  }
  assert.equal(errors.length, 0, `browser errors: ${errors.join(" | ")}`);

  await browser.close();
  server.close();
  console.log("PASS web regression: products, search, costs, PX analytics, tabs, 375px, console");
}

main().catch(error => {
  server.close();
  console.error(error);
  process.exitCode = 1;
});
