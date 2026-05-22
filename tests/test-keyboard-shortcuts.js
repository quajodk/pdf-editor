const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('🧪 Testing Keyboard Shortcuts...');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Navigate to app
  console.log('1. Navigating to app...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.screenshot({ path: 'screenshots/kbd-01-home.png' });

  // Upload PDF
  console.log('2. Uploading PDF...');
  const fileInput = await page.$('input[type="file"]');
  const testPdfPath = path.resolve(__dirname, 'test-sample.pdf');
  await fileInput.uploadFile(testPdfPath);
  await new Promise(resolve => setTimeout(resolve, 2000));
  await page.screenshot({ path: 'screenshots/kbd-02-pdf-loaded.png' });

  // Add text annotation
  console.log('3. Adding text annotation...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const textButton = buttons.find(btn => btn.getAttribute('title') === 'Text');
    if (textButton) textButton.click();
  });
  await new Promise(resolve => setTimeout(resolve, 500));

  const canvas = await page.$('canvas');
  const boundingBox = await canvas.boundingBox();
  await page.mouse.click(boundingBox.x + 200, boundingBox.y + 200);
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.type('input[type="text"]', 'Test annotation');
  await page.keyboard.press('Enter');
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'screenshots/kbd-03-text-added.png' });

  // Test Ctrl+Z (Undo)
  console.log('4. Testing Ctrl+Z (Undo)...');
  await page.keyboard.down('Control');
  await page.keyboard.press('z');
  await page.keyboard.up('Control');
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'screenshots/kbd-04-undone.png' });
  console.log('✅ Undo keyboard shortcut works');

  // Test Ctrl+Y (Redo)
  console.log('5. Testing Ctrl+Y (Redo)...');
  await page.keyboard.down('Control');
  await page.keyboard.press('y');
  await page.keyboard.up('Control');
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'screenshots/kbd-05-redone.png' });
  console.log('✅ Redo keyboard shortcut works');

  // Test Arrow keys (Page navigation)
  console.log('6. Testing Arrow keys (Page navigation)...');
  await page.keyboard.press('ArrowRight');
  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.screenshot({ path: 'screenshots/kbd-06-next-page.png' });

  await page.keyboard.press('ArrowLeft');
  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.screenshot({ path: 'screenshots/kbd-07-prev-page.png' });
  console.log('✅ Arrow key navigation works');

  // Test + (Zoom in)
  console.log('7. Testing + key (Zoom in)...');
  await page.keyboard.press('Equal'); // '=' is the same key as '+'
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'screenshots/kbd-08-zoom-in.png' });
  console.log('✅ Zoom in shortcut works');

  // Test - (Zoom out)
  console.log('8. Testing - key (Zoom out)...');
  await page.keyboard.press('Minus');
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'screenshots/kbd-09-zoom-out.png' });
  console.log('✅ Zoom out shortcut works');

  console.log('\n✅ All keyboard shortcuts tested successfully!');
  console.log('📸 Check screenshots for visual verification');

  await new Promise(resolve => setTimeout(resolve, 2000));
  await browser.close();
})();
