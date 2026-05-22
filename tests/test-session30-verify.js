const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // Navigate to the app
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Take screenshot of home page
  await page.screenshot({ path: 'session30-01-home.png', fullPage: false });
  console.log('✅ Screenshot saved: session30-01-home.png');

  // Upload test PDF
  const pdfPath = path.join(__dirname, 'test-sample.pdf');
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(pdfPath);
  console.log('✅ PDF uploaded');

  // Wait for PDF to load
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Take screenshot of loaded PDF
  await page.screenshot({ path: 'session30-02-loaded.png', fullPage: false });
  console.log('✅ Screenshot saved: session30-02-loaded.png');

  await browser.close();
  console.log('✅ Verification complete');
})();
