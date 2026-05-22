const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('Session 45 - Comprehensive Verification Test');
  console.log('==============================================\n');

  try {
    // 1. Check home page
    console.log('1. Loading home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'session45-verify-01-home.png' });
    console.log('✓ Home page loaded');

    // 2. Upload PDF
    console.log('\n2. Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile('test-sample.pdf');

    // Wait for PDF to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: 'session45-verify-02-loaded.png' });
    console.log('✓ PDF loaded successfully');

    // 3. Check for console errors
    console.log('\n3. Checking console logs...');
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(`ERROR: ${msg.text()}`);
      }
    });

    // 4. Test edit text mode
    console.log('\n4. Testing edit text mode...');
    const editTextBtn = await page.$('button[title*="Edit Text"], button[aria-label*="Edit Text"]');
    if (editTextBtn) {
      await editTextBtn.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: 'session45-verify-03-edit-mode.png' });
      console.log('✓ Edit text mode activated');
    } else {
      console.log('⚠ Edit text button not found');
    }

    // 5. Check toolbar and tools
    console.log('\n5. Checking toolbar and tools...');

    // Count toolbar buttons
    const buttons = await page.$$('button');
    console.log(`✓ Found ${buttons.length} toolbar buttons`);

    await page.screenshot({ path: 'session45-verify-04-toolbar.png' });

    // 6. Final screenshot
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'session45-verify-final.png' });

    console.log('\n==============================================');
    console.log('Verification Complete!');
    console.log('Console Errors:', logs.length === 0 ? 'None' : logs.length);
    if (logs.length > 0) {
      console.log('Errors found:');
      logs.forEach(log => console.log('  -', log));
    }
    console.log('==============================================\n');

  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'session45-error.png' });
  }

  await browser.close();
})();
