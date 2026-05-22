const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Starting eraser tool test...');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Navigate to app
  console.log('1. Navigating to app...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'screenshots/eraser-01-home.png' });

  // Upload PDF
  console.log('2. Uploading PDF...');
  const fileInput = await page.$('input[type="file"]');
  const testPdfPath = path.resolve(__dirname, 'test-sample.pdf');
  await fileInput.uploadFile(testPdfPath);

  // Wait for PDF to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  await page.screenshot({ path: 'screenshots/eraser-02-pdf-loaded.png' });

  // Draw something with pen tool
  console.log('3. Drawing with pen tool...');
  await page.click('button:has-text("Pen")');
  await new Promise(resolve => setTimeout(resolve, 500));

  const canvas = await page.$('canvas');
  const boundingBox = await canvas.boundingBox();

  // Draw a simple line
  await page.mouse.move(boundingBox.x + 200, boundingBox.y + 200);
  await page.mouse.down();
  await page.mouse.move(boundingBox.x + 400, boundingBox.y + 200, { steps: 30 });
  await page.mouse.up();
  await new Promise(resolve => setTimeout(resolve, 500));

  // Draw another line
  await page.mouse.move(boundingBox.x + 200, boundingBox.y + 250);
  await page.mouse.down();
  await page.mouse.move(boundingBox.x + 400, boundingBox.y + 250, { steps: 30 });
  await page.mouse.up();
  await new Promise(resolve => setTimeout(resolve, 500));

  await page.screenshot({ path: 'screenshots/eraser-03-drawings-added.png' });

  // Select eraser tool
  console.log('4. Testing eraser tool...');
  await page.click('button:has-text("Eraser")');
  await new Promise(resolve => setTimeout(resolve, 500));

  // Erase part of the first drawing
  console.log('5. Erasing part of drawings...');
  await page.mouse.move(boundingBox.x + 250, boundingBox.y + 200);
  await page.mouse.down();
  await page.mouse.move(boundingBox.x + 350, boundingBox.y + 200, { steps: 20 });
  await page.mouse.up();
  await new Promise(resolve => setTimeout(resolve, 500));

  await page.screenshot({ path: 'screenshots/eraser-04-after-erase.png' });

  // Draw more and erase
  console.log('6. Drawing more...');
  await page.click('button:has-text("Pen")');
  await new Promise(resolve => setTimeout(resolve, 500));

  await page.mouse.move(boundingBox.x + 200, boundingBox.y + 300);
  await page.mouse.down();
  await page.mouse.move(boundingBox.x + 400, boundingBox.y + 350, { steps: 30 });
  await page.mouse.up();
  await new Promise(resolve => setTimeout(resolve, 500));

  await page.screenshot({ path: 'screenshots/eraser-05-more-drawings.png' });

  // Erase the new drawing
  console.log('7. Erasing new drawing...');
  await page.click('button:has-text("Eraser")');
  await new Promise(resolve => setTimeout(resolve, 500));

  await page.mouse.move(boundingBox.x + 250, boundingBox.y + 310);
  await page.mouse.down();
  await page.mouse.move(boundingBox.x + 350, boundingBox.y + 340, { steps: 20 });
  await page.mouse.up();
  await new Promise(resolve => setTimeout(resolve, 500));

  await page.screenshot({ path: 'screenshots/eraser-06-final-result.png' });

  console.log('✅ Eraser tool test complete!');
  console.log('Check screenshots/eraser-*.png for visual verification');
  console.log('Expected: Drawings should be erased when eraser passes over them');

  await new Promise(resolve => setTimeout(resolve, 2000));
  await browser.close();
})();
