const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('🧪 Session 33 - Simple Verification\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // Set up console monitoring
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') {
        console.log('   ⚠️  Console error:', msg.text());
      }
    });

    // Navigate to app
    console.log('1️⃣ Loading application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'session33-01-home.png', fullPage: true });
    console.log('   ✅ Home page loaded');

    // Check for elements
    const uploadArea = await page.$('.upload-area, [class*="upload"]');
    console.log('   Upload area:', uploadArea ? '✅ Found' : '❌ Not found');

    // Upload PDF
    console.log('\n2️⃣ Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(path.join(__dirname, 'test-sample.pdf'));
      console.log('   ✅ File uploaded');

      // Wait for PDF to load - check multiple possible selectors
      console.log('   Waiting for PDF to render...');
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'session33-02-after-upload.png', fullPage: true });

      // Check what's on the page
      const body = await page.evaluate(() => document.body.innerText);
      console.log('   Page text includes "PDF Editor":', body.includes('PDF Editor'));

      // Look for canvas elements (PDF.js renders to canvas)
      const canvasCount = await page.evaluate(() => document.querySelectorAll('canvas').length);
      console.log('   Canvas elements found:', canvasCount);

      // Look for any error messages
      const errorMsg = await page.evaluate(() => {
        const el = document.querySelector('[class*="error"]');
        return el ? el.innerText : null;
      });
      if (errorMsg) {
        console.log('   ⚠️  Error message:', errorMsg);
      }

      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'session33-03-final.png', fullPage: true });
      console.log('   ✅ Screenshots captured');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Summary:');
    console.log('- Total console messages:', consoleMessages.length);
    console.log('- Errors:', consoleMessages.filter(m => m.type === 'error').length);
    console.log('- Warnings:', consoleMessages.filter(m => m.type === 'warning').length);
    console.log('='.repeat(50));

    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    try {
      await page.screenshot({ path: 'session33-error.png', fullPage: true });
    } catch (e) {
      console.error('Could not capture error screenshot');
    }
  } finally {
    await browser.close();
  }
})();
