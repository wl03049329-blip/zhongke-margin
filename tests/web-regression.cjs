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
  await page.addInitScript(() => { if (!sessionStorage.getItem("px-regression-started")) { localStorage.clear(); sessionStorage.setItem("px-regression-started", "1"); } });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: "networkidle" });
  const cacheKeys = await page.evaluate(async () => { await navigator.serviceWorker.ready; return caches.keys(); });
  assert.deepEqual(cacheKeys, ["px-workbench-v4.1"], "Version 4.1 service worker cache is active");

  assert.equal(await page.evaluate(() => eval("PX_Q3_PRODUCTS.length")), 54, "product master count");
  assert.equal(await page.evaluate(() => Object.keys(window.PX_SALES_DATA).length), 53, "validated mapping count");
  assert.equal(await page.evaluate(() => window.PX_SALES_PERIODS.length), 21, "period count");
  const staticHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(staticHtml.includes("function model(price,cost,px,fee){const untaxed=price/1.05,ship=untaxed*(1-px),feeAmt=ship*fee,profit=ship-feeAmt-cost,margin=ship?profit/ship:NaN;return{price,untaxed,ship,feeAmt,profit,margin}}"), "margin model unchanged");
  assert.ok(staticHtml.includes("den=(1-fee-target)*(1-px),price=den>0?cost/den*1.05:NaN"), "reverse-price formula unchanged");
  assert.ok(staticHtml.includes("function promoAverage(type,a){if(type===\"bogo\")return a/2;if(type===\"half\")return a*.75;return a}"), "promotion formula unchanged");
  assert.ok((staticHtml.match(/全聯毛利率（前毛）/g) || []).length >= 9, "PX margin label coverage");
  assert.doesNotMatch(staticHtml, />全聯毛利率</, "legacy PX margin label removed");
  assert.match(staticHtml, /<title>PX 通路工作台<\/title>/, "site title");
  assert.match(staticHtml, /VERSION 4\.1/, "site version");
  assert.match(staticHtml, /開發者：弘昇/, "Chinese-first developer credit");
  assert.match(staticHtml, /Built by HS/, "secondary English developer credit");
  assert.match(staticHtml, /非官方系統/, "non-official disclaimer");
  assert.match(staticHtml, /assets\/brand\/px-logo\.svg/, "shared PX logo asset");
  assert.doesNotMatch(staticHtml, /src="op-logo\.png"/, "legacy OP logo not used");
  assert.doesNotMatch(staticHtml, />\s*(?:CHANNEL|WORKBENCH|ANALYTICS|INTELLIGENCE)\s*</i, "visible interface remains Chinese-first");
  assert.equal((staticHtml.match(/const MARGIN_THRESHOLDS=Object\.freeze\(\{excellentMin:40,targetMin:37,optimizeMin:33\}\)/g) || []).length, 1, "one centralized default threshold config");
  assert.deepEqual(await page.evaluate(() => MARGIN_THRESHOLDS), { excellentMin: 40, targetMin: 37, optimizeMin: 33 }, "central threshold config values");
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  assert.equal(manifest.name, "PX 通路工作台", "PWA name");
  assert.equal(manifest.short_name, "PX 工作台", "PWA short name");
  const serviceWorker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
  assert.match(serviceWorker, /const CACHE='px-workbench-v4\.1'/, "service worker cache version");
  for (const asset of ["assets/brand/px-logo.svg", "assets/brand/px-icon.svg", "favicon.png", "icon-192.png", "icon-512.png"]) assert.ok(fs.existsSync(path.join(root, asset)), `${asset} exists`);
  const logoSource = fs.readFileSync(path.join(root, "assets/brand/px-logo.svg"), "utf8");
  assert.doesNotMatch(logoSource, /CHANNEL|WORKBENCH|通路工作台|Built by|弘昇|<text[^>]*>[^<]+<\/text>/i, "logo contains only the PX lettermark");
  assert.match(logoSource, /viewBox="0 0 512 512"/, "reference-locked square logo viewBox");
  assert.match(logoSource, /x="113" y="376" width="286" height="20"/, "centered short cyan shelf line");
  const iconSource = fs.readFileSync(path.join(root, "assets/brand/px-icon.svg"), "utf8");
  assert.doesNotMatch(iconSource, /CHANNEL|WORKBENCH|通路工作台|Built by|弘昇/i, "icon contains only the PX lettermark");

  const defaultMarginStates = await page.evaluate(() => [40, 39.99, 37, 36.99, 33, 32.99, 0].map(value => marginState(value / 100).label));
  assert.deepEqual(defaultMarginStates, ["非常好", "達標", "達標", "待優化", "待優化", "偏低", "偏低"], "Version 4.1 margin boundaries");
  await page.locator("#thresholdSettings").evaluate(element => { element.open = true; });
  await page.locator("#excellentMargin").fill("42");
  await page.locator("#targetMargin").fill("38");
  await page.locator("#optimizeMargin").fill("34");
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("pxMarginThresholdsV41"))), { excellentMin: 42, targetMin: 38, optimizeMin: 34 }, "custom thresholds stored");
  await page.reload({ waitUntil: "networkidle" });
  assert.deepEqual(await page.evaluate(() => [document.querySelector("#excellentMargin").value, document.querySelector("#targetMargin").value, document.querySelector("#optimizeMargin").value]), ["42", "38", "34"], "custom thresholds persist after refresh");
  await page.locator("#thresholdSettings").evaluate(element => { element.open = true; });
  await page.locator("#resetThresholds").click();
  assert.deepEqual(await page.evaluate(() => [document.querySelector("#excellentMargin").value, document.querySelector("#targetMargin").value, document.querySelector("#optimizeMargin").value]), ["40", "37", "33"], "threshold reset defaults");
  await page.locator("#optimizeMargin").fill("37");
  assert.match(await page.locator("#thresholdError").textContent(), /待優化門檻必須低於達標門檻/, "invalid threshold order is rejected");
  assert.deepEqual(await page.evaluate(() => thresholdState), { excellentMin: 40, targetMin: 37, optimizeMin: 33 }, "invalid thresholds are not applied");
  await page.locator("#optimizeMargin").fill("33");

  const logoSizes = await page.evaluate(async () => {
    const results = [];
    for (const size of [16, 32, 64, 192, 512]) {
      const image = document.createElement("img");
      image.src = "assets/brand/px-icon.svg";
      image.alt = "";
      image.style.cssText = `position:fixed;left:-1000px;top:0;width:${size}px;height:${size}px`;
      document.body.appendChild(image);
      await image.decode();
      results.push({ size, width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight });
      image.remove();
    }
    return results;
  });
  assert.ok(logoSizes.every(item => item.width === item.size && item.height === item.size && item.naturalWidth === 512 && item.naturalHeight === 512), "PX icon stays square and readable at 16/32/64/192/512");
  const logoGeometry = await page.evaluate(async () => {
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-1000px;top:0;width:512px;height:512px";
    host.innerHTML = await fetch("assets/brand/px-logo.svg").then(response => response.text());
    document.body.appendChild(host);
    const box = selector => { const value = host.querySelector(selector).getBBox(); return { x: value.x, y: value.y, width: value.width, height: value.height }; };
    const result = { p: box(".letter-p"), x: box(".letter-x"), shelf: box(".shelf") };
    host.remove();
    return result;
  });
  assert.equal(logoGeometry.p.height, logoGeometry.x.height, "P and X have equal visual height");
  assert.ok(logoGeometry.p.width / logoGeometry.x.width >= 0.75 && logoGeometry.p.width / logoGeometry.x.width <= 0.85, "P and X follow the reference width balance");
  assert.equal(logoGeometry.shelf.x + logoGeometry.shelf.width / 2, 256, "short shelf line is centered");
  assert.ok(logoGeometry.shelf.width < logoGeometry.x.width + logoGeometry.p.width, "shelf line remains shorter than the lettermark");
  const headerBrand = await page.locator(".brand-logo").evaluate(async image => { await image.decode(); const rect = image.getBoundingClientRect(); return { complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, renderedRatio: rect.width / rect.height }; });
  assert.deepEqual({ complete: headerBrand.complete, naturalWidth: headerBrand.naturalWidth, naturalHeight: headerBrand.naturalHeight }, { complete: true, naturalWidth: 512, naturalHeight: 512 }, "header logo loads without cropping");
  assert.ok(Math.abs(headerBrand.renderedRatio - 1) < 0.01, "header logo keeps square reference proportions");
  const visualLanguage = await page.evaluate(() => ({ editable: getComputedStyle(document.querySelector("#cPrice")).backgroundColor, fixed: getComputedStyle(document.querySelector("#cPx")).backgroundColor, watermarkOpacity: parseFloat(getComputedStyle(document.querySelector(".hero"), "::after").opacity) }));
  assert.notEqual(visualLanguage.editable, visualLanguage.fixed, "read-only and editable fields are visually distinct");
  assert.ok(visualLanguage.watermarkOpacity >= 0.04 && visualLanguage.watermarkOpacity <= 0.08, "HS watermark remains subtle");
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
  assert.equal(await page.evaluate(() => Object.values(window.PX_SALES_DATA).filter(product => Number.isFinite(product.pxMargin)).length), 53, "53 mapped products have source front margin");
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
  assert.equal(await page.locator("#cPx").textContent(), "26.18%", "Excel front margin is fixed product metadata");
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

  const fixedFrontMargin = await page.locator("#cPx").textContent();
  await page.locator("#cPrice").fill("129");
  await page.locator("#cCost").fill("24.50");
  assert.equal(await page.locator("#cPx").textContent(), fixedFrontMargin, "front margin does not follow price or cost override");
  assert.match(await page.evaluate(() => buildCalcResultText()), /全聯毛利率（前毛）：26\.18%/, "copied result uses fixed front margin");

  assert.match(await page.locator("#cProductInfo").innerText(), /\$24\.50/);
  await page.locator("#cProduct").fill("4710660886567");
  assert.equal(await page.locator("#cProduct").inputValue(), "OP無雙酚A鋁箔1500公分-12入", "barcode search selection");
  assert.equal(await page.locator("#cCost").inputValue(), "40.02", "new product overwrites manual cost");

  await page.locator("#cProduct").fill("63020159");
  const newProductText = await page.locator("#cSalesPerformance").innerText();
  assert.match(newProductText, /實銷資料起始\s*2026\/08/);
  assert.match(newProductText, /資料起始至今月均銷/);
  assert.match(newProductText, /尚無資料/);
  assert.doesNotMatch(newProductText, /上市月份|上市月齡|上市第/);
  assert.ok(Number(await page.locator("#cSalesPerformance .prelaunch-zone").getAttribute("width")) > 0, "pre-data region");

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
  assert.deepEqual(filmView.oldBaselineIndexes, [8, 9, 10], "film baseline months are before launch");
  assert.ok(Math.abs(filmView.newAverage - 3293.6666666667) < 1e-8, "film new latest 3M average");
  assert.equal(filmView.salesEffect.changeText, "▼ 21.0%", "film sales difference");
  assert.equal(filmView.status.label, "低於舊品", "film replacement status");
  const filmCard = page.locator("[data-replacement-id='cling-film-420-to-plant-300']");
  assert.match(await filmCard.innerText(), /新品導入\s*2025\/11/);
  assert.match(await filmCard.innerText(), /舊品替代前基準\s*4,168\.0/);
  assert.match(await filmCard.innerText(), /新品近 3 月均銷\s*3,293\.7/);
  assert.match(await filmCard.innerText(), /替代效益\s*▼ 21\.0%/);
  assert.doesNotMatch(await filmCard.innerText(), /商業條件|全聯毛利率（前毛）|對 OP 有利|對 OP 不利/);
  assert.doesNotMatch(await filmCard.innerText(), /舊品.*單店月銷|單店月銷.*→/);
  assert.ok(await filmCard.locator(".replacement-old-line").getAttribute("d"), "film old timeline path");
  assert.ok(await filmCard.locator(".replacement-new-line").getAttribute("d"), "film new timeline path");
  assert.equal(await filmCard.locator(".replacement-new-dot").count(), 10, "film new timeline numeric points");
  assert.equal(await filmCard.locator(".replacement-marker-text").textContent(), "商品替換", "film replacement marker");

  await page.locator("#cProduct").fill("OP指尖強化手套-薰衣紫M");
  const gloveView = await page.evaluate(() => window.__PX_ANALYTICS__.buildReplacementView(window.PRODUCT_REPLACEMENT_MAPPING[1]));
  assert.equal(gloveView.oldLastIndex, 20, "glove old last month index");
  assert.equal(gloveView.newFirstIndex, 20, "glove new launch index");
  assert.deepEqual(gloveView.oldBaselineIndexes, [17, 18, 19], "glove handoff month excluded from old baseline");
  assert.ok(Math.abs(gloveView.oldAverage - 11572.6666666667) < 1e-8, "glove old series pre-launch 3M baseline");
  assert.equal(gloveView.newAverage, 7082, "glove new series launch average");
  assert.deepEqual(gloveView.oldSales.slice(17, 20), [10493, 12619, 11606], "glove M+L is summed by aligned month before averaging");
  assert.equal(gloveView.newSales[20], 7082, "glove new M+L launch month total");
  assert.ok(gloveView.newSales.slice(0, 20).every(value => value === null), "glove pre-launch series months remain null");
  assert.ok(Math.abs(gloveView.handoffProgress - 7082 / 11572.6666666667) < 1e-10, "glove handoff progress");
  assert.equal(gloveView.overlapIndex, 20, "glove overlap month detected");
  assert.equal(gloveView.status.label, "資料累積中", "glove accumulating status");
  assert.equal(gloveView.channelViews.length, 2, "glove size-level channel status");
  assert.ok(Math.abs(gloveView.channelViews[0].perStore - 4022 / 1242) < 1e-10, "new M current per-store sales");
  assert.ok(Math.abs(gloveView.channelViews[1].perStore - 3060 / 1242) < 1e-10, "new L current per-store sales");
  const gloveCard = page.locator("[data-replacement-id='lemon-to-lavender-gloves']");
  assert.equal(await gloveCard.locator(".replacement-kpi").count(), 3, "sales handoff KPIs");
  assert.equal(await gloveCard.locator(".replacement-size").count(), 2, "series size-level KPI cards");
  assert.match(await gloveCard.innerText(), /舊品替代前基準\s*11,572\.7/);
  assert.match(await gloveCard.innerText(), /新品目前實銷\s*7,082\.0/);
  assert.match(await gloveCard.innerText(), /接棒進度\s*61\.2%/);
  assert.match(await gloveCard.innerText(), /資料累積中・接棒第 1 個月/);
  assert.match(await gloveCard.innerText(), /交接月\s*2026\/08/);
  assert.doesNotMatch(await gloveCard.innerText(), /低於舊品|▼ 38\.8%|全聯毛利率（前毛）|商業條件/);
  assert.doesNotMatch(await gloveCard.innerText(), /舊品.*單店月銷|單店月銷.*→/);
  assert.ok(await gloveCard.locator(".replacement-old-line").getAttribute("d"), "glove old series timeline path");
  assert.ok(await gloveCard.locator(".replacement-new-line").getAttribute("d"), "glove new series timeline path");
  assert.equal(await gloveCard.locator(".replacement-new-dot").count(), 1, "single-month new series remains visible as a point");
  assert.equal(await gloveCard.locator(".replacement-marker-text").textContent(), "交接月", "glove handoff marker");

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
  assert.equal(await page.locator("#cPx").textContent(), "—", "missing Excel front margin displays dash");
  assert.equal(await page.locator("#cMargin").innerText(), "—", "missing front margin is not inferred");
  assert.equal(await page.locator("#cStatus").innerText(), "—", "missing result has neutral status");

  const tabFrontMarginTests = [
    ["reverse", "#rProduct", "#rPx", "#rTarget", "32"],
    ["scenario", "#sProduct", "#sPx", "#sPriceA", "119"],
    ["promo", "#pProduct", "#pPx", "#pA", "179"],
  ];
  for (const [tab, productInput, marginOutput, changedInput, value] of tabFrontMarginTests) {
    await page.locator(`.tab[data-tab='${tab}']`).click();
    await page.locator(productInput).fill("65010209");
    assert.equal(await page.locator(marginOutput).textContent(), "26.18%", `${tab} Excel front margin`);
    await page.locator(changedInput).fill(value);
    assert.equal(await page.locator(marginOutput).textContent(), "26.18%", `${tab} front margin remains fixed`);
  }
  assert.equal(await page.locator("#scenarioResults .scenario-card").count(), 3, "three scenario cards");
  for (const card of await page.locator("#scenarioResults .scenario-card").all()) {
    assert.match(await card.innerText(), /全聯毛利率（前毛）\s*26\.18%/, "scenario uses the same fixed front margin");
  }
  assert.equal(await page.locator("#scenarioResults .scenario-state").count(), 3, "every scenario uses the shared margin state");
  const scenarioStateLabels = await page.locator("#scenarioResults .scenario-state").allTextContents();
  assert.ok(scenarioStateLabels.every(label => ["非常好", "達標", "待優化", "偏低", "—"].includes(label)), "scenario state labels use shared thresholds");
  await page.locator(".tab[data-tab='reverse']").click();
  await page.locator("#rTarget").fill("35");
  assert.equal(await page.locator("#rStatus").textContent(), "待優化", "reverse-price result uses shared 35% status");
  await page.locator(".tab[data-tab='promo']").click();
  assert.ok(["非常好", "達標", "待優化", "偏低"].includes(await page.locator("#pStatus").textContent()), "promotion result uses shared margin status");
  await page.locator(".tab[data-tab='calc']").click();
  await page.locator("#cProduct").fill("65010209");
  await page.evaluate(() => { const px = parseFloat(document.querySelector("#cPx").textContent) / 100; const fee = Number(document.querySelector("#cFee").value) / 100; const cost = Number(document.querySelector("#cCost").value); document.querySelector("#cPrice").value = (cost / ((1 - fee - 0.41) * (1 - px)) * 1.05).toFixed(8); document.querySelector("#cPrice").dispatchEvent(new Event("input", { bubbles: true })); });
  assert.equal(await page.locator("#cStatus").textContent(), "非常好", "main calculator uses shared 40% status");

  const stagedReplacement = await page.evaluate(() => {
    const oneMonth = window.__PX_ANALYTICS__.replacementNewSummary([null, 600], 1);
    const twoMonths = window.__PX_ANALYTICS__.replacementNewSummary([null, 600, 800], 1);
    const threeMonths = window.__PX_ANALYTICS__.replacementNewSummary([null, 600, 800, 1000], 1);
    return {
      one: { months: oneMonth.dataMonths, average: oneMonth.average, status: window.__PX_ANALYTICS__.replacementStatus(1000, oneMonth.average, oneMonth.dataMonths).label },
      two: { months: twoMonths.dataMonths, average: twoMonths.average, status: window.__PX_ANALYTICS__.replacementStatus(1000, twoMonths.average, twoMonths.dataMonths).label },
      three: { months: threeMonths.dataMonths, average: threeMonths.average, status: window.__PX_ANALYTICS__.replacementStatus(1000, threeMonths.average, threeMonths.dataMonths).label },
      zeroBase: window.__PX_ANALYTICS__.compareReplacementEffect("sales", 0, 100).changeText,
    };
  });
  assert.deepEqual(stagedReplacement.one, { months: 1, average: 600, status: "資料累積中" }, "one-month handoff mode");
  assert.deepEqual(stagedReplacement.two, { months: 2, average: 700, status: "資料累積中" }, "two-month handoff average");
  assert.deepEqual(stagedReplacement.three, { months: 3, average: 800, status: "低於舊品" }, "three-month replacement effect mode");
  assert.equal(stagedReplacement.zeroBase, "—", "zero baseline does not divide by zero");

  for (const tab of ["reverse", "scenario", "promo", "basis", "calc"]) {
    await page.locator(`.tab[data-tab='${tab}']`).click();
    assert.ok(await page.locator(`#${tab}`).evaluate(element => element.classList.contains("active")), `${tab} tab`);
  }
  await page.locator("#cProduct").fill("OP指尖強化手套-薰衣紫M");
  const viewports = [[320,568],[360,800],[375,667],[390,844],[393,852],[430,932],[768,1024],[820,1180],[1024,768],[1280,720],[1366,768],[1440,900],[1920,1080],[844,390]];
  let maxDocumentOverflow = 0;
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    for (const tab of ["calc", "reverse", "scenario", "promo", "basis"]) {
      await page.locator(`.tab[data-tab='${tab}']`).click();
      const layout = await page.evaluate(() => {
        const root = document.documentElement;
        const important = [...document.querySelectorAll(".hero,.brand-copy,.meta,.card,.trend-svg,.replacement-chart,input,select,output,.hs-footer")].filter(element => element.offsetParent !== null);
        const clipped = important.filter(element => { const rect = element.getBoundingClientRect(); return rect.left < -1 || rect.right > innerWidth + 1; }).length;
        const inputFontSizes = [...document.querySelectorAll("input,select")].filter(element => element.offsetParent !== null).map(element => parseFloat(getComputedStyle(element).fontSize));
        const buttonHeights = [...document.querySelectorAll("button,summary")].filter(element => element.offsetParent !== null).map(element => element.getBoundingClientRect().height);
        return { overflow: Math.max(0, root.scrollWidth - innerWidth), clipped, minInputFont: inputFontSizes.length ? Math.min(...inputFontSizes) : Infinity, minTouchHeight: buttonHeights.length ? Math.min(...buttonHeights) : Infinity };
      });
      maxDocumentOverflow = Math.max(maxDocumentOverflow, layout.overflow);
      assert.ok(layout.overflow <= 1, `${width}x${height} ${tab} document overflow: ${layout.overflow}px`);
      assert.equal(layout.clipped, 0, `${width}x${height} ${tab} clipped important elements`);
      if (width <= 430) assert.ok(layout.minInputFont >= 16, `${width}x${height} ${tab} mobile input font size`);
      if (width <= 430) assert.ok(layout.minTouchHeight >= 43.5, `${width}x${height} ${tab} touch target height`);
    }
  }
  assert.ok(maxDocumentOverflow <= 1, `maximum document overflow ${maxDocumentOverflow}px`);
  console.log(`MAX_DOCUMENT_OVERFLOW=${maxDocumentOverflow}px`);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator(".tab[data-tab='calc']").click();
  await page.locator("#cProduct").click();
  assert.equal(await page.locator("#cProductOptions .product-option").count(), 54, "mobile dropdown shows all products");
  const dropdownBounds = await page.locator("#cProductOptions").evaluate(element => { const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, width: innerWidth }; });
  assert.ok(dropdownBounds.left >= -1 && dropdownBounds.right <= dropdownBounds.width + 1, "mobile dropdown fits viewport");
  await page.keyboard.press("Escape");
  if (process.env.PX_SCREENSHOT) {
    await page.setViewportSize({ width: Number(process.env.PX_SCREENSHOT_WIDTH || 375), height: Number(process.env.PX_SCREENSHOT_HEIGHT || 812) });
    await page.locator("#cProduct").fill(process.env.PX_SCREENSHOT_PRODUCT || "65010209");
    await page.screenshot({ path: process.env.PX_SCREENSHOT, fullPage: true });
  }
  assert.equal(errors.length, 0, `browser errors: ${errors.join(" | ")}`);

  await browser.close();
  server.close();
  console.log("PASS web regression: branding, products, fixed front margin, replacement, all responsive viewports, console");
}

main().catch(error => {
  server.close();
  console.error(error);
  process.exitCode = 1;
});
