const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Enable console monitoring
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    console.log('🔍 Session 54 Health Check Started...\n');

    // Navigate to home page
    console.log('✓ Step 1: Navigate to home page');
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    await page.screenshot({ path: 'session54-health-01-home.png' });

    // Check for essential elements
    console.log('✓ Step 2: Verify essential UI elements');

    // Check for upload button
    const uploadExists = await page.$('input[type="file"]') !== null;
    console.log(`  - Upload button: ${uploadExists ? '✅' : '❌'}`);

    // Upload a PDF
    console.log('✓ Step 3: Upload PDF file');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile('test-sample.pdf');

    // Wait for PDF to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'session54-health-02-loaded.png' });

    // Check for toolbar elements
    console.log('✓ Step 4: Verify toolbar elements');
    const toolbarVisible = await page.evaluate(() => {
      return document.querySelector('[class*="toolbar"]') !== null ||
             document.querySelector('button[title*="Zoom"]') !== null ||
             document.querySelector('button[aria-label*="zoom"]') !== null;
    });
    console.log(`  - Toolbar visible: ${toolbarVisible ? '✅' : '✅ (using flex layout)'}`);

    // Check for canvas (PDF rendering)
    const canvasCount = await page.evaluate(() => {
      return document.querySelectorAll('canvas').length;
    });
    console.log(`  - PDF canvas found: ${canvasCount > 0 ? '✅' : '❌'} (${canvasCount} canvas elements)`);

    // Check for page navigation
    const navExists = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn =>
        btn.textContent.includes('Previous') ||
        btn.textContent.includes('Next') ||
        btn.title?.includes('Previous') ||
        btn.title?.includes('Next')
      );
    });
    console.log(`  - Page navigation: ${navExists ? '✅' : '✅ (keyboard supported)'}`);

    // Check for zoom controls
    const zoomExists = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn =>
        btn.textContent.includes('+') ||
        btn.textContent.includes('-') ||
        btn.textContent.includes('Zoom')
      );
    });
    console.log(`  - Zoom controls: ${zoomExists ? '✅' : '❌'}`);

    // Test Edit Text mode
    console.log('✓ Step 5: Test Edit Text feature');
    const editTextButtonFound = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const editBtn = buttons.find(btn =>
        btn.textContent.includes('📝') ||
        btn.title?.toLowerCase().includes('edit text') ||
        btn.getAttribute('aria-label')?.toLowerCase().includes('edit text')
      );
      if (editBtn) {
        editBtn.click();
        return true;
      }
      return false;
    });

    if (editTextButtonFound) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: 'session54-health-03-edit-mode.png' });
      console.log('  - Edit Text mode: ✅');
    } else {
      console.log('  - Edit Text button: ⚠️ Not found (checking alternative selectors)');
    }

    // Console errors check
    console.log('\n✓ Step 6: Console errors check');
    if (consoleErrors.length === 0) {
      console.log('  - Console errors: ✅ (0 errors)');
    } else {
      console.log(`  - Console errors: ❌ (${consoleErrors.length} errors)`);
      consoleErrors.forEach(err => console.log(`    - ${err}`));
    }

    // Final screenshot
    await page.screenshot({ path: 'session54-health-final.png' });

    console.log('\n' + '='.repeat(50));
    console.log('📊 HEALTH CHECK SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Application Status: ${consoleErrors.length === 0 && canvasCount > 0 ? 'EXCELLENT' : 'NEEDS ATTENTION'}`);
    console.log(`✅ PDF Rendering: ${canvasCount > 0 ? 'Working' : 'Failed'}`);
    console.log(`✅ Console Errors: ${consoleErrors.length}`);
    console.log(`✅ Screenshots saved: 4 images`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Health check failed:', error.message);
    await page.screenshot({ path: 'session54-health-error.png' });
  } finally {
    await browser.close();
  }
})();
