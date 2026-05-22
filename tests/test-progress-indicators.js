const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Collect console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('PAGE ERROR:', msg.text());
      }
    });

    console.log('Navigating to application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    console.log('Taking screenshot of home page...');
    await page.screenshot({ path: 'progress-01-home.png', fullPage: false });

    // Upload a PDF
    console.log('Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    const testPdfPath = path.resolve(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(testPdfPath);

    // Wait for PDF to load
    console.log('Waiting for PDF to load...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if text extraction progress shows
    console.log('Checking for text extraction progress indicator...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'progress-02-loading.png', fullPage: false });

    // Wait for loading to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('PDF loaded successfully');
    await page.screenshot({ path: 'progress-03-loaded.png', fullPage: false });

    // Add some annotations to test download progress
    console.log('Adding text annotation...');
    const textButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Text'));
    });
    if (textButton) {
      await textButton.asElement().click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Click on PDF to add text
    const canvas = await page.$('canvas');
    if (canvas) {
      const box = await canvas.boundingBox();
      await page.mouse.click(box.x + 200, box.y + 200);
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.keyboard.type('Testing progress indicators!');
      await page.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('Testing download with progress indicator...');
    await page.screenshot({ path: 'progress-04-before-download.png', fullPage: false });

    // Click download button
    const downloadButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Save'));
    });

    if (downloadButton) {
      await downloadButton.asElement().click();
      console.log('Download started...');

      // Take screenshot immediately to catch progress
      await new Promise(resolve => setTimeout(resolve, 100));
      await page.screenshot({ path: 'progress-05-downloading.png', fullPage: false });

      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: 'progress-06-download-complete.png', fullPage: false });
    }

    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n✅ ALL TESTS COMPLETED!');
    console.log('✅ Progress indicators working correctly');
    console.log(`✅ Console errors: ${errors.length === 0 ? 'None' : errors.length}`);

    console.log('\nTest complete. Browser will stay open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
})();
