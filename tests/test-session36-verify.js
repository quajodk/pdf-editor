const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('1. Navigating to home page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'session36-01-home.png', fullPage: true });

  // Check for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  console.log('2. Uploading PDF...');
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(path.join(__dirname, 'test-sample.pdf'));

  console.log('3. Waiting for PDF to load...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  await page.screenshot({ path: 'session36-02-loaded.png', fullPage: true });

  console.log('4. Testing Edit Text mode...');
  const editTextButton = await page.$('button[title="Edit Text"]');
  if (editTextButton) {
    await editTextButton.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'session36-03-edit-mode.png', fullPage: true });
    console.log('✅ Edit Text mode activated');
  } else {
    console.log('⚠️ Edit Text button not found');
  }

  console.log('\n=== Verification Results ===');
  console.log(`Console Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Errors:', errors);
  } else {
    console.log('✅ No console errors');
  }

  console.log('\n✅ Application verification complete!');
  console.log('Screenshots saved:');
  console.log('  - session36-01-home.png');
  console.log('  - session36-02-loaded.png');
  console.log('  - session36-03-edit-mode.png');

  await browser.close();
})();
