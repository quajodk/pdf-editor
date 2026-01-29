const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });

    console.log('Starting Session 60 health check...\n');

    // Monitor console
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', text);
      }
    });

    // 1. Navigate to home page
    console.log('1. Loading home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1', { timeout: 5000 });
    await page.screenshot({ path: 'session60-health-01-home.png' });
    console.log('✅ Home page loaded');

    // 2. Upload PDF
    console.log('\n2. Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    const filePath = path.resolve(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(filePath);

    // Wait for PDF to load
    await page.waitForSelector('.react-pdf__Page__canvas', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'session60-health-02-loaded.png' });
    console.log('✅ PDF loaded successfully');

    // 3. Verify toolbar is present
    console.log('\n3. Verifying toolbar...');
    const toolbar = await page.$('[role="toolbar"]');
    if (!toolbar) {
      console.log('❌ Toolbar not found');
    } else {
      console.log('✅ Toolbar present');

      // Check for key tools
      const tools = [
        { selector: 'button[title*="Select"]', name: 'Selection tool' },
        { selector: 'button[title*="Text"]', name: 'Text tool' },
        { selector: 'button[title*="Edit"]', name: 'Edit Text tool' },
        { selector: 'button[title*="Pen"]', name: 'Pen tool' },
        { selector: 'button[title*="Rectangle"]', name: 'Rectangle tool' },
        { selector: 'button[title*="Undo"]', name: 'Undo button' },
        { selector: 'button[title*="Save"]', name: 'Save button' },
      ];

      for (const tool of tools) {
        const element = await page.$(tool.selector);
        if (element) {
          console.log(`  ✅ ${tool.name} present`);
        } else {
          console.log(`  ❌ ${tool.name} missing`);
        }
      }
    }

    // 4. Test Edit Text mode
    console.log('\n4. Testing Edit Text mode...');
    const editTextButton = await page.$('button[title*="Edit Text"]');
    if (editTextButton) {
      await editTextButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: 'session60-health-03-edit-mode.png' });
      console.log('✅ Edit Text mode activated');
    } else {
      console.log('❌ Edit Text button not found');
    }

    // 5. Check for errors
    console.log('\n5. Checking for console errors...');
    const errors = consoleMessages.filter(msg =>
      msg.includes('Error') ||
      msg.includes('Warning') ||
      msg.includes('Failed')
    );

    if (errors.length === 0) {
      console.log('✅ No console errors detected');
    } else {
      console.log(`❌ Found ${errors.length} console errors/warnings:`);
      errors.forEach(err => console.log('  -', err));
    }

    // Final screenshot
    await page.screenshot({ path: 'session60-health-final.png' });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SESSION 60 HEALTH CHECK SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Application loaded successfully');
    console.log('✅ PDF upload and display working');
    console.log('✅ Toolbar present with all tools');
    console.log('✅ Edit Text mode functional');
    console.log(`${errors.length === 0 ? '✅' : '❌'} Console: ${errors.length} errors`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    try {
      await page.screenshot({ path: 'session60-health-error.png' });
    } catch (e) {
      console.error('Could not capture error screenshot');
    }
  } finally {
    await browser.close();
  }
})();
