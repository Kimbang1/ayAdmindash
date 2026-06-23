// Usage: ADMIN_PASSWORD=<password> node verify-badges.mjs
import { chromium } from 'playwright';

const PASSWORD = process.env.ADMIN_PASSWORD;
const BASE = 'http://localhost:5173';

if (!PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable is required');
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

console.log('1. open login page and pre-seed seen ids to [] (so all apps look new)');
await page.goto(`${BASE}/login`);
await page.evaluate(() => {
  localStorage.setItem('admin_seen_application_ids', JSON.stringify([]));
});

console.log('2. login (single admin-login call)');
await page.fill('input[name=password]', PASSWORD);
await page.click('button[type=submit]');
await page.waitForURL(`${BASE}/`);
await page.waitForTimeout(2000);

await page.screenshot({ path: 'verify-1-dashboard-before.png', fullPage: true });
console.log('screenshot: verify-1-dashboard-before.png (dashboard, all apps unseen)');

const bellBtn = page.getByRole('button', { name: '새 신청 알림 열기' });
await bellBtn.click();
await page.waitForTimeout(300);
await page.screenshot({ path: 'verify-2-bell-before.png' });
console.log('screenshot: verify-2-bell-before.png');
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

await page.getByRole('button', { name: '신청 현황' }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: 'verify-3-applications-before.png', fullPage: true });
console.log('screenshot: verify-3-applications-before.png');

console.log('3. fetch applications list to pick a target');
const token = await page.evaluate(() => sessionStorage.getItem('admin_jwt'));
const apps = await page.evaluate(async ({ token }) => {
  const res = await fetch('https://mosjbkysssaoxsaurelv.supabase.co/functions/v1/admin', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}, { token });
const target = apps.applications[0];
console.log('target:', { id: target.id, name: target.name, course_id: target.course_id });

await page.getByRole('button', { name: '대시보드' }).click();
await page.waitForTimeout(500);

console.log('4. open applicant detail popup (window.open, no main-page reload)');
const [popup] = await Promise.all([
  context.waitForEvent('page'),
  page.evaluate((url) => {
    window.open(url, '_blank', 'width=560,height=900');
  }, `/course/${target.course_id}/applicants/${target.id}`),
]);
await popup.waitForLoadState();
await popup.waitForTimeout(1500);
await popup.screenshot({ path: 'verify-4-applicant-detail.png', fullPage: true });
console.log('screenshot: verify-4-applicant-detail.png');
await popup.close();

console.log('5. wait for applicant-seen postMessage to be processed (no reload)');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'verify-5-dashboard-after.png', fullPage: true });
console.log('screenshot: verify-5-dashboard-after.png (badge for target course should be gone)');

await bellBtn.click();
await page.waitForTimeout(300);
await page.screenshot({ path: 'verify-6-bell-after.png' });
console.log('screenshot: verify-6-bell-after.png (count should be one less, target name absent)');
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

await page.getByRole('button', { name: '신청 현황' }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: 'verify-7-applications-after.png', fullPage: true });
console.log('screenshot: verify-7-applications-after.png (확인 안 한 신규 신청 should be one less)');

await browser.close();
console.log('done');
