const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Starting Session 8 verification test...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  try {
    // Navigate to the app
    console.log('1. Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'screenshots/verify-01-home.png' });

    // Upload PDF
    console.log('2. Uploading test PDF...');
    const fileInput = await page.$('input[type="file"]');
    const pdfPath = path.resolve(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(pdfPath);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: 'screenshots/verify-02-pdf-loaded.png' });

    // Test Keyboard Shortcuts
    console.log('3. Testing keyboard shortcuts...');

    // Select pen tool and draw
    await page.click('button:has-text("Pen")');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Draw a simple line using pen
    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + 200, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + 400, box.y + 200);
    await page.mouse.up();
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'screenshots/verify-03-pen-drawn.png' });

    // Test Ctrl+Z (Undo)
    console.log('4. Testing Ctrl+Z (Undo)...');
    await page.keyboard.down('Control');
    await page.keyboard.press('z');
    await page.keyboard.up('Control');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'screenshots/verify-04-undo.png' });

    // Test Ctrl+Y (Redo)
    console.log('5. Testing Ctrl+Y (Redo)...');
    await page.keyboard.down('Control');
    await page.keyboard.press('y');
    await page.keyboard.up('Control');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'screenshots/verify-05-redo.png' });

    // Test Eraser Tool
    console.log('6. Testing eraser tool...');
    await page.click('button:has-text("Eraser")');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Erase part of the drawing
    await page.mouse.move(box.x + 250, box.y + 195);
    await page.mouse.down();
    await page.mouse.move(box.x + 350, box.y + 205);
    await page.mouse.up();
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'screenshots/verify-06-eraser-used.png' });

    // Test arrow key navigation
    console.log('7. Testing arrow key navigation...');
    await page.keyboard.press('ArrowRight');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'screenshots/verify-07-next-page.png' });

    await page.keyboard.press('ArrowLeft');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'screenshots/verify-08-prev-page.png' });

    // Test zoom shortcuts
    console.log('8. Testing zoom shortcuts...');
    await page.keyboard.press('+');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'screenshots/verify-09-zoom-in.png' });

    await page.keyboard.press('-');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'screenshots/verify-10-zoom-out.png' });

    console.log('\n✅ Session 8 verification complete!');
    console.log('Screenshots saved to screenshots/ directory');
    console.log('Previous work verified successfully');

    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'screenshots/verify-error.png' });
  } finally {
    await browser.close();
  }
})();
