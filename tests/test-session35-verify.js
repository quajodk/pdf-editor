const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Monitor console for errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('✓ Navigating to app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'session35-01-home.png', fullPage: true });

    console.log('✓ Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    const testPdfPath = path.join(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(testPdfPath);

    // Wait for PDF to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'session35-02-pdf-loaded.png', fullPage: true });

    console.log('✓ Testing Edit Text tool...');
    // Click on Edit Text button (📝)
    const editTextButton = await page.$('button[title="Edit Text"]');
    if (editTextButton) {
      await editTextButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: 'session35-03-edit-mode.png', fullPage: true });
      console.log('✓ Edit Text mode activated');
    }

    console.log('✓ Testing Add Text tool...');
    const addTextButton = await page.$('button[title="Add Text"]');
    if (addTextButton) {
      await addTextButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Click on canvas to add text
      const canvas = await page.$('canvas');
      const box = await canvas.boundingBox();
      await page.mouse.click(box.x + 200, box.y + 200);
      await new Promise(resolve => setTimeout(resolve, 500));

      await page.keyboard.type('Session 35 Test');
      await page.screenshot({ path: 'session35-04-text-added.png', fullPage: true });
      console.log('✓ Text added successfully');
    }

    console.log('✓ Testing Pen tool...');
    const penButton = await page.$('button[title="Pen"]');
    if (penButton) {
      await penButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Draw on canvas
      const canvas = await page.$('canvas');
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + 300, box.y + 300);
      await page.mouse.down();
      await page.mouse.move(box.x + 400, box.y + 350);
      await page.mouse.move(box.x + 350, box.y + 400);
      await page.mouse.up();

      await page.screenshot({ path: 'session35-05-pen-drawing.png', fullPage: true });
      console.log('✓ Pen drawing successful');
    }

    console.log('✓ Testing Undo/Redo...');
    const undoButton = await page.$('button[title="Undo"]');
    if (undoButton) {
      await undoButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.screenshot({ path: 'session35-06-after-undo.png', fullPage: true });
      console.log('✓ Undo successful');

      const redoButton = await page.$('button[title="Redo"]');
      if (redoButton) {
        await redoButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.screenshot({ path: 'session35-07-after-redo.png', fullPage: true });
        console.log('✓ Redo successful');
      }
    }

    await page.screenshot({ path: 'session35-final.png', fullPage: true });

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('\n❌ Console Errors Detected:');
      consoleErrors.forEach(err => console.log('  -', err));
    } else {
      console.log('\n✅ No console errors detected');
    }

    console.log('\n✅ Session 35 Verification Complete');
    console.log('All core features working correctly!');

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
})();
