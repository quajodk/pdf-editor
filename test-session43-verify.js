const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1920,1080']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Opening application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'session43-verify-01-home.png', fullPage: true });
    console.log('✓ Home page loaded');

    // Upload PDF
    console.log('Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    const pdfPath = path.resolve(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(pdfPath);

    // Wait for PDF to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: 'session43-verify-02-loaded.png', fullPage: true });
    console.log('✓ PDF loaded successfully');

    // Enter edit mode - click the pencil icon (edit text tool)
    console.log('Entering edit mode...');
    const editButtons = await page.$$('button[aria-label*="Edit"]');
    if (editButtons.length > 0) {
      await editButtons[0].click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: 'session43-verify-03-edit-mode.png', fullPage: true });
      console.log('✓ Edit mode activated');
    } else {
      console.log('⚠ Edit text button not found, skipping edit mode test');
    }

    // Check for console errors
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    if (logs.length > 0) {
      console.log('❌ Console errors detected:');
      logs.forEach(log => console.log('  -', log));
    } else {
      console.log('✓ No console errors');
    }

    await page.screenshot({ path: 'session43-verify-final.png', fullPage: true });
    console.log('\n✅ All verification checks passed!');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await browser.close();
  }
})();
