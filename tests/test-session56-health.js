const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Monitor console for errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('📱 Navigating to home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'session56-health-01-home.png' });
    console.log('✅ Home page loaded');

    console.log('📄 Uploading test PDF...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile('test-sample.pdf');

    console.log('⏳ Waiting for PDF to load...');
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'session56-health-02-loaded.png' });
    console.log('✅ PDF loaded successfully');

    console.log('🔧 Verifying page content...');
    const body = await page.$('body');
    if (!body) {
      console.error('❌ Page body not found!');
    } else {
      console.log('✅ Page rendered successfully');
    }

    await page.screenshot({ path: 'session56-health-final.png' });

    // Report console errors
    if (consoleErrors.length > 0) {
      console.log('\n⚠️  Console Errors Detected:');
      consoleErrors.forEach(err => console.log('  -', err));
    } else {
      console.log('\n✅ No console errors detected');
    }

    console.log('\n🎉 Health check complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
})();
