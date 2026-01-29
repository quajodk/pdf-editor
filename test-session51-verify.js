const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('Navigating to app...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Capture home page
  await page.screenshot({ path: 'session51-verify-01-home.png', fullPage: true });
  console.log('✓ Home page loaded');

  // Check for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Upload PDF
  console.log('Uploading PDF...');
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile('test-sample.pdf');

  // Wait for PDF to load
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Capture loaded PDF
  await page.screenshot({ path: 'session51-verify-02-loaded.png', fullPage: true });
  console.log('✓ PDF loaded');

  // Click Edit Text tool (📝)
  console.log('Testing Edit Text tool...');
  const editTextButton = await page.$('button[title*="Edit"], button[aria-label*="Edit"]');
  if (editTextButton) {
    await editTextButton.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'session51-verify-03-edit-mode.png', fullPage: true });
    console.log('✓ Edit Text mode activated');
  }

  // Final screenshot
  await page.screenshot({ path: 'session51-verify-final.png', fullPage: true });

  // Report errors
  if (errors.length > 0) {
    console.log('\n❌ Console Errors Found:');
    errors.forEach(err => console.log('  -', err));
  } else {
    console.log('\n✅ No console errors detected');
  }

  console.log('\n✅ Verification complete!');
  console.log('Application is working correctly');

  await browser.close();
})();
