const {execFileSync}=require('node:child_process');
// Compare against the accepted release immediately before the calculator draft-mode patch.
// Earlier absolute page heights predate the sales analysis and public-price sections.
module.exports=async function capture(browser,url,panel,prepare){
 const html=execFileSync('git',['show','9cba9119d6c7fd3a9aafb6fdfeec3cecf35c2e9e:index.html'],{encoding:'utf8'});
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();
 try{await page.route('**/index.html',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:html}));await page.goto(url,{waitUntil:'networkidle'});await page.locator(`[data-tab="${panel}"]`).click();await page.locator({calc:'#cProduct',reverse:'#rProduct',promo:'#pProduct'}[panel]).fill('65010209');if(prepare)await prepare(page);return await page.locator('#'+panel).evaluate(element=>Math.round(element.getBoundingClientRect().height))}finally{await context.close()}
};
