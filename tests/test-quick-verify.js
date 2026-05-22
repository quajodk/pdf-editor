const puppeteer = require('puppeteer');

async function quickVerify() {
  console.log('🔍 Quick UI Verification...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();

  try {
    // Navigate to the app
    console.log('Loading app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot
    await page.screenshot({ path: 'screenshots/quick-verify.png', fullPage: true });
    console.log('✅ Screenshot saved to screenshots/quick-verify.png\n');
    console.log('✨ Browser is open - please manually test text editing:');
    console.log('   1. Upload a PDF');
    console.log('   2. Click "Add Text" tool');
    console.log('   3. Click on PDF and type some text');
    console.log('   4. Press Enter to add text');
    console.log('   5. Click "Select" tool');
    console.log('   6. DOUBLE-CLICK the text you just added');
    console.log('   7. Verify you can edit the text\n');
    console.log('Press Ctrl+C to close browser when done\n');

    // Keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('Error:', error);
    await browser.close();
    process.exit(1);
  }
}

quickVerify();
