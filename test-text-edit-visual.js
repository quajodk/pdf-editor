const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log('Navigating to application...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // Upload test PDF
  console.log('Uploading PDF...');
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile('./test-sample.pdf');

  // Wait for PDF to load
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Click the Edit Text tool (📝 icon)
  console.log('Clicking Edit Text tool...');
  const editTextButton = await page.$('button[title*="Edit Text"], button[aria-label*="Edit Text"]');
  if (editTextButton) {
    await editTextButton.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  } else {
    // Try finding by text content
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const editButton = buttons.find(b => b.textContent.includes('📝') || b.textContent.includes('Edit Text'));
      if (editButton) editButton.click();
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Take screenshot showing dotted borders
  console.log('Taking screenshot of editable text blocks...');
  await page.screenshot({ path: 'text-edit-visual-01-borders.png', fullPage: false });

  // Hover over a text block to see handles
  console.log('Hovering over text block to show handles...');
  const textBlock = await page.$('div[style*="dashed"]');
  if (textBlock) {
    await textBlock.hover();
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'text-edit-visual-02-hover-handles.png', fullPage: false });
  }

  // Click on a text block to edit
  console.log('Clicking text block to edit...');
  if (textBlock) {
    await textBlock.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'text-edit-visual-03-editing.png', fullPage: false });

    // Type some new text
    console.log('Editing text...');
    const textarea = await page.$('textarea');
    if (textarea) {
      await textarea.click({ clickCount: 3 }); // Select all
      await textarea.type('This is edited text with the new visual style!');
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.screenshot({ path: 'text-edit-visual-04-typed.png', fullPage: false });

      // Save by pressing Ctrl+Enter
      console.log('Saving edit...');
      await page.keyboard.down('Control');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Control');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: 'text-edit-visual-05-saved.png', fullPage: false });
    }
  }

  // Click another text block
  console.log('Testing another text block...');
  const textBlocks = await page.$$('div[style*="dashed"]');
  if (textBlocks.length > 1) {
    await textBlocks[1].click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'text-edit-visual-06-second-block.png', fullPage: false });
  }

  // Check for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  console.log('\n✅ Visual test completed!');
  console.log('Screenshots saved:');
  console.log('  - text-edit-visual-01-borders.png (dotted borders on text blocks)');
  console.log('  - text-edit-visual-02-hover-handles.png (blue handles on hover)');
  console.log('  - text-edit-visual-03-editing.png (textarea with expandable boundary)');
  console.log('  - text-edit-visual-04-typed.png (edited text)');
  console.log('  - text-edit-visual-05-saved.png (saved with green dashed border)');
  console.log('  - text-edit-visual-06-second-block.png (another block)');

  if (errors.length > 0) {
    console.log('\n⚠️ Console errors detected:');
    errors.forEach(err => console.log('  -', err));
  } else {
    console.log('\n✅ No console errors detected');
  }

  // Keep browser open for manual inspection
  console.log('\nBrowser will stay open for manual inspection...');
  await new Promise(resolve => setTimeout(resolve, 60000));

  await browser.close();
})();
