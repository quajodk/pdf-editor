const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Monitor console for errors
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    console.log('1. Navigating to home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'session57-health-01-home.png' });
    console.log('✅ Home page loaded');

    // Upload PDF
    console.log('2. Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(path.resolve(__dirname, 'test-sample.pdf'));
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: 'session57-health-02-loaded.png' });
    console.log('✅ PDF loaded');

    // Check for Edit Text tool
    console.log('3. Checking for Edit Text tool...');
    const editTextButton = await page.$('button[title*="Edit Text"]');
    if (editTextButton) {
      console.log('✅ Edit Text tool found');
    } else {
      console.log('❌ Edit Text tool NOT found');
    }

    // Test Edit Mode
    if (editTextButton) {
      console.log('4. Clicking Edit Text tool...');
      await editTextButton.click();
      await new Promise(resolve => setTimeout(resolve, 1500));
      await page.screenshot({ path: 'session57-health-03-edit-mode.png' });
      console.log('✅ Edit mode activated');
    }

    // Check for console errors
    const errors = consoleMessages.filter(msg =>
      msg.toLowerCase().includes('error') ||
      msg.toLowerCase().includes('warning')
    );

    console.log('\n📊 Summary:');
    console.log(`Console messages: ${consoleMessages.length}`);
    console.log(`Errors/Warnings: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Console errors found:');
      errors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('✅ No console errors detected');
    }

    await page.screenshot({ path: 'session57-health-final.png' });

    console.log('\n✅ Health check complete!');

  } catch (error) {
    console.error('❌ Error during health check:', error);
  } finally {
    await browser.close();
  }
})();
