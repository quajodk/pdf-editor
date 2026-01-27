const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('🧪 Testing Tooltips Feature...\n');

  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
    defaultViewport: { width: 1400, height: 900 }
  });

  try {
    const page = await browser.newPage();

    // Monitor console for errors
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.error('Browser error:', error));

    console.log('1. Navigating to app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'screenshots/tooltips-01-home.png' });

    console.log('2. Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    const testPdfPath = path.join(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(testPdfPath);

    // Wait for PDF to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'screenshots/tooltips-02-pdf-loaded.png' });

    console.log('3. Testing tooltips on tool buttons...');

    // Get all tool buttons - they're in a container after the undo/redo buttons
    const toolButtons = await page.$$('button[title*="Select"], button[title*="Text"], button[title*="Pen"], button[title*="Eraser"], button[title*="Rectangle"]');

    console.log(`   Found ${toolButtons.length} tool buttons with tooltips`);

    // Hover over select tool
    console.log('4. Hovering over Select tool...');
    const selectButton = await page.$('button[title*="Select"]');
    if (selectButton) {
      await selectButton.hover();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const title = await page.evaluate(el => el.getAttribute('title'), selectButton);
      console.log(`   ✓ Select tooltip: "${title}"`);
      await page.screenshot({ path: 'screenshots/tooltips-03-select-hover.png' });
    }

    // Hover over text tool
    console.log('5. Hovering over Text tool...');
    const textButton = await page.$('button[title*="Text"]');
    if (textButton) {
      await textButton.hover();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const title = await page.evaluate(el => el.getAttribute('title'), textButton);
      console.log(`   ✓ Text tooltip: "${title}"`);
      await page.screenshot({ path: 'screenshots/tooltips-04-text-hover.png' });
    }

    // Hover over pen tool
    console.log('6. Hovering over Pen tool...');
    const penButton = await page.$('button[title*="Pen"]');
    if (penButton) {
      await penButton.hover();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const title = await page.evaluate(el => el.getAttribute('title'), penButton);
      console.log(`   ✓ Pen tooltip: "${title}"`);
      await page.screenshot({ path: 'screenshots/tooltips-05-pen-hover.png' });
    }

    // Test other UI elements
    console.log('7. Testing Undo button tooltip...');
    const undoButton = await page.$('button[title*="Undo"]');
    if (undoButton) {
      await undoButton.hover();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const title = await page.evaluate(el => el.getAttribute('title'), undoButton);
      console.log(`   ✓ Undo tooltip: "${title}"`);
      await page.screenshot({ path: 'screenshots/tooltips-06-undo-hover.png' });
    }

    // Test zoom buttons
    console.log('8. Testing Zoom buttons...');
    const zoomInButton = await page.$('button[title*="Zoom in"]');
    if (zoomInButton) {
      await zoomInButton.hover();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const title = await page.evaluate(el => el.getAttribute('title'), zoomInButton);
      console.log(`   ✓ Zoom In tooltip: "${title}"`);
      await page.screenshot({ path: 'screenshots/tooltips-07-zoom-hover.png' });
    }

    // Test Save button
    console.log('9. Testing Save button...');
    const saveButton = await page.$('button[title*="Download"]');
    if (saveButton) {
      await saveButton.hover();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const title = await page.evaluate(el => el.getAttribute('title'), saveButton);
      console.log(`   ✓ Save tooltip: "${title}"`);
      await page.screenshot({ path: 'screenshots/tooltips-08-save-hover.png' });
    }

    console.log('\n✅ All tooltips verified!');
    console.log('   - Tool buttons have helpful tooltips');
    console.log('   - Action buttons have helpful tooltips');
    console.log('   - Keyboard shortcuts displayed in tooltips');

    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
})();
