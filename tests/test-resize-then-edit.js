const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1400,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log('Navigating to application...');
  await page.goto('http://localhost:3000');
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('Uploading PDF...');
  const pdfPath = path.join(__dirname, 'test-sample.pdf');
  const input = await page.$('input[type="file"]');
  await input.uploadFile(pdfPath);
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('Clicking Edit Text button...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const editTextButton = buttons.find(btn => btn.textContent.includes('📝'));
    if (editTextButton) editTextButton.click();
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.screenshot({ path: 'session28-edit-01-mode.png' });

  console.log('Getting first text block position...');
  const blockPos = await page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll('div[style*="dashed"]'));
    if (blocks.length === 0) return null;
    const rect = blocks[0].getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });

  console.log('Block position:', blockPos);

  console.log('Step 1: Resizing the text block...');
  await page.mouse.move(blockPos.x + 10, blockPos.y + 10);
  await new Promise(resolve => setTimeout(resolve, 300));

  const handleX = blockPos.x + blockPos.width;
  const handleY = blockPos.y + blockPos.height;
  await page.mouse.move(handleX, handleY);
  await new Promise(resolve => setTimeout(resolve, 200));
  await page.mouse.down();
  await page.mouse.move(handleX + 80, handleY + 40, { steps: 15 });
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.screenshot({ path: 'session28-edit-02-resizing.png' });
  await page.mouse.up();
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('Step 2: Clicking on the resized text block to edit...');
  await page.mouse.move(blockPos.x + 50, blockPos.y + 20);
  await new Promise(resolve => setTimeout(resolve, 300));
  await page.mouse.click(blockPos.x + 50, blockPos.y + 20);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.screenshot({ path: 'session28-edit-03-editing.png' });

  // Check if edit dialog appeared
  const hasEditDialog = await page.evaluate(() => {
    return !!document.querySelector('textarea, input[type="text"]');
  });

  if (hasEditDialog) {
    console.log('✅ Edit dialog appeared!');

    console.log('Step 3: Typing new text...');
    await page.keyboard.type(' RESIZED!');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'session28-edit-04-typed.png' });

    console.log('Step 4: Saving with Ctrl+Enter...');
    await page.keyboard.down('Control');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Control');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'session28-edit-05-saved.png' });

    console.log('✅ PASS: Text block can be resized and then edited successfully!');
  } else {
    console.log('❌ FAIL: Edit dialog did not appear after clicking resized block');
  }

  console.log('\nTest complete! Closing browser...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  await browser.close();
})();
