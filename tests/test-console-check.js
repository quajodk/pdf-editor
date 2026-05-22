const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });

    // Wait a bit to see if there are any delayed errors
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to upload a PDF
    const uploadInput = await page.$('input[type="file"][accept="application/pdf"]');
    if (uploadInput) {
      const testPdfPath = path.resolve(__dirname, 'test-sample.pdf');
      await uploadInput.uploadFile(testPdfPath);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Check for console messages
    const errors = consoleMessages.filter(m => m.type === 'error');
    const warnings = consoleMessages.filter(m => m.type === 'warning');

    console.log('=== Console Messages Summary ===');
    console.log(`Total messages: ${consoleMessages.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\n=== ERRORS ===');
      errors.forEach(e => console.log(e.text));
    }

    if (warnings.length > 0) {
      console.log('\n=== WARNINGS ===');
      warnings.forEach(w => console.log(w.text));
    }

    if (errors.length === 0 && warnings.length === 0) {
      console.log('\n✅ No errors or warnings detected!');
    }

  } catch (error) {
    console.error('Test error:', error.message);
  }

  await browser.close();
})();
