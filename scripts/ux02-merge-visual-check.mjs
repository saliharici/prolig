import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport: {width:1440, height:900}, deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle'});
  await page.locator('.prolig-publisher-ux02 .ux02-header').waitFor({state:'visible'});
  await page.getByRole('button', {name:'Panel Tasarımları'}).first().waitFor({state:'visible'});
  await page.getByRole('button', {name:'Çalışan Girişi'}).first().waitFor({state:'visible'});
  await mkdir('ux02-screenshots', {recursive:true});
  await page.screenshot({path:'ux02-screenshots/ux02-ux01-integration-desktop-1440.png'});
  await page.getByRole('button', {name:'Panel Tasarımları'}).first().click();
  await page.getByText('GÖRSEL PROTOTİP').first().waitFor({state:'visible'});
  console.log('UX02 integration visual check: PASS (publisher header, employee login CTA, Preview-only UX01 design gallery)');
} finally {
  await browser.close();
}
