// Frontend browser verification with local fixtures; no database or production credentials.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL = 'http://127.0.0.1:4173';
for (let attempt = 0; attempt < 80; attempt++) {
  try { if ((await fetch(baseURL)).ok) break; } catch { /* Preview server is starting. */ }
  if (attempt === 79) throw new Error('Preview server did not start');
  await new Promise(resolve => setTimeout(resolve, 250));
}

const browser = await chromium.launch();
const errors = [];
const logoutCalls = new WeakMap();
async function fixturePage(role = 'GENEL_KOORDINATOR', viewport = { width: 1365, height: 900 }) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', error => errors.push(error.message));
  logoutCalls.set(page, 0);
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let status = 200;
    let json = [];
    if (path === '/api/v1/auth/me') {
      status = role ? 200 : 401;
      json = { user: { id: 1, email: 'navigation@example.test', fullName: 'Test Kullanıcısı', role, provinceId: null, assignedRegion: null } };
    } else if (path === '/api/v1/auth/logout') {
      assert.equal(route.request().method(), 'POST');
      logoutCalls.set(page, logoutCalls.get(page) + 1);
      role = null;
      json = { success: true };
    } else if (path === '/api/v1/messages') {
      json = { messages: [], counts: { unread: 0, inbox: 0, sent: 0 } };
    } else if (path === '/api/v1/announcements') {
      json = { announcements: [], counts: { active: 0, archived: 0, unread: 0 }, canPublish: false, audiences: [] };
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });
  });
  await page.goto(baseURL);
  return page;
}

async function assertNoOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, 'Horizontal page overflow');
}
async function openDrawer(page) {
  await page.getByRole('button', { name: 'Ana menüyü aç', exact: true }).click();
  await page.waitForFunction(() => {
    const panel = document.querySelector('#workspace-navigation');
    return panel?.getAttribute('aria-modal') === 'true' && document.body.style.position === 'fixed' && Math.abs(panel.getBoundingClientRect().left) < 0.5;
  });
}
async function waitClosed(page) {
  await page.waitForFunction(() => document.querySelector('#workspace-navigation')?.getAttribute('aria-hidden') === 'true' && document.body.style.position !== 'fixed');
}

