const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('🧪 Testing Eraser Tool...');

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
  await new Promise(resolve => setTimeout(resolve, 2000));
  await page.screenshot({ path: 'screenshots/eraser-02-pdf-loaded.png' });

  // Click pen tool
  console.log('3. Selecting Pen tool...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const penButton = buttons.find(btn => btn.textContent.includes('✏'));
    if (penButton) penButton.click();
  });
  await new Promise(resolve => setTimeout(resolve, 500));

  // Draw with pen
  console.log('4. Drawing with pen...');
  const canvas = await page.$('canvas');
  const boundingBox = await canvas.boundingBox();

  // Draw first line
  await page.mouse.move(boundingBox.x + 200, boundingBox.y + 200);
  await page.mouse.down();
  await page.mouse.move(boundingBox.x + 400, boundingBox.y + 200, { steps: 30 });
  await page.mouse.up();
  await new Promise(resolve => setTimeout(resolve, 300));

  // Draw second line
  await page.mouse.move(boundingBox.x + 200, boundingBox.y + 250);
  await page.mouse.down();
  await page.mouse.move(boundingBox.x + 400, boundingBox.y + 250, { steps: 30 });
  await page.mouse.up();
  await new Promise(resolve => setTimeout(resolve, 300));

  // Draw third line
  await page.mouse.move(boundingBox.x + 200, boundingBox.y + 300);
  await page.mouse.down();
  await page.mouse.move(boundingBox.x + 400, boundingBox.y + 300, { steps: 30 });
  await page.mouse.up();
  await new Promise(resolve => setTimeout(resolve, 500));

  await page.screenshot({ path: 'screenshots/eraser-03-drawn.png' });
  console.log('✅ Drawing complete');

  // Select eraser tool
  console.log('5. Selecting Eraser tool...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const eraserButton = buttons.find(btn => btn.textContent.includes('⌫'));
    if (eraserButton) {
      console.log('Found eraser button, clicking...');
      eraserButton.click();
    } else {
      console.log('Eraser button not found!');
    }
  });
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'screenshots/eraser-04-eraser-selected.png' });

  // Erase middle line
  console.log('6. Erasing middle line...');
  await page.mouse.move(boundingBox.x + 200, boundingBox.y + 250);
  await page.mouse.down();
  await page.mouse.move(boundingBox.x + 400, boundingBox.y + 250, { steps: 30 });
  await page.mouse.up();
  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.screenshot({ path: 'screenshots/eraser-05-erased.png' });

  console.log('✅ Eraser test complete!');
  console.log('📸 Check screenshots to verify middle line was erased');

  // Check console for errors
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(msg.text()));

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n📋 Console logs:', consoleLogs.length > 0 ? consoleLogs.join('\n') : 'None');

  await browser.close();
})();
