// Existing regression suites exercise the unlocked workbench. Actual PIN verification is tested separately.
if(process.env.PX_TEST_SCREEN_SESSION==='1'){
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const config={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../px-pin-config.js'),'utf8'),config);
 const {chromium}=require('C:/Users/林弘昇/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const launch=chromium.launch.bind(chromium);
 chromium.launch=async(...args)=>{const browser=await launch(...args),original=browser.newContext.bind(browser);
 const seed=version=>{try{if(!localStorage.getItem('px-screen-session-v1')){const now=Date.now();localStorage.setItem('px-screen-session-v1',JSON.stringify({version,started:now,seen:now}))}}catch{}};
 browser.newContext=async(...a)=>{const context=await original(...a);await context.addInitScript(seed,config.window.PX_PIN_CONFIG.version);return context};
 const newPage=browser.newPage.bind(browser);browser.newPage=async(...a)=>{const page=await newPage(...a);await page.addInitScript(seed,config.window.PX_PIN_CONFIG.version);return page};return browser};
}
