import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE_URL = process.env.UX02_BASE_URL || 'http://127.0.0.1:4173';
const OUTPUT = resolve('ux02-screenshots');
await mkdir(OUTPUT, { recursive: true });

const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
const viewports = [{name:'desktop-1440',width:1440,height:900},{name:'tablet-768',width:768,height:1024},{name:'mobile-360',width:360,height:800}];
let assertions = 0;
async function expectNoOverflow(page,label) {
 const dims = await page.evaluate(() => ({body:document.documentElement.scrollWidth, viewport:window.innerWidth}));
 assert.ok(dims.body <= dims.viewport + 1, label + ' horizontal overflow: ' + JSON.stringify(dims));
 assertions++;
}
async function clickLogin(page,width) {
 if(width<=650) {
   const menu = page.getByRole('button',{name:'Menüyü aç'});
   await menu.click();
   assert.equal(await page.getByRole('button',{name:'Menüyü kapat'}).getAttribute('aria-expanded'),'true');
   assertions++;
   await page.locator('#ux02-mobile-navigation').getByRole('button',{name:/Çalışan Girişi/}).click();
 } else {
   await page.locator('.ux02-header-actions').getByRole('button',{name:/Çalışan Girişi/}).click();
 }
}
try {
 for(const viewport of viewports) {
   const context = await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1,locale:'tr-TR',reducedMotion:'reduce'});
   const page=await context.newPage();
   await page.route('**/api/v1/auth/me',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'Unauthorized'})}));
   await page.route('**/api/v1/auth/login',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'Unauthorized'})}));
   await page.goto(BASE_URL,{waitUntil:'networkidle',timeout:30000});
   await page.getByRole('heading',{name:/Nitelikli içerik/}).waitFor();
   for(const hash of ['yayinlar','kurumsal','editorial','iletisim']) assert.equal(await page.locator('#'+hash).count(),1);
   assertions+=4;
   await expectNoOverflow(page,viewport.name+' public');
   await page.screenshot({path:OUTPUT+'/ux02-home-'+viewport.name+'.png',fullPage:true,animations:'disabled'});
   await clickLogin(page,viewport.width);
   await page.getByRole('heading',{name:'Çalışan Girişi'}).waitFor();
   await expectNoOverflow(page,viewport.name+' login');
   await page.screenshot({path:OUTPUT+'/ux02-login-'+viewport.name+'.png',fullPage:true,animations:'disabled'});
   const email=page.getByRole('textbox',{name:'E-posta adresi'});
   const pw=page.locator('#password');
   await email.fill('inceleme@example.test');
   await pw.fill('yanlis-bir-sifre');
   assert.equal(await pw.getAttribute('type'),'password');assertions++;
   await page.getByRole('button',{name:'Şifreyi göster'}).click();
   assert.equal(await pw.getAttribute('type'),'text');assertions++;
   await page.getByRole('button',{name:'Şifreyi gizle'}).click();
   assert.equal(await pw.getAttribute('type'),'password');assertions++;
   await page.getByRole('button',{name:'Giriş Yap'}).click();
   await page.getByRole('alert').getByText('E-posta veya şifre hatalı.').waitFor();
   assertions++;
   await page.screenshot({path:OUTPUT+'/ux02-login-error-'+viewport.name+'.png',fullPage:true,animations:'disabled'});
   await page.getByRole('button',{name:'Ana sayfaya dön'}).click();
   await page.getByRole('heading',{name:/Nitelikli içerik/}).waitFor();assertions++;
   await context.close();
 }
 const context=await browser.newContext({viewport:{width:1440,height:900},locale:'tr-TR'});
 const page=await context.newPage();
 await page.route('**/api/v1/auth/me',route=>route.fulfill({status:500,contentType:'application/json',body:'{}'}));
 await page.goto(BASE_URL,{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:/Nitelikli içerik/}).waitFor();
 await page.getByRole('status').getByText('Oturum hizmeti şu anda doğrulanamadı.',{exact:false}).waitFor();
 assert.equal(await page.locator('.demo-shell').count(),0);assertions++;
 await page.screenshot({path:OUTPUT+'/ux02-public-service-error.png',fullPage:false,animations:'disabled'});
 await page.getByRole('button',{name:/Yazar ve Editör Başvurusu/}).first().click();
 await page.locator('.membership-page').waitFor();assertions++;
 await context.close();
 console.log('UX02_BROWSER_PASS assertions='+assertions+' screenshots=10 sizes=1440,768,360');
} finally {
 await browser.close();
}
