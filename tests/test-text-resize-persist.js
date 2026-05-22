const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1400,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // Monitor console
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  console.log('Navigating to application...');
  await page.goto('http://localhost:3000');
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('Uploading PDF...');
  const pdfPath = path.join(__dirname, 'test-sample.pdf');
  const input = await page.$('input[type="file"]');
  await input.uploadFile(pdfPath);
  await new Promise(resolve => setTimeout(resolve, 3000));
  await page.screenshot({ path: 'text-resize-persist-01-loaded.png' });

  console.log('Clicking Edit Text tool...');
  const editTextButton = await page.$('button[aria-label="Edit Text tool"]');
  if (!editTextButton) {
    console.error('Edit Text tool button not found!');
    await browser.close();
    return;
  }
  await editTextButton.click();
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'text-resize-persist-02-edit-mode.png' });

  console.log('Finding first text block with handles...');
  // Wait for text blocks to be visible with dotted borders
  await page.waitForSelector('div[style*="dashed"]', { timeout: 5000 });

  // Get the first text block's position and size
  const textBlock = await page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll('div[style*="dashed"]'));
    if (blocks.length === 0) return null;

    const block = blocks[0];
    const rect = block.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    };
  });

  if (!textBlock) {
    console.error('No text block found!');
    await browser.close();
    return;
  }

  console.log('Original text block dimensions:', textBlock);

  console.log('Hovering over text block to show handles...');
  await page.mouse.move(textBlock.x + 10, textBlock.y + 10);
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'text-resize-persist-03-hover.png' });

  console.log('Grabbing bottom-right corner handle...');
  const handleX = textBlock.x + textBlock.width;
  const handleY = textBlock.y + textBlock.height;

  // Move to the handle
  await page.mouse.move(handleX, handleY);
  await new Promise(resolve => setTimeout(resolve, 200));

  // Drag to resize (make it larger)
  await page.mouse.down();
  await new Promise(resolve => setTimeout(resolve, 100));
  const newX = handleX + 100;
  const newY = handleY + 50;
  await page.mouse.move(newX, newY, { steps: 10 });
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'text-resize-persist-04-resizing.png' });

  console.log('Releasing mouse to complete resize...');
  await page.mouse.up();
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('Checking if resize persisted...');
  // Move mouse away from the text block
  await page.mouse.move(100, 100);
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'text-resize-persist-05-after-release.png' });

  // Get the text block's new dimensions
  const newTextBlock = await page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll('div[style*="dashed"]'));
    if (blocks.length === 0) return null;

    const block = blocks[0];
    const rect = block.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    };
  });

  console.log('New text block dimensions:', newTextBlock);

  // Check if dimensions actually changed
  if (newTextBlock &&
      (Math.abs(newTextBlock.width - textBlock.width) > 50 ||
       Math.abs(newTextBlock.height - textBlock.height) > 20)) {
    console.log('✅ Resize persisted! Width changed by:', newTextBlock.width - textBlock.width);
    console.log('✅ Height changed by:', newTextBlock.height - textBlock.height);
  } else {
    console.log('❌ Resize did not persist! Dimensions are the same.');
  }

  // Hover again to verify handles are still in correct position
  console.log('Hovering again to verify handle positions...');
  await page.mouse.move(newTextBlock.x + 10, newTextBlock.y + 10);
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'text-resize-persist-06-hover-after.png' });

  console.log('Test complete. Browser will stay open for inspection...');
  // Keep browser open for inspection
  await new Promise(resolve => setTimeout(resolve, 30000));
  await browser.close();
})();
