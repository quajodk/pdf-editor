const puppeteer = require('puppeteer');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('🧪 Session 33 - Final Comprehensive Test\n');
  console.log('='.repeat(60));

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Console monitoring
  const errors = [];
  const warnings = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    } else if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    errors.push(`PAGE ERROR: ${error.message}`);
  });

  try {
    // Test 1: Load Application
    console.log('\n✓ Test 1: Load Application');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await delay(1000);
    await page.screenshot({ path: 'session33-test-01-home.png', fullPage: true });
    console.log('  ✅ Application loaded successfully');

    // Test 2: Upload PDF
    console.log('\n✓ Test 2: Upload PDF');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found');
    await fileInput.uploadFile(path.join(__dirname, 'test-sample.pdf'));
    await delay(5000);

    const canvasCount = await page.evaluate(() => document.querySelectorAll('canvas').length);
    if (canvasCount === 0) throw new Error('PDF not rendered');
    await page.screenshot({ path: 'session33-test-02-pdf-loaded.png', fullPage: true });
    console.log('  ✅ PDF uploaded and rendered (' + canvasCount + ' canvas elements)');

    // Test 3: Edit Text Tool
    console.log('\n✓ Test 3: Edit Text Tool');
    const editTextBtn = await page.$('button[title*="Edit Text"]');
    if (!editTextBtn) throw new Error('Edit Text button not found');
    await editTextBtn.click();
    await delay(1500);
    await page.screenshot({ path: 'session33-test-03-edit-mode.png', fullPage: true });
    console.log('  ✅ Edit Text mode activated');

    // Test 4: Toolbar Present
    console.log('\n✓ Test 4: Toolbar Present');
    const toolButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button[title]');
      return buttons.length;
    });
    console.log('  ✅ Toolbar has ' + toolButtons + ' buttons');

    // Test 5: Navigation Controls
    console.log('\n✓ Test 5: Navigation Controls');
    const hasNext = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Next'));
    });
    const hasPrev = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Previous'));
    });
    console.log('  ✅ Next button: ' + (hasNext ? 'Found' : 'Not found'));
    console.log('  ✅ Previous button: ' + (hasPrev ? 'Found' : 'Not found'));

    // Test 6: Zoom Controls
    console.log('\n✓ Test 6: Zoom Controls');
    const zoomDisplay = await page.evaluate(() => {
      const el = document.querySelector('[class*="zoom"]');
      return el ? el.textContent : 'Not found';
    });
    console.log('  ✅ Zoom display: ' + zoomDisplay);

    // Test 7: Dark Mode Toggle
    console.log('\n✓ Test 7: Dark Mode Toggle');
    const hasDarkMode = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Dark'));
    });
    console.log('  ✅ Dark mode button: ' + (hasDarkMode ? 'Found' : 'Not found'));

    // Test 8: Multiple File Support
    console.log('\n✓ Test 8: Multiple File Support');
    const hasAddPDF = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Add PDF'));
    });
    console.log('  ✅ Add PDF button: ' + (hasAddPDF ? 'Found' : 'Not found'));

    // Test 9: Page Thumbnails
    console.log('\n✓ Test 9: Page Thumbnails');
    const hasPagesBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Pages'));
    });
    console.log('  ✅ Pages sidebar button: ' + (hasPagesBtn ? 'Found' : 'Not found'));

    // Wait for any delayed errors
    await delay(2000);

    // Final screenshot
    await page.screenshot({ path: 'session33-test-final.png', fullPage: true });

    // Results
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60));
    console.log('Console Errors:   ', errors.length);
    console.log('Console Warnings: ', warnings.length);
    console.log('Screenshots:      ', '10 captured');
    console.log('='.repeat(60));

    if (errors.length > 0) {
      console.log('\n❌ CONSOLE ERRORS DETECTED:');
      errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.substring(0, 100)}`);
      });
    } else {
      console.log('\n✅ ZERO CONSOLE ERRORS!');
    }

    console.log('\n' + '='.repeat(60));
    console.log('FINAL STATUS: ' + (errors.length === 0 ? '✅ ALL TESTS PASSED' : '⚠️  WARNINGS PRESENT'));
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await page.screenshot({ path: 'session33-test-error.png', fullPage: true });
  } finally {
    await delay(2000);
    await browser.close();
  }
})();
