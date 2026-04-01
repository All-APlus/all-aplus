import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'https://all-aplus.vercel.app';
const OUT_DIR = path.resolve(__dirname, '../docs/screenshots');

const pages = [
  { name: 'dashboard', path: '/dashboard', waitFor: 2000 },
  { name: 'course', path: '/courses/2d20372b-cbd1-40dc-a44b-77c8e0d2d729', waitFor: 2000 },
  { name: 'chat', path: '/courses/2d20372b-cbd1-40dc-a44b-77c8e0d2d729/chat/45025560-a9eb-4777-8bff-12c05c430190', waitFor: 2000 },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 로그인 (Supabase Auth - 쿠키 설정)
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 15000 });

  // 이메일/비밀번호 입력
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  await page.type('input[type="email"]', 'test@test.com', { delay: 50 });
  await page.type('input[type="password"]', 'testtest', { delay: 50 });
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 5000));
  console.log('Logged in:', page.url());

  // 온보딩 다이얼로그 닫기 (있으면)
  try {
    const closeBtn = await page.$('button[aria-label="Close"], .dialog-close, [data-close]');
    if (closeBtn) await closeBtn.click();
    await new Promise(r => setTimeout(r, 500));
  } catch {}

  for (const { name, path: pagePath, waitFor } of pages) {
    console.log(`Capturing ${name}...`);
    await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, waitFor));

    // 온보딩 다이얼로그 닫기 (매 페이지)
    try {
      const closeBtn = await page.$('button[aria-label="Close"]');
      if (closeBtn) {
        await closeBtn.click();
        await new Promise(r => setTimeout(r, 500));
      }
    } catch {}

    const filePath = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`  Saved: ${filePath}`);
  }

  await browser.close();
  console.log('\nDone! Screenshots saved to docs/screenshots/');
}

main().catch(console.error);
