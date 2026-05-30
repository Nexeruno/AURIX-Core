import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    console.log('📱 Otevírám aplikaci...');
    await page.goto('http://localhost:5173/Evidence-v-daj-/');
    await page.waitForLoadState('networkidle');

    // KROK 1: Registrace nového uživatele
    console.log(`📝 Registruji nového uživatele: ${testEmail}...`);
    await page.click('button:has-text("Registruj se")');
    await page.waitForTimeout(500);

    // Vyplň registrační formulář
    const usernameInput = await page.$('input[placeholder*="3–20"]');
    if (usernameInput) {
      await usernameInput.fill(`user${Date.now()}`);
    }

    const emailInputs = await page.$$('input[type="email"]');
    if (emailInputs.length > 0) {
      await emailInputs[0].fill(testEmail);
    }

    const passwordInputs = await page.$$('input[type="password"]');
    if (passwordInputs.length > 0) {
      await passwordInputs[0].fill(testPassword);
    }

    if (passwordInputs.length > 1) {
      await passwordInputs[1].fill(testPassword);
    }

    // Klikni na "Vytvořit účet"
    await page.click('button:has-text("Vytvořit účet")');
    await page.waitForTimeout(3000);

    // Zkontroluj, jestli je přihlášen
    const accountCreated = await page.$('text=Evidence Výdajů') || await page.$('text=Spravuj');
    if (!accountCreated) {
      console.log('❌ Registrace selhala');
      await page.screenshot({ path: 'test-registration-failed.png' });
      process.exit(1);
    }

    console.log('✅ Uživatel vytvořen!');

    // KROK 2: Reset hesla
    console.log('🔐 Načítám auth stránku pro reset hesla...');
    const page2 = await browser.newPage();
    await page2.goto('http://localhost:5173/Evidence-v-daj-/', { waitUntil: 'domcontentloaded' });
    await page2.waitForTimeout(1000);

    console.log('🔐 Klikám na "Zapomenuté heslo?"...');
    await page2.click('button:has-text("Zapomenuté heslo?")');
    await page2.waitForTimeout(500);

    console.log(`📧 Zadávám email: ${testEmail}...`);
    const emailField = await page2.$('input[type="email"]');
    await emailField.fill(testEmail);
    await page2.waitForTimeout(500);

    console.log('📤 Klikám na "Odeslat odkaz"...');
    const submitButton = await page2.$('button:has-text("Odeslat odkaz")');
    if (!submitButton) {
      console.log('❌ CHYBA: Tlačítko "Odeslat odkaz" nenalezeno!');
      process.exit(1);
    }

    await submitButton.click();
    console.log('⏳ Čekám na odpověď serveru (max 20 sekund)...');

    // Počkej na success zprávu
    try {
      await Promise.race([
        page2.waitForSelector('text=Odkaz pro reset hesla byl odeslán', { timeout: 20000 }),
        page2.waitForSelector('text=Chyba', { timeout: 20000 }).then(() => {
          throw new Error('Chyba zpráva se zobrazila');
        })
      ]);

      console.log('✅ SUCCESS! Email pro reset hesla byl úspěšně odeslán!');
      const message = await page2.locator('text=Odkaz pro reset hesla byl odeslán').first().textContent();
      console.log('✅ Zpráva:', message);

      await page2.screenshot({ path: 'test-password-reset-success-full.png' });
      console.log('📸 Screenshot uložen: test-password-reset-success-full.png');
      console.log('\n🎉 TEST PROŠEL!');
      process.exit(0);
    } catch (err) {
      console.log('❌ Operace selhala:', err.message);
      const pageHtml = await page2.content();

      // Najdi error zprávu
      const errorMatch = pageHtml.match(/internal[^<]*/);
      const errorText = await page2.$eval('[class*="error"], [class*="red"]', el => el.innerText).catch(() => null);

      if (errorMatch) {
        console.log('   Error message:', errorMatch[0]);
      }
      if (errorText) {
        console.log('   Error text:', errorText);
      }

      await page2.screenshot({ path: 'test-password-reset-failed-full.png' });
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ TEST SELHALO:', err.message);
    await page.screenshot({ path: 'test-password-reset-crash-full.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
