const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // Track console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  console.log('🚀 Starting verification...\n');

  // Upload PDF
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const pdfPath = path.join(__dirname, 'test-sample.pdf');
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(pdfPath);
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('✅ PDF loaded');
  await page.screenshot({ path: 'session30-verify-01.png' });

  // Test Edit Text Tool
  const editTextButton = await page.$('button[aria-label="Edit Text tool"]');
  if (editTextButton) {
    await editTextButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    const textBlocks = await page.$$('div[style*="dashed"]');
    console.log(`✅ Edit Text mode: ${textBlocks.length} text blocks found`);
    await page.screenshot({ path: 'session30-verify-02-edit.png' });
  }

  // Test text block resizing
  console.log('\nTesting text block resize...');
  const textBlock = await page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll('div[style*="dashed"]'));
    if (blocks.length === 0) return null;
    const block = blocks[0];
    const rect = block.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });

  if (textBlock) {
    // Hover to show handles
    await page.mouse.move(textBlock.x + 10, textBlock.y + 10);
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'session30-verify-03-hover.png' });

    // Grab corner handle and resize
    const handleX = textBlock.x + textBlock.width;
    const handleY = textBlock.y + textBlock.height;
    await page.mouse.move(handleX, handleY);
    await page.mouse.down();
    await page.mouse.move(handleX + 80, handleY + 40, { steps: 10 });
    await new Promise(resolve => setTimeout(resolve, 300));
    await page.screenshot({ path: 'session30-verify-04-resizing.png' });
    await page.mouse.up();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify resize persisted
    const newTextBlock = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('div[style*="dashed"]'));
      if (blocks.length === 0) return null;
      const block = blocks[0];
      const rect = block.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    if (newTextBlock && Math.abs(newTextBlock.width - textBlock.width) > 50) {
      console.log('✅ Text block resize working - width changed by:', Math.round(newTextBlock.width - textBlock.width));
    } else {
      console.log('⚠️  Resize may not have persisted');
    }
    await page.screenshot({ path: 'session30-verify-05-resized.png' });
  }

  // Switch to Selection tool
  const selectionButton = await page.$('button[aria-label="Selection tool"]');
  if (selectionButton) {
    await selectionButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✅ Selection tool activated');
    await page.screenshot({ path: 'session30-verify-06-selection.png' });
  }

  // Check for console errors
  console.log('\n' + '='.repeat(50));
  if (errors.length > 0) {
    console.log('⚠️  Console Errors:');
    errors.forEach(err => console.log('  -', err));
  } else {
    console.log('✅ No console errors detected');
  }
  console.log('='.repeat(50));

  await browser.close();
  console.log('\n✅ Verification complete!');
})();
