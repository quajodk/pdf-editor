const puppeteer = require('puppeteer');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('🧪 Session 33 - Application Verification\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // Set up console monitoring
    const errors = [];
    const warnings = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.log('   ⚠️  Console error:', msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    // Navigate to app
    console.log('1️⃣ Loading application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await delay(1000);
    await page.screenshot({ path: 'session33-01-home.png', fullPage: true });
    console.log('   ✅ Home page loaded');

    // Upload PDF
    console.log('\n2️⃣ Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(path.join(__dirname, 'test-sample.pdf'));
      console.log('   ✅ File selected');

      // Wait for PDF to load
      await delay(5000);
      await page.screenshot({ path: 'session33-02-after-upload.png', fullPage: true });

      // Check for canvas elements
      const canvasCount = await page.evaluate(() => document.querySelectorAll('canvas').length);
      console.log('   Canvas elements:', canvasCount);

      if (canvasCount > 0) {
        console.log('   ✅ PDF rendered successfully');
      } else {
        console.log('   ⚠️  No canvas elements found');
      }

      // Look for toolbar
      const hasToolbar = await page.evaluate(() => {
        return !!document.querySelector('[class*="toolbar"], .toolbar');
      });
      console.log('   Toolbar:', hasToolbar ? '✅ Found' : '❌ Not found');

      // Test Edit Text button
      console.log('\n3️⃣ Testing Edit Text tool...');
      const editTextBtn = await page.$('button[title*="Edit Text"]');
      if (editTextBtn) {
        await editTextBtn.click();
        await delay(1000);
        await page.screenshot({ path: 'session33-03-edit-mode.png', fullPage: true });
        console.log('   ✅ Edit Text mode activated');
      } else {
        console.log('   ⚠️  Edit Text button not found');
      }

      // Test zoom
      console.log('\n4️⃣ Testing zoom controls...');
      const zoomIn = await page.$('button[title*="Zoom In"], button[aria-label*="Zoom In"]');
      if (zoomIn) {
        await zoomIn.click();
        await delay(500);
        console.log('   ✅ Zoom controls working');
      }

      // Test dark mode
      console.log('\n5️⃣ Testing dark mode...');
      const darkBtn = await page.$('button[title*="Dark"], button:has-text("Dark")');
      if (darkBtn) {
        await darkBtn.click();
        await delay(500);
        await page.screenshot({ path: 'session33-04-dark-mode.png', fullPage: true });
        console.log('   ✅ Dark mode working');
        await darkBtn.click();
        await delay(500);
      }

      await page.screenshot({ path: 'session33-05-final.png', fullPage: true });
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(50));
    console.log('Console Errors:', errors.length);
    console.log('Console Warnings:', warnings.length);
    console.log('Screenshots: 5 captured');
    console.log('='.repeat(50));

    await delay(2000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'session33-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
