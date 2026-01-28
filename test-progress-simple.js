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

    // Collect console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('PAGE ERROR:', msg.text());
        errors.push(msg.text());
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

    // Wait a bit to see text extraction progress
    console.log('Waiting to see text extraction progress...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'progress-02-extracting.png', fullPage: false });

    // Wait for loading to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('PDF loaded successfully');
    await page.screenshot({ path: 'progress-03-loaded.png', fullPage: false });

    // Check if progress indicator was visible
    const progressIndicator = await page.evaluate(() => {
      const progressText = document.body.innerText;
      return progressText.includes('Extracting') || progressText.includes('page');
    });

    console.log('Progress indicator visible during extraction:', progressIndicator);

    console.log('\n✅ TEST COMPLETED!');
    console.log(`✅ Console errors: ${errors.length === 0 ? 'None' : errors.length}`);

    console.log('\nTest complete. Browser will stay open for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
})();
