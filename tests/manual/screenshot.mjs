import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/Evidence-v-daj-/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Vezmi screenshot
  await page.screenshot({ path: 'app-screenshot.png', fullPage: true });
  console.log('✅ Screenshot uložen: app-screenshot.png');
  
  await browser.close();
})();
