/* Browser QA: all tabs, expanded modules, desktop readability and exact mobile pixels. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const sharp = require('C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const { execFileSync } = require('node:child_process');
const { chromium } = require('C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const out = process.env.PX_QA_OUT || path.join(require('node:os').tmpdir(), 'px-desktop-readability');
fs.mkdirSync(out, { recursive: true });
const releaseBase = '0ffebfa4cb9ead0dd3b872c799155df3346fda81';
const read = f => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
const old = f => execFileSync('git', ['show', releaseBase + ':' + f], { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n');
if (!process.env.PX_BASELINE) {
  const html = read('index.html');
  assert.equal(html.replace(/\n<link rel="stylesheet" href="desktop-readability\.css\?v=4\.1\.19-desktop-readability">/, '').replaceAll('service-worker.js?v=4.1.20-desktop-readability', 'service-worker.js?v=4.1.18-rsp-confirmed'), old('index.html'), 'original markup, inline CSS, formulas and business logic unchanged');
  const tracked = execFileSync('git', ['ls-tree', '--name-only', releaseBase], { cwd: root, encoding: 'utf8' }).trim().split('\n');
  for (const f of tracked.filter(f => /\.(js|json|css)$/.test(f) && f !== 'service-worker.js')) assert.equal(read(f), old(f), f + ' data / original styles / logic unchanged');
}
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://local').pathname).slice(1) || 'index.html');
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
async function openTab(p, id) { await p.locator(`[data-tab="${id}"]`).click(); }
async function expand(p, selector) {
  await p.locator(selector).evaluateAll(nodes => nodes.forEach(el => { if (el.tagName === 'DETAILS') el.open = true; }));
}
async function states(p, visit) {
  for (const [tab, input] of [['calc', 'cProduct'], ['reverse', 'rProduct'], ['scenario', 'sProduct'], ['promo', 'pProduct']]) {
    await openTab(p, tab); await p.locator('#' + input).fill('65010209');
    if (tab === 'promo') await p.locator('#pA').fill('129');
    await expand(p, `#${tab} details`); await visit(tab);
  }
  await openTab(p, 'campaign'); await p.locator('#campaignSearch').fill('保鮮膜');
  await p.locator('.lookup-choices [data-px-compare="86210115"]').click();
  await expand(p, '#campaign details'); await visit('campaign');
  await p.locator('#campaignSearchableProducts').click(); await visit('drawer');
  await p.keyboard.press('Escape');
  await p.locator('#campaignBrowseAll').click();
  await p.locator('.public-catalog-list details').first().evaluate(el => el.open = true);
  await visit('public-price-list');
  await p.locator('#campaignSearch').fill('65010209'); await visit('lookup-unavailable');
  await openTab(p, 'organizer'); await p.locator('#organizerAdd').click();
  const item = p.locator('.organizer-item').last();
  await item.locator('[data-field="newName"]').fill('OP長商品名稱測試／無雙酚A食品用鋁箔超長規格800公分－12入');
  await item.locator('[data-field="newBarcode"]').fill('47112345678901234567890');
  await visit('organizer');
  await openTab(p, 'basis'); await visit('basis');
  await openTab(p, 'calc');
  const card = p.locator('#cSalesPerformance .sales2');
  await card.locator('[data-sales-mode="single"]').click();
  await expand(p, '#cSalesPerformance details');
  await visit('sales-single', '#cSalesPerformance');
  const hits = card.locator('.sales2-hit');
  await card.locator('.sales2-chart-stage').scrollIntoViewIfNeeded();
  await hits.last().hover(); await visit('sales-tooltip', '#cSalesPerformance .sales2-chart-stage');
  await card.locator('[data-sales-mode="multi"]').click();
  const multi = card.locator('.sales22-multi-pane');
  for (const code of ['65010647', '65013454', '65020125', '61030162']) {
    await multi.locator('.sales-multi-search').fill(code); await multi.locator('[data-add]').first().click();
  }
  await expand(p, '#cSalesPerformance details'); await visit('sales-multi', '#cSalesPerformance');
  await card.locator('[data-sales-mode="radar"]').click();
  await expand(p, '#cSalesPerformance details'); await visit('sales-radar', '#cSalesPerformance');
  await p.evaluate(() => PX_SALES_UPDATE.open()); await visit('sales-update');
  const X = require('../assets/vendor/xlsx-0.20.3.full.min.js'), wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([['商品名稱','2026/09'], ['OP無雙酚A鋁箔800公分-12入',0], ['來源長商品名稱／規格與條碼待人工確認12345678901234567890',99999999]]), '實銷');
  await p.locator('.sales24-file').setInputFiles({ name: 'desktop-qa-fixture.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from(X.write(wb,{bookType:'xlsx',type:'buffer'})) });
  await p.waitForFunction(() => document.querySelector('.sales24-loading').textContent.startsWith('解析完成'));
  await expand(p, '.sales24-dialog details'); await visit('sales-update-preview'); await p.keyboard.press('Escape');
  await p.locator('#developNewProduct').click();
  for (const [id, value] of [['cNewName', '新品長名稱／OP食品用鋁箔800公分12入'], ['cNewBarcode', '47112345678901234567890'], ['cPrice', '105'], ['cCost', '30'], ['cNewPurchase', '60'], ['cFee', '10']]) await p.locator('#' + id).fill(value);
  await expand(p, '#calc details'); await visit('new-product');
  await p.locator('[data-new-channel="px"]').click(); await visit('new-px-empty');
  for (const [id, value] of [['cCost','99999999'],['cNewPXMargin','26.18'],['cNewCompanyMargin','38'],['cFee','10.95']]) await p.locator('#'+id).fill(value);
  await expand(p, '#calc details'); await visit('new-px-result');
}
async function audit(p) {
  return p.evaluate(() => {
    const visible = e => { const s = getComputedStyle(e); return !!e.getClientRects().length && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden]'); };
    const scope = document.querySelector('dialog[open]') || document.querySelector('.app');
    const small = [], buttonIssues = [], inputIssues = [], spill = [];
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode, e = n.parentElement;
      if (!n.textContent.trim() || !visible(e) || e.closest('svg,script,style,option')) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      if (!r.getBoundingClientRect().width) continue;
      const size = parseFloat(getComputedStyle(e).fontSize);
      if (size < 12) small.push({ text: n.textContent.trim().slice(0, 75), class: e.className, size });
    }
    for (const e of scope.querySelectorAll('button,input:not([type=checkbox]),select,textarea')) {
      if (!visible(e)) continue;
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      if (e.tagName === 'BUTTON' && (parseFloat(s.fontSize) < 14 || r.height < 46)) buttonIssues.push({ text: e.textContent.trim().slice(0, 50), class: e.className, size: s.fontSize, height: r.height });
      if (e.tagName !== 'BUTTON' && (parseFloat(s.fontSize) < 17 || r.height < 50)) inputIssues.push({ id: e.id, class: e.className, size: s.fontSize, height: r.height });
    }
    for (const e of scope.querySelectorAll('.px-metric b,.sales2-kpis strong,.sales22-kpis strong,.sales23-kpis strong,.lookup-normalized b')) {
      if (visible(e) && e.scrollWidth > e.clientWidth + 1) spill.push({ text: e.textContent, class: e.className });
    }
    return { viewport: [innerWidth, innerHeight], devicePixelRatio, overflow: document.documentElement.scrollWidth - innerWidth, panel: document.querySelector('.panel.active')?.getBoundingClientRect().width, small, buttonIssues, inputIssues, spill };
  });
}
(async () => {
  let browser;
  try {
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const url = process.env.PX_LIVE || `http://127.0.0.1:${server.address().port}/index.html`;
    const baseline = !!process.env.PX_BASELINE, errors = [], report = { url, baseline, desktop: [], mobile: [] };
    for (const [width, height] of (process.env.PX_MOBILE_ONLY ? [] : [[1366,768], [1440,900], [1920,1080]])) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, serviceWorkers: 'block' });
      const p = await context.newPage(); p.on('pageerror', e => errors.push(e.message));
      await p.goto(url, { waitUntil: 'networkidle' });
      await states(p, async (name, selector) => {
        await p.waitForTimeout(350); // Let existing fade/pop animations finish before comparing pixels.
        const a = await audit(p); report.desktop.push({ name, ...a });
        fs.writeFileSync(path.join(out, `${baseline ? 'baseline' : 'validation'}.json`), JSON.stringify(report, null, 2));
        if (name !== 'sales-tooltip') await p.mouse.move(0, 0);
        if (!selector) await p.evaluate(() => scrollTo(0, 0));
        const target = selector ? p.locator(selector) : p;
        const modal = await p.locator('dialog[open]').count() > 0;
        await target.screenshot({ path: path.join(out, `${baseline ? 'before' : 'after'}-${width}-${name}.png`), animations: 'disabled', caret: 'hide', ...(selector ? {} : { fullPage: !modal }) });
      });
      await context.close();
    }
    if (!baseline && !process.env.PX_DESKTOP_ONLY) for (const [width, height] of [[390,844], [430,932], [900,900]]) {
      const c = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, serviceWorkers: 'block' });
      const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
      await p.goto(url, { waitUntil: 'networkidle' });
      // Compare resting UI, avoiding replay of the existing fade/pop animations when sheets are toggled.
      await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
      let count = 0, maxPixelChannelDifference = 0, maxAntialiasPixels = 0;
      await states(p, async (name, selector) => {
        await p.waitForTimeout(350);
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, `${width} ${name} mobile overflow`);
        if (name !== 'sales-tooltip') await p.mouse.move(0, 0);
        if (!selector) await p.evaluate(() => scrollTo(0, 0));
        const target = selector ? p.locator(selector) : p, captures = [], modal = await p.locator('dialog[open]').count() > 0;
        // Same DOM and interaction state avoids timing / hover differences between contexts.
        for (const disabled of [true, false]) {
          await p.evaluate(disabled => { const sheet = document.querySelector('link[href^="desktop-readability.css"]').sheet; if (!sheet) throw Error('desktop stylesheet not loaded'); sheet.disabled = disabled; }, disabled);
          await p.waitForTimeout(100);
          const b = await target.screenshot({ animations: 'disabled', caret: 'hide', ...(selector ? {} : { fullPage: !modal }) });
          const layout = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e=>e.getClientRects().length&&!e.closest('script,style')).map(e=>{ const s=getComputedStyle(e),r=e.getBoundingClientRect(); return [e.tagName,e.id,e.className.baseVal??e.className,r.x+scrollX,r.y+scrollY,r.width,r.height,...['display','font-size','font-weight','line-height','padding','margin','gap','grid-template-columns','color','background-color','border','border-radius','min-height','max-width','overflow','white-space','letter-spacing','opacity','transform'].map(k=>s.getPropertyValue(k))]; }));
          const pixels = await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});
          captures.push({layout,pixels}); fs.writeFileSync(path.join(out, `mobile-${disabled ? 'before-' : ''}${width}-${name}.png`), b);
        }
        assert.deepEqual(captures[1].layout,captures[0].layout,`${width} ${name}: exact mobile styles and geometry unchanged`);
        assert.deepEqual(captures[1].pixels.info,captures[0].pixels.info,`${width} ${name}: image dimensions unchanged`);
        let difference=0, antialiasPixels=0;
        for(let i=0;i<captures[0].pixels.data.length;i+=4){let delta=0;for(let j=0;j<4;j++)delta=Math.max(delta,Math.abs(captures[0].pixels.data[i+j]-captures[1].pixels.data[i+j]));difference=Math.max(difference,delta);if(delta>2)antialiasPixels++;}
        // Permit isolated raster edge noise (at most 0.001% / 10 pixels); styles and geometry above must match exactly.
        const tolerance=Math.max(10,Math.floor(captures[0].pixels.info.width*captures[0].pixels.info.height*0.00001));
        assert.ok(difference<=32&&antialiasPixels<=tolerance,`${width} ${name}: visual change (${antialiasPixels} pixels, max channel delta ${difference})`);
        maxPixelChannelDifference=Math.max(maxPixelChannelDifference,difference);maxAntialiasPixels=Math.max(maxAntialiasPixels,antialiasPixels); count++;
      });
      report.mobile.push({ width, height, states: count, exactStylesAndGeometry: 'PASS', visualMatch: 'PASS', maxPixelChannelDifference, maxAntialiasPixels, overflow: 0 }); await c.close();
      fs.writeFileSync(path.join(out, 'validation.json'), JSON.stringify(report, null, 2));
      console.log(`${width} mobile: ${count} states PASS`);
    }
    report.errors = errors;
    fs.writeFileSync(path.join(out, `${baseline ? 'baseline' : 'validation'}.json`), JSON.stringify(report, null, 2));
    if (!baseline) for (const a of report.desktop) {
      assert.equal(a.overflow, 0, `${a.viewport} ${a.name} body overflow`);
      assert.deepEqual(a.small, [], `${a.viewport} ${a.name} small text`);
      assert.deepEqual(a.buttonIssues, [], `${a.viewport} ${a.name} button`);
      assert.deepEqual(a.inputIssues, [], `${a.viewport} ${a.name} input`);
      assert.deepEqual(a.spill, [], `${a.viewport} ${a.name} numeric overflow`);
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ status: 'PASS', baseline, url, desktopStates: report.desktop.length, mobile: report.mobile, errors, out }, null, 2));
  } finally { await browser?.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
