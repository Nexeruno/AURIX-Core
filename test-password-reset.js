import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('📱 Otevírám aplikaci...');
    await page.goto('http://localhost:5173/Evidence-v-daj-/');
    await page.waitForLoadState('networkidle');

    console.log('🔐 Klikám na "Zapomenuté heslo?"...');
    await page.click('button:has-text("Zapomenuté heslo?")');
    await page.waitForTimeout(500);

    console.log('📧 Zadávám email pro test...');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.waitForTimeout(500);

    console.log('📤 Klikám na "Odeslat odkaz"...');
    const submitButton = await page.$('button:has-text("Odeslat odkaz")');
    if (!submitButton) {
      console.log('❌ CHYBA: Tlačítko "Odeslat odkaz" nenalezeno!');
      process.exit(1);
    }

    await submitButton.click();
    console.log('⏳ Čekám na odpověď serveru...');

    // Počkej na response nebo error zprávu (max 15 sekund)
    try {
      await Promise.race([
        page.waitForSelector('text=Odkaz pro reset hesla byl odeslán', { timeout: 15000 }),
        page.waitForSelector('text=Chyba při odesílání resetu hesla', { timeout: 15000 }).then(() => {
          throw new Error('Chyba při odesílání');
        })
      ]);

      console.log('✅ SUCCESS! Email byl úspěšně odeslán!');
      const text = await page.locator('text=Odkaz pro reset hesla byl odeslán').first().textContent();
      console.log('✅ Zpráva:', text);

      await page.screenshot({ path: 'password-reset-success.png' });
      console.log('📸 Screenshot uložen: password-reset-success.png');
      process.exit(0);
    } catch (err) {
      console.log('❌ Operace selhala:', err.message);
      await page.screenshot({ path: 'password-reset-error.png' });
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ TEST SELHALO:', err.message);
    await page.screenshot({ path: 'password-reset-crash.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
