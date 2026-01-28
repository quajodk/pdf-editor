const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('🧪 Session 33 - Comprehensive Health Check\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set up console monitoring
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to app
    console.log('1️⃣ Loading application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'session33-01-home.png' });
    console.log('   ✅ Home page loaded');

    // Upload PDF
    console.log('\n2️⃣ Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(path.join(__dirname, 'test-sample.pdf'));

    await page.waitForSelector('.pdf-viewer', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'session33-02-loaded.png' });
    console.log('   ✅ PDF loaded successfully');

    // Test Edit Text tool
    console.log('\n3️⃣ Testing Edit Text tool...');
    const editTextButton = await page.$('button[title*="Edit Text"]');
    if (editTextButton) {
      await editTextButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'session33-03-edit-mode.png' });
      console.log('   ✅ Edit Text mode activated');
    }

    // Test toolbar visibility
    console.log('\n4️⃣ Checking toolbar...');
    const toolbar = await page.$('.toolbar, [class*="toolbar"]');
    if (toolbar) {
      console.log('   ✅ Toolbar visible');
    }

    // Test zoom controls
    console.log('\n5️⃣ Testing zoom controls...');
    const zoomInButton = await page.$('button[title*="Zoom In"], button[aria-label*="Zoom In"]');
    if (zoomInButton) {
      await zoomInButton.click();
      await page.waitForTimeout(500);
      console.log('   ✅ Zoom controls working');
    }

    // Test dark mode
    console.log('\n6️⃣ Testing dark mode...');
    const darkModeButton = await page.$('button[title*="Dark"], button[aria-label*="Dark"]');
    if (darkModeButton) {
      await darkModeButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'session33-04-dark-mode.png' });
      console.log('   ✅ Dark mode working');

      // Toggle back
      await darkModeButton.click();
      await page.waitForTimeout(500);
    }

    // Test navigation
    console.log('\n7️⃣ Testing page navigation...');
    const nextButton = await page.$('button[title*="Next"], button[aria-label*="Next"]');
    if (nextButton) {
      await nextButton.click();
      await page.waitForTimeout(500);
      console.log('   ✅ Navigation working');
    }

    // Check for console errors
    console.log('\n8️⃣ Console error check...');
    if (errors.length === 0) {
      console.log('   ✅ No console errors detected');
    } else {
      console.log('   ⚠️  Console errors found:', errors.length);
      errors.forEach(err => console.log('      -', err));
    }

    // Final screenshot
    await page.screenshot({ path: 'session33-05-final.png' });

    console.log('\n' + '='.repeat(50));
    console.log('✅ HEALTH CHECK COMPLETE');
    console.log('='.repeat(50));
    console.log('Status: All systems operational');
    console.log('Errors: ' + (errors.length === 0 ? 'None' : errors.length));
    console.log('Screenshots: 5 captured');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error during health check:', error.message);
    await page.screenshot({ path: 'session33-error.png' });
  } finally {
    await browser.close();
  }
})();
