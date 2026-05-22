const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });
  const page = await browser.newPage();

  const consoleMessages = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    }
  });

  try {
    console.log('Navigating to application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Wait for the page to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Upload a PDF
    console.log('Uploading PDF...');
    const fileInput = await page.waitForSelector('input[type="file"]');
    const testPdfPath = path.resolve(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(testPdfPath);

    // Wait for PDF to load
    console.log('Waiting for PDF to load...');
    await new Promise(resolve => setTimeout(resolve, 4000));

    await page.screenshot({ path: 'text-resize-01-loaded.png', fullPage: true });
    console.log('✅ Screenshot: text-resize-01-loaded.png');

    // Click Edit Text tool - look for the button by its emoji icon
    console.log('Looking for Edit Text button...');
    const buttons = await page.$$('button');
    let editTextButton = null;

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && text.includes('📝')) {
        editTextButton = button;
        break;
      }
    }

    if (editTextButton) {
      console.log('✅ Found Edit Text button, clicking...');
      await editTextButton.click();
      await new Promise(resolve => setTimeout(resolve, 1500));
      await page.screenshot({ path: 'text-resize-02-edit-mode.png', fullPage: true });
      console.log('✅ Screenshot: text-resize-02-edit-mode.png');
    } else {
      console.log('❌ Edit Text button not found');
    }

    // Check for console errors
    const errors = consoleMessages.filter(m => m.type === 'error');
    if (errors.length > 0) {
      console.log('\n❌ Console errors detected:');
      errors.forEach(e => console.log(e.text));
    } else {
      console.log('\n✅ No console errors detected');
    }

    console.log('\n✅ Test completed!');
    console.log('\n📋 Manual verification steps:');
    console.log('1. You should see blue dashed borders around text blocks');
    console.log('2. Hover over a text block - you should see 4 blue corner handles');
    console.log('3. The corner handles should have cursor: nwse-resize or nesw-resize');
    console.log('4. Try dragging a corner handle to resize the text block');
    console.log('5. You should see a blue dashed preview box while dragging');
    console.log('6. The preview should show the new dimensions (width × height)');
    console.log('7. Release the mouse to complete the resize');
    console.log('\nBrowser will stay open for manual testing...');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await browser.close();
  }
})();
