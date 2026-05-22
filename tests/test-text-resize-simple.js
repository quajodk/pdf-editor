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
  await page.screenshot({ path: 'session28-01-loaded.png' });

  console.log('Clicking Edit Text button (📝)...');
  // Find the button with the emoji
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const editTextButton = buttons.find(btn => btn.textContent.includes('📝'));
    if (editTextButton) {
      editTextButton.click();
    }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.screenshot({ path: 'session28-02-edit-mode.png' });

  console.log('Getting original dimensions of first text block...');
  const originalDims = await page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll('div[style*="dashed"]'));
    if (blocks.length === 0) return null;
    const rect = blocks[0].getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });

  if (!originalDims) {
    console.error('❌ No text blocks found!');
    await browser.close();
    return;
  }

  console.log('Original dimensions:', originalDims);

  console.log('Hovering to show handles...');
  await page.mouse.move(originalDims.x + 10, originalDims.y + 10);
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'session28-03-hover-handles.png' });

  console.log('Dragging bottom-right handle to resize...');
  const handleX = originalDims.x + originalDims.width;
  const handleY = originalDims.y + originalDims.height;

  await page.mouse.move(handleX, handleY);
  await new Promise(resolve => setTimeout(resolve, 200));
  await page.mouse.down();
  await new Promise(resolve => setTimeout(resolve, 100));

  // Drag 100px right and 50px down
  await page.mouse.move(handleX + 100, handleY + 50, { steps: 20 });
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'session28-04-resizing.png' });

  await page.mouse.up();
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('Moving mouse away to deselect...');
  await page.mouse.move(100, 100);
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'session28-05-after-resize.png' });

  console.log('Getting new dimensions...');
  const newDims = await page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll('div[style*="dashed"]'));
    if (blocks.length === 0) return null;
    const rect = blocks[0].getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });

  console.log('New dimensions:', newDims);

  if (newDims) {
    const widthDiff = newDims.width - originalDims.width;
    const heightDiff = newDims.height - originalDims.height;

    console.log('Width change:', widthDiff, 'px');
    console.log('Height change:', heightDiff, 'px');

    if (Math.abs(widthDiff) > 50 && Math.abs(heightDiff) > 20) {
      console.log('✅ PASS: Resize persisted successfully!');
    } else {
      console.log('❌ FAIL: Resize did not persist');
    }
  } else {
    console.log('❌ FAIL: Could not get new dimensions');
  }

  console.log('Hovering again to verify handles match new size...');
  await page.mouse.move(newDims.x + 10, newDims.y + 10);
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'session28-06-hover-after.png' });

  console.log('\nTest complete! Browser will stay open for 10 seconds...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  await browser.close();
})();
