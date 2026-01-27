const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('🚀 Starting page rotation test...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1400,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // Navigate to app
    console.log('📱 Navigating to app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Upload test PDF
    console.log('📄 Uploading test PDF...');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('File input not found');
    }

    const testPdfPath = path.join(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(testPdfPath);

    // Wait for PDF to load
    console.log('⏳ Waiting for PDF to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take screenshot of initial state
    await page.screenshot({
      path: 'screenshots/rotation-01-initial.png',
      fullPage: false
    });
    console.log('✅ Screenshot 1: Initial PDF loaded');

    // Open thumbnails sidebar
    console.log('🖼️  Opening thumbnails sidebar...');
    // Click the fixed toggle button on the left
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const thumbnailButton = buttons.find(btn =>
        btn.textContent.includes('Pages') || btn.textContent.includes('▶')
      );
      if (thumbnailButton) {
        thumbnailButton.click();
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshot of thumbnails
    await page.screenshot({
      path: 'screenshots/rotation-02-thumbnails.png',
      fullPage: false
    });
    console.log('✅ Screenshot 2: Thumbnails sidebar open');

    // Find and click the rotate button on page 1
    console.log('🔄 Clicking rotate button on page 1...');
    await page.waitForSelector('button[title*="Rotate"]', { timeout: 5000 });

    // Click the first rotate button (page 1)
    const rotateButtons = await page.$$('button[title*="Rotate"]');
    if (rotateButtons.length === 0) {
      throw new Error('No rotate buttons found');
    }

    console.log(`Found ${rotateButtons.length} rotate buttons`);
    await rotateButtons[0].click();

    // Wait for rotation to complete
    console.log('⏳ Waiting for rotation to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take screenshot after first rotation
    await page.screenshot({
      path: 'screenshots/rotation-03-after-first.png',
      fullPage: false
    });
    console.log('✅ Screenshot 3: After first rotation (90°)');

    // Rotate again
    console.log('🔄 Rotating page 1 again (180° total)...');
    const rotateButtons2 = await page.$$('button[title*="Rotate"]');
    await rotateButtons2[0].click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({
      path: 'screenshots/rotation-04-after-second.png',
      fullPage: false
    });
    console.log('✅ Screenshot 4: After second rotation (180°)');

    // Rotate a third time
    console.log('🔄 Rotating page 1 again (270° total)...');
    const rotateButtons3 = await page.$$('button[title*="Rotate"]');
    await rotateButtons3[0].click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({
      path: 'screenshots/rotation-05-after-third.png',
      fullPage: false
    });
    console.log('✅ Screenshot 5: After third rotation (270°)');

    // Rotate a fourth time (back to 0°)
    console.log('🔄 Rotating page 1 again (360° = 0°)...');
    const rotateButtons4 = await page.$$('button[title*="Rotate"]');
    await rotateButtons4[0].click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({
      path: 'screenshots/rotation-06-full-cycle.png',
      fullPage: false
    });
    console.log('✅ Screenshot 6: After full rotation cycle (back to 0°)');

    // Test rotating page 2
    console.log('🔄 Testing rotation on page 2...');
    const rotateButtons5 = await page.$$('button[title*="Rotate"]');
    if (rotateButtons5.length > 1) {
      await rotateButtons5[1].click();
      await new Promise(resolve => setTimeout(resolve, 3000));

      await page.screenshot({
        path: 'screenshots/rotation-07-page2-rotated.png',
        fullPage: false
      });
      console.log('✅ Screenshot 7: Page 2 rotated');
    }

    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    console.log('\n✅ Page rotation test completed successfully!');
    console.log('📸 Screenshots saved to screenshots/ directory');

    if (errors.length > 0) {
      console.log('\n⚠️  Console errors detected:');
      errors.forEach(err => console.log('  -', err));
    } else {
      console.log('✅ No console errors detected');
    }

    // Keep browser open for 5 seconds
    console.log('\n⏳ Keeping browser open for inspection...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('\n🏁 Test complete. Browser closed.');
  }
})();
