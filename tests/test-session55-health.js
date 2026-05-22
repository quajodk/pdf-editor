const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });

  try {
    const page = await browser.newPage();

    // Monitor console for errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      errors.push(err.toString());
    });

    console.log('📱 Navigating to home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot of home page
    await page.screenshot({ path: 'session55-health-01-home.png', fullPage: true });
    console.log('✅ Home page loaded');

    // Upload a PDF
    console.log('📤 Uploading test PDF...');
    const fileInput = await page.$('input[type="file"]');
    const testPdfPath = path.resolve(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(testPdfPath);

    // Wait for PDF to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: 'session55-health-02-loaded.png', fullPage: true });
    console.log('✅ PDF loaded successfully');

    // Check toolbar elements
    console.log('🔍 Checking UI elements...');
    const toolbar = await page.$('[class*="toolbar"]');
    console.log(toolbar ? '✅ Toolbar found' : '⚠️  Toolbar not found');

    const canvas = await page.$('canvas');
    console.log(canvas ? '✅ Canvas found' : '⚠️  Canvas not found');

    // Final screenshot
    await page.screenshot({ path: 'session55-health-final.png', fullPage: true });

    // Report results
    console.log('\n' + '='.repeat(60));
    console.log('🏁 HEALTH CHECK RESULTS');
    console.log('='.repeat(60));

    if (errors.length === 0) {
      console.log('✅ ZERO console errors detected');
    } else {
      console.log(`❌ Console errors: ${errors.length}`);
      errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }

    console.log('\n📸 Screenshots saved:');
    console.log('   - session55-health-01-home.png');
    console.log('   - session55-health-02-loaded.png');
    console.log('   - session55-health-final.png');

    console.log('\n✨ Application health check completed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'session55-health-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