try {
  const page = await fixturePage();
  const panel = page.locator('#workspace-navigation');
  await panel.waitFor({ state: 'visible' });
  assert.equal(await panel.getByRole('button', { name: 'Üye Yönetimi', exact: true }).count(), 1);
  assert.equal(await panel.getByRole('button', { name: 'Rol ve Yetkiler', exact: true }).count(), 1);
  await assertNoOverflow(page);
  assert.equal(await panel.locator('.nav-link').evaluateAll(buttons => buttons.every(button => button.getBoundingClientRect().height >= 44)), true);
  const visibleText = await page.locator('body').innerText();
  const previewMarker = /pilot|test ortamı|örnek veri/i.exec(visibleText);
  if (previewMarker) {
    const start = Math.max(0, previewMarker.index - 100);
    const end = Math.min(visibleText.length, previewMarker.index + previewMarker[0].length + 100);
    console.error('NAVIGATION_UNEXPECTED_PREVIEW_MARKER_CONTEXT=' + JSON.stringify(visibleText.slice(start, end)));
  }
  assert.equal(previewMarker === null, true, 'Authenticated UI must not display preview markers');
  console.log('NAVIGATION_DESKTOP_IMAGE=' + (await page.screenshot({ type: 'jpeg', quality: 45 })).toString('base64'));

  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page.getByRole('button', { name: 'Ana menüyü aç', exact: true });
  await trigger.waitFor({ state: 'visible' });
  await page.evaluate(() => window.scrollTo(0, 180));
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await openDrawer(page);
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Ana menüyü kapat');
  assert.equal(await page.locator('.demo-main').evaluate(element => element.inert), true);
  await assertNoOverflow(page);
  console.log('NAVIGATION_MOBILE_IMAGE=' + (await page.screenshot({ type: 'jpeg', quality: 45 })).toString('base64'));

  await panel.getByRole('button', { name: 'Çıkış Yap', exact: true }).focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Ana menüyü kapat');
  await page.keyboard.press('Shift+Tab');
  assert.equal((await page.evaluate(() => document.activeElement?.textContent))?.trim(), 'Çıkış Yap');
  await page.keyboard.press('Escape');
  await waitClosed(page);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Ana menüyü aç');
  assert.equal(await page.evaluate(() => window.scrollY), scrollBefore);

  await openDrawer(page);
  await page.mouse.click(380, 300);
  await waitClosed(page);
  await openDrawer(page);
  await panel.getByRole('button', { name: 'Projeler', exact: true }).click();
  await waitClosed(page);
  assert.equal((await panel.locator('button[aria-current="page"]').innerText()).trim(), 'Projeler');

  await openDrawer(page);
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.waitForFunction(() => !document.querySelector('#workspace-navigation')?.hasAttribute('aria-modal') && document.body.style.position !== 'fixed');
  assert.equal(await panel.isVisible(), true);
  assert.equal(await page.locator('.demo-main').evaluate(element => element.inert), false);

  for (const width of [320, 390, 768, 960]) {
    await page.setViewportSize({ width, height: 740 });
    await trigger.waitFor({ state: 'visible' });
    await openDrawer(page);
    await assertNoOverflow(page);
    assert.equal(await panel.locator('button').evaluateAll(buttons => buttons.filter(button => button.getClientRects().length).every(button => button.getBoundingClientRect().height >= 44)), true);
    await panel.getByRole('button', { name: 'Ana menüyü kapat', exact: true }).click();
    await waitClosed(page);
    await trigger.focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.querySelector('#workspace-navigation').contains(document.activeElement)), false);
  }
  await page.close();

  const logoutPage = await fixturePage('GENEL_KOORDINATOR', { width: 320, height: 568 });
  await openDrawer(logoutPage);
  const logoutButton = logoutPage.locator('#workspace-navigation').getByRole('button', { name: 'Çıkış Yap', exact: true });
  assert.equal(await logoutButton.isVisible(), true);
  const logoutBounds = await logoutButton.boundingBox();
  assert.ok(logoutBounds && logoutBounds.y >= 0 && logoutBounds.y + logoutBounds.height <= 568, 'Mobile logout must be visible without scrolling');
  assert.ok(logoutBounds.height >= 44, 'Mobile logout needs a usable touch target');
  await logoutButton.click();
  await logoutPage.locator('#public-hero-heading').waitFor();
  assert.equal(logoutCalls.get(logoutPage), 1, 'Logout must call the session endpoint once');
  assert.equal(await logoutPage.locator('#workspace-navigation').count(), 0);
  assert.equal(await logoutPage.evaluate(() => document.body.style.position), '');
  await logoutPage.reload();
  await logoutPage.locator('#public-hero-heading').waitFor();
  assert.equal(await logoutPage.locator('#workspace-navigation').count(), 0);
  await logoutPage.close();

  for (const role of ['GENEL_KOORDINATOR', 'BOLGE_KOORDINATORU', 'IL_KOORDINATORU', 'EDITOR', 'YAZAR', 'MUHASEBE']) {
    const rolePage = await fixturePage(role);
    const navigation = rolePage.locator('#workspace-navigation');
    await navigation.waitFor({ state: 'visible' });
    const coordinator = ['GENEL_KOORDINATOR', 'BOLGE_KOORDINATORU', 'IL_KOORDINATORU'].includes(role);
    assert.equal(await navigation.getByRole('button', { name: 'Üye Yönetimi', exact: true }).count(), coordinator ? 1 : 0);
    assert.equal(await navigation.getByRole('button', { name: 'Rol ve Yetkiler', exact: true }).count(), role === 'GENEL_KOORDINATOR' ? 1 : 0);
    assert.equal(await navigation.getByRole('button', { name: 'Telif ve Ödemeler', exact: true }).count(), 1);
    await rolePage.close();
  }

  const publicPage = await fixturePage(null);
  await publicPage.locator('#public-hero-heading').waitFor();
  assert.equal(/pilot|test ortamı|örnek veri|önizleme/i.test(await publicPage.locator('body').innerText()), false);
  await publicPage.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
  await publicPage.locator('input[type="password"]').waitFor();
  assert.equal(/pilot ortamı|test ortamı/i.test(await publicPage.locator('body').innerText()), false);
  await publicPage.close();
  assert.deepEqual(errors, [], 'Browser page errors');
  console.log('Navigation browser checks passed: desktop, 320/390/768/960px, focus trap, Escape, backdrop, selection, resize, six roles, 320x568 mobile logout and public/login copy.');
} finally {
  await browser.close();
}
