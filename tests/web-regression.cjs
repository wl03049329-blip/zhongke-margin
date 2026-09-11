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
    await page.locator("#cProduct").fill("65010209");
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
