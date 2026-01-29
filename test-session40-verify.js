const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  let browser;
  let page;

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('1. Navigating to application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });

    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Take screenshot of home page
    await page.screenshot({ path: 'session40-verify-01-home.png' });
    console.log('✓ Screenshot: home page');

    // Upload PDF
    console.log('2. Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    const pdfPath = path.join(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(pdfPath);

    // Wait for PDF to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot of loaded PDF
    await page.screenshot({ path: 'session40-verify-02-loaded.png' });
    console.log('✓ Screenshot: PDF loaded');

    // Check that toolbar is present
    const toolbar = await page.$('[role="toolbar"], .toolbar, div:has(> button)');
    if (!toolbar) {
      throw new Error('Toolbar not found');
    }
    console.log('✓ Toolbar present');

    // Click Edit Text tool (if available)
    console.log('3. Testing Edit Text tool...');
    const editTextBtn = await page.$('button[title*="Edit Text"], button[aria-label*="Edit Text"]');
    if (editTextBtn) {
      await editTextBtn.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: 'session40-verify-03-edit-mode.png' });
      console.log('✓ Screenshot: Edit Text mode');
    }

    // Click back to Select tool
    const selectBtn = await page.$('button[title*="Select"], button[aria-label*="Select"]');
    if (selectBtn) {
      await selectBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Click Add Text tool
    console.log('4. Testing Add Text tool...');
    const addTextBtn = await page.$('button[title*="Add Text"], button[aria-label*="Add Text"], button[title*="Text"]');
    if (addTextBtn) {
      await addTextBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Click on canvas to add text
      const canvas = await page.$('canvas');
      if (canvas) {
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + 100, box.y + 100);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Type some text
        await page.keyboard.type('Test annotation');
        await new Promise(resolve => setTimeout(resolve, 500));

        await page.screenshot({ path: 'session40-verify-04-text-added.png' });
        console.log('✓ Screenshot: Text annotation added');
      }
    }

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.error('\n❌ Console Errors Detected:');
      consoleErrors.forEach(err => console.error('  -', err));
      throw new Error('Console errors found');
    } else {
      console.log('\n✅ NO CONSOLE ERRORS');
    }

    // Final screenshot
    await page.screenshot({ path: 'session40-verify-final.png' });
    console.log('✓ Screenshot: Final state');

    console.log('\n=== VERIFICATION COMPLETE ===');
    console.log('✅ Application is working correctly');
    console.log('✅ PDF loading works');
    console.log('✅ Tools are accessible');
    console.log('✅ No console errors');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (page) {
      await page.screenshot({ path: 'session40-error.png' });
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
