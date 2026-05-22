const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Starting simplified thumbnails test...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1600, height: 1000 }
  });

  const page = await browser.newPage();

  try {
    // Navigate to the app
    console.log('1. Going to localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'screenshots/thumb-simple-01.png', fullPage: true });

    // Upload PDF
    console.log('2. Uploading PDF');
    const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 5000 });
    const pdfPath = path.resolve(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(pdfPath);

    // Wait for PDF to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    await page.screenshot({ path: 'screenshots/thumb-simple-02-loaded.png', fullPage: true });
    console.log('3. PDF loaded');

    // Try to find and click the thumbnails button
    console.log('4. Looking for thumbnails toggle button');

    // Wait for the button with text "Pages"
    await page.waitForSelector('button', { timeout: 5000 });

    // Find button containing "Pages" text
    const buttons = await page.$$('button');
    let thumbnailButton = null;
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Pages')) {
        thumbnailButton = button;
        break;
      }
    }

    if (thumbnailButton) {
      console.log('5. Found thumbnails button, clicking...');
      await thumbnailButton.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
      await page.screenshot({ path: 'screenshots/thumb-simple-03-opened.png', fullPage: true });
      console.log('✅ Thumbnails sidebar should be visible');
    } else {
      console.log('⚠️ Thumbnails button not found');
      await page.screenshot({ path: 'screenshots/thumb-simple-no-button.png', fullPage: true });
    }

    console.log('\n✅ Test complete - check screenshots');
    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'screenshots/thumb-simple-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
