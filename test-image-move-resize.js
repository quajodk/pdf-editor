const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('Navigating to app...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // Upload PDF
  console.log('Uploading PDF...');
  const fileInput = await page.$('input[type="file"][accept=".pdf"]');
  if (fileInput) {
    await fileInput.uploadFile(path.resolve(__dirname, 'test-sample.pdf'));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/01-pdf-uploaded.png' });
  }

  // Add an image
  console.log('Adding image...');
  await page.click('button:has-text("Image")');
  await page.waitForTimeout(500);

  // Click on PDF to place image
  const canvas = await page.$('.absolute.inset-0');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + 200, box.y + 200);
  await page.waitForTimeout(500);

  // Upload an image file (we need to create a test image first)
  console.log('Image tool clicked, file input should appear');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/02-image-tool-active.png' });

  // Test selection
  console.log('Testing selection...');
  await page.click('button:has-text("Select")');
  await page.waitForTimeout(500);

  // Click on the PDF to test selection (should show resize handles if image selected)
  await page.mouse.click(box.x + 200, box.y + 200);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/03-selection-test.png' });

  console.log('Tests completed. Browser will stay open for manual inspection.');
  // Keep browser open for manual testing
  // await browser.close();
})();
