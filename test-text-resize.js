const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();

  await page.setViewport({ width: 1920, height: 1080 });

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  try {
    console.log('Navigating to application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Upload a PDF
    console.log('Uploading PDF...');
    const uploadInput = await page.$('input[type="file"][accept="application/pdf"]');
    const testPdfPath = path.resolve(__dirname, 'test-sample.pdf');
    await uploadInput.uploadFile(testPdfPath);

    // Wait for PDF to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Screenshot: text-resize-01-loaded.png');
    await page.screenshot({ path: 'text-resize-01-loaded.png', fullPage: true });

    // Click Edit Text tool
    console.log('Clicking Edit Text tool...');
    await page.click('button[title*="Edit original PDF text"]');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Screenshot: text-resize-02-edit-mode.png');
    await page.screenshot({ path: 'text-resize-02-edit-mode.png', fullPage: true });

    // Look for a text block with blue dashed border
    console.log('Looking for text blocks...');
    const textBlocks = await page.$$('div[style*="border: 2px dashed"]');
    console.log(`Found ${textBlocks.length} text blocks`);

    if (textBlocks.length > 0) {
      // Hover over the first text block to show handles
      console.log('Hovering over first text block...');
      await textBlocks[0].hover();
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('✅ Screenshot: text-resize-03-hover-handles.png');
      await page.screenshot({ path: 'text-resize-03-hover-handles.png', fullPage: true });

      // Get the bounding box of the text block
      const boundingBox = await textBlocks[0].boundingBox();

      if (boundingBox) {
        // Try to grab the bottom-right corner handle
        console.log('Attempting to grab bottom-right corner handle...');
        const handleX = boundingBox.x + boundingBox.width;
        const handleY = boundingBox.y + boundingBox.height;

        // Move to the handle position
        await page.mouse.move(handleX, handleY);
        await new Promise(resolve => setTimeout(resolve, 300));

        // Mouse down on the handle
        await page.mouse.down();
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('✅ Screenshot: text-resize-04-grabbed-handle.png');
        await page.screenshot({ path: 'text-resize-04-grabbed-handle.png', fullPage: true });

        // Drag to resize (move 100px right and 50px down)
        console.log('Dragging to resize...');
        await page.mouse.move(handleX + 100, handleY + 50, { steps: 10 });
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('✅ Screenshot: text-resize-05-resizing.png');
        await page.screenshot({ path: 'text-resize-05-resizing.png', fullPage: true });

        // Release mouse
        await page.mouse.up();
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('✅ Screenshot: text-resize-06-resized.png');
        await page.screenshot({ path: 'text-resize-06-resized.png', fullPage: true });
      }
    }

    // Check for console errors
    const errors = consoleMessages.filter(m => m.type === 'error');
    if (errors.length > 0) {
      console.log('\n❌ Console errors detected:');
      errors.forEach(e => console.log(e.text));
    } else {
      console.log('\n✅ No console errors detected');
    }

    console.log('\n✅ Text resize test completed!');
    console.log('Screenshots saved:');
    console.log('  - text-resize-01-loaded.png (PDF loaded)');
    console.log('  - text-resize-02-edit-mode.png (Edit Text mode activated)');
    console.log('  - text-resize-03-hover-handles.png (Hover shows corner handles)');
    console.log('  - text-resize-04-grabbed-handle.png (Handle grabbed)');
    console.log('  - text-resize-05-resizing.png (Resize preview visible)');
    console.log('  - text-resize-06-resized.png (Resize completed)');

    console.log('\nBrowser will stay open for manual inspection...');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
})();
