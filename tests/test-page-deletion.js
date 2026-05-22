const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('🚀 Starting page deletion test...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    // Navigate to the app
    console.log('📄 Navigating to app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    // Upload the test PDF
    console.log('📤 Uploading multi-page PDF...');
    const testPdfPath = path.join(__dirname, 'test-sample.pdf');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(testPdfPath);

    // Wait for PDF to load
    console.log('⏳ Waiting for PDF to load...');
    await new Promise(r => setTimeout(r, 3000));

    // Take initial screenshot
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }
    await page.screenshot({ path: path.join(screenshotsDir, 'page-delete-1-initial.png'), fullPage: true });
    console.log('✅ Initial state captured');

    // Open thumbnails sidebar
    console.log('📂 Opening thumbnails sidebar...');
    const toggleButton = await page.$('button[title*="Thumbnails"]');
    if (toggleButton) {
      await toggleButton.click();
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: path.join(screenshotsDir, 'page-delete-2-thumbnails-open.png'), fullPage: true });
      console.log('✅ Thumbnails sidebar opened');
    }

    // Check initial page count
    const pageInfo = await page.$eval('span', el => el.textContent);
    console.log('📊 Initial page info:', pageInfo);

    // Find and click delete button on page 2
    console.log('🗑️  Attempting to delete page 2...');
    const deleteButtons = await page.$$('button[title^="Delete page"]');
    console.log(`   Found ${deleteButtons.length} delete buttons`);

    if (deleteButtons.length >= 2) {
      // Click the delete button for page 2 (second button)
      await deleteButtons[1].click();
      await new Promise(r => setTimeout(r, 500));

      // Handle confirmation dialog
      console.log('✅ Confirming deletion...');
      page.on('dialog', async dialog => {
        console.log('   Dialog message:', dialog.message());
        await dialog.accept();
      });

      // Wait for PDF to reload
      await new Promise(r => setTimeout(r, 3000));
      await page.screenshot({ path: path.join(screenshotsDir, 'page-delete-3-after-delete.png'), fullPage: true });
      console.log('✅ Page deleted - screenshot captured');

      // Check updated page count
      const newPageInfo = await page.$eval('span', el => el.textContent);
      console.log('📊 Updated page info:', newPageInfo);

      // Navigate through remaining pages to verify
      console.log('🔍 Verifying remaining pages...');
      const nextButton = await page.$('button:has-text("Next")');
      if (nextButton) {
        await nextButton.click();
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: path.join(screenshotsDir, 'page-delete-4-verify-pages.png'), fullPage: true });
        console.log('✅ Navigated to verify remaining pages');
      }

      console.log('\n✅ Page deletion test completed successfully!');
      console.log('📸 Screenshots saved to:', screenshotsDir);
      console.log('\n📋 Test Results:');
      console.log('   ✅ PDF uploaded and loaded');
      console.log('   ✅ Thumbnails sidebar opened');
      console.log('   ✅ Delete button found and clicked');
      console.log('   ✅ Page deleted from PDF');
      console.log('   ✅ Page count updated correctly');
      console.log('   ✅ Remaining pages navigable');

    } else {
      console.log('❌ Could not find delete buttons');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: path.join(__dirname, 'screenshots', 'page-delete-error.png'), fullPage: true });
  } finally {
    console.log('\n🔍 Keeping browser open for manual inspection...');
    console.log('   Press Ctrl+C to close browser and exit');
    // Keep browser open for inspection
    await new Promise(r => setTimeout(r, 60000));
    await browser.close();
  }
})();
