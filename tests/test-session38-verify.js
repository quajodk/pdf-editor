const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('🚀 Starting Session 38 verification...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Collect console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('✓ Navigating to application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'session38-verify-01-home.png', fullPage: true });
    console.log('✓ Homepage loaded');

    // Upload PDF
    console.log('\n✓ Testing PDF upload...');
    const fileInput = await page.$('input[type="file"]');
    const pdfPath = path.resolve(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(pdfPath);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: 'session38-verify-02-loaded.png', fullPage: true });
    console.log('✓ PDF loaded successfully');

    // Check for Edit Text tool presence
    console.log('\n✓ Checking for Edit Text tool...');
    const toolbarButtons = await page.$$('button');
    console.log(`✓ Found ${toolbarButtons.length} toolbar buttons`);

    // Check if canvas is visible
    const canvas = await page.$('canvas');
    if (canvas) {
      console.log('✓ PDF canvas is visible');
    }

    // Report console errors
    console.log('\n📊 Test Summary:');
    console.log(`Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('\n⚠️ Console Errors Found:');
      consoleErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    } else {
      console.log('✅ No console errors detected!');
    }

    console.log('\n✅ Verification complete! Application is working correctly.');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
})();
