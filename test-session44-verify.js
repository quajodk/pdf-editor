const puppeteer = require('puppeteer');
const path = require('path');

async function runTest() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });

    console.log('1. Navigate to home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'session44-verify-01-home.png' });
    console.log('   ✓ Home page loaded');

    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    console.log('\n2. Upload PDF...');
    const fileInput = await page.$('input[type="file"]');
    const pdfPath = path.resolve(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(pdfPath);

    // Wait for PDF to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'session44-verify-02-loaded.png' });
    console.log('   ✓ PDF loaded successfully');

    console.log('\n3. Test Edit Text mode...');
    const editTextButton = await page.$('button[title*="Edit Text"], button[aria-label*="Edit Text"]');
    if (editTextButton) {
      await editTextButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: 'session44-verify-03-edit-mode.png' });
      console.log('   ✓ Edit Text mode activated');
    }

    // Final screenshot
    await page.screenshot({ path: 'session44-verify-final.png' });

    console.log('\n✅ Verification Complete!');
    console.log(`   Console Errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('   Errors:', errors);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

runTest();
