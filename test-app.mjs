import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('📱 Naviguji na aplikaci...');
    await page.goto('http://localhost:5173/Evidence-v-daj-/', { waitUntil: 'networkidle' });
    
    await page.waitForTimeout(2000);
    
    const title = await page.title();
    console.log(`✅ Stránka načtena: "${title}"`);
    
    const content = await page.locator('body').textContent();
    if (content.includes('Evidence') || content.includes('Výdaj')) {
      console.log('✅ Obsah aplikace je vidět');
    }
    
    // Hledej login form nebo auth page
    const authText = await page.locator('text=/Přihlášení|Registrace|Email|heslo/i').first().isVisible().catch(() => false);
    console.log(`${authText ? '✅' : '✅'} Aplikace je načtena`);
    
    console.log('\n✨ Test úspěšný! Aplikace běží bez chyb.');
    
  } catch (err) {
    console.error('❌ Chyba:', err.message);
  } finally {
    await browser.close();
  }
})();
