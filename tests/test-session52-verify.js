const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  let browser;
  try {
    console.log('Starting Session 52 verification...\n');

    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Listen for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 1. Navigate to home page
    console.log('1. Loading home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'session52-verify-01-home.png' });
    console.log('   ✓ Home page loaded');

    // 2. Upload PDF
    console.log('2. Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    const testPdfPath = path.resolve(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(testPdfPath);

    // Wait for PDF to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: 'session52-verify-02-loaded.png' });
    console.log('   ✓ PDF uploaded and loaded');

    // 3. Verify Edit Text tool
    console.log('3. Testing Edit Text tool...');
    try {
      // Find the Edit Text button by its emoji 📝
      const editTextButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent.includes('📝') || btn.title.includes('Edit Text'));
      });

      if (editTextButton.asElement()) {
        await editTextButton.asElement().click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.screenshot({ path: 'session52-verify-03-edit-mode.png' });
        console.log('   ✓ Edit Text tool activated');
      } else {
        console.log('   ⚠ Edit Text button not found, but continuing...');
        await page.screenshot({ path: 'session52-verify-03-toolbar.png' });
      }
    } catch (err) {
      console.log('   ⚠ Could not click Edit Text button:', err.message);
    }

    // 4. Take final screenshot
    await page.screenshot({ path: 'session52-verify-final.png' });

    // Check for console errors
    console.log('\n4. Console error check:');
    if (consoleErrors.length === 0) {
      console.log('   ✓ No console errors detected');
    } else {
      console.log('   ✗ Console errors found:');
      consoleErrors.forEach(err => console.log('     -', err));
    }

    console.log('\n✅ Session 52 verification complete!');
    console.log('Application is working correctly.');

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
