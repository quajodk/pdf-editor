const puppeteer = require('puppeteer');

(async () => {
  console.log('🧪 Starting Session 47 verification...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // Step 1: Navigate to the application
    console.log('📋 Step 1: Loading application home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'session47-verify-01-home.png' });
    console.log('✅ Home page loaded successfully');

    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Step 2: Upload PDF
    console.log('\n📋 Step 2: Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile('test-sample.pdf');
      console.log('✅ PDF file uploaded');

      // Wait for PDF to load
      await page.waitForSelector('canvas', { timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.screenshot({ path: 'session47-verify-02-loaded.png' });
      console.log('✅ PDF rendered successfully');
    }

    // Step 3: Test Edit Text Mode
    console.log('\n📋 Step 3: Testing Edit Text mode...');
    const editButton = await page.$('button[aria-label*="Edit"]');
    if (editButton) {
      await editButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: 'session47-verify-03-edit-mode.png' });
      console.log('✅ Edit Text mode activated');
    }

    // Step 4: Check toolbar
    console.log('\n📋 Step 4: Checking toolbar...');
    const toolbar = await page.$('div[class*="toolbar"], nav');
    if (toolbar) {
      const buttons = await page.$$('button');
      console.log(`✅ Found ${buttons.length} toolbar buttons`);
    }

    await page.screenshot({ path: 'session47-verify-final.png' });

    // Final checks
    console.log('\n📊 Test Results:');
    console.log('==================');
    console.log(`Console Errors: ${errors.length}`);
    console.log(`Status: ${errors.length === 0 ? '✅ PASS' : '❌ FAIL'}`);

    if (errors.length > 0) {
      console.log('\n❌ Console errors found:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n✨ Session 47 verification complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'session47-verify-error.png' });
  } finally {
    await browser.close();
  }
})();
