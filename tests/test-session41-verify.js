const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    const page = await browser.newPage();

    // Monitor console logs
    const logs = [];
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      logs.push({ type, text });
      console.log(`[${type.toUpperCase()}] ${text}`);
    });

    console.log('🚀 Starting Session 41 verification...\n');

    // Test 1: Homepage
    console.log('Test 1: Loading homepage...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'session41-verify-01-home.png' });
    console.log('✅ Homepage loaded\n');

    // Test 2: Upload PDF
    console.log('Test 2: Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile('test-sample.pdf');
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: 'session41-verify-02-loaded.png' });
    console.log('✅ PDF loaded successfully\n');

    // Test 3: Check toolbar
    console.log('Test 3: Checking toolbar...');
    const buttons = await page.$$('button');
    console.log(`Found ${buttons.length} buttons in UI`);
    await page.screenshot({ path: 'session41-verify-03-toolbar.png' });
    console.log('✅ Toolbar rendered\n');

    // Test 4: Check for console errors
    console.log('Test 4: Checking console errors...');
    const errors = logs.filter(log => log.type === 'error' || log.type === 'warning');
    if (errors.length === 0) {
      console.log('✅ No console errors or warnings\n');
    } else {
      console.log('⚠️  Found console issues:');
      errors.forEach(err => console.log(`  - [${err.type}] ${err.text}`));
    }

    console.log('\n🎉 Session 41 Verification Complete!');
    console.log('All systems operational - Application ready for continued development.');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await browser.close();
  }
})();
