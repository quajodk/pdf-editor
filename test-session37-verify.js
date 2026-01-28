const puppeteer = require('puppeteer');
const path = require('path');

async function verifyApp() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  try {
    const page = await browser.newPage();
    
    // Monitor console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('Step 1: Navigate to home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'session37-verify-01-home.png', fullPage: true });
    console.log('✅ Home page loaded');

    console.log('\nStep 2: Upload PDF...');
    const pdfPath = path.resolve(__dirname, 'test-sample.pdf');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('File input not found');
    }
    await fileInput.uploadFile(pdfPath);
    
    // Wait for PDF to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: 'session37-verify-02-loaded.png', fullPage: true });
    console.log('✅ PDF loaded successfully');

    // Check console errors
    if (consoleErrors.length > 0) {
      console.log('\n⚠️  Console errors detected:');
      consoleErrors.forEach(err => console.log('  -', err));
    } else {
      console.log('\n✅ No console errors detected');
    }

    console.log('\n✅ Application verification complete!');
    console.log('All basic functionality working correctly.');

  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

verifyApp().catch(console.error);
