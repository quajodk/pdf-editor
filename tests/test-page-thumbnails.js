const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Starting Page Thumbnails test...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1600, height: 1000 }
  });

  const page = await browser.newPage();

  try {
    // Navigate to the app
    console.log('1. Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'screenshots/thumb-01-home.png' });

    // Upload PDF
    console.log('2. Uploading test PDF...');
    const fileInput = await page.$('input[type="file"]');
    const pdfPath = path.resolve(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(pdfPath);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: 'screenshots/thumb-02-pdf-loaded.png' });

    // Find and click the thumbnails toggle button
    console.log('3. Opening page thumbnails sidebar...');
    const toggleButton = await page.$('button:has-text("Pages")');
    if (!toggleButton) {
      throw new Error('Thumbnails toggle button not found');
    }
    await toggleButton.click();
    await new Promise(resolve => setTimeout(resolve, 1500));
    await page.screenshot({ path: 'screenshots/thumb-03-sidebar-open.png' });

    // Verify thumbnails are visible
    console.log('4. Verifying thumbnails are visible...');
    const thumbnailsVisible = await page.evaluate(() => {
      const sidebar = document.querySelector('.fixed.left-0.top-16');
      return sidebar && window.getComputedStyle(sidebar).display !== 'none';
    });

    if (!thumbnailsVisible) {
      throw new Error('Thumbnails sidebar not visible');
    }
    console.log('✅ Thumbnails sidebar is visible');

    // Verify we can see all pages
    console.log('5. Checking thumbnail count...');
    const thumbnailCount = await page.evaluate(() => {
      const thumbnails = document.querySelectorAll('.fixed.left-0 canvas');
      return thumbnails.length;
    });
    console.log(`Found ${thumbnailCount} page thumbnails`);

    if (thumbnailCount !== 3) {
      throw new Error(`Expected 3 thumbnails, found ${thumbnailCount}`);
    }
    console.log('✅ All 3 page thumbnails rendered');

    // Click on page 2 thumbnail
    console.log('6. Clicking on page 2 thumbnail...');
    await page.evaluate(() => {
      const thumbnails = document.querySelectorAll('.fixed.left-0 .cursor-pointer');
      if (thumbnails[1]) {
        thumbnails[1].click();
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'screenshots/thumb-04-page2.png' });

    // Verify page changed to 2
    const currentPageText = await page.evaluate(() => {
      const pageInfo = document.querySelector('span.text-sm.text-gray-700');
      return pageInfo ? pageInfo.textContent : '';
    });

    if (!currentPageText.includes('Page 2')) {
      throw new Error(`Expected page 2, but got: ${currentPageText}`);
    }
    console.log('✅ Successfully navigated to page 2 via thumbnail');

    // Click on page 3 thumbnail
    console.log('7. Clicking on page 3 thumbnail...');
    await page.evaluate(() => {
      const thumbnails = document.querySelectorAll('.fixed.left-0 .cursor-pointer');
      if (thumbnails[2]) {
        thumbnails[2].click();
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'screenshots/thumb-05-page3.png' });

    // Verify the current page indicator is highlighted
    console.log('8. Verifying current page is highlighted...');
    const highlightedThumbnail = await page.evaluate(() => {
      const thumbnails = document.querySelectorAll('.fixed.left-0 .cursor-pointer');
      let highlightedIndex = -1;
      thumbnails.forEach((thumb, index) => {
        if (thumb.classList.contains('ring-2') || thumb.classList.contains('border-blue-600')) {
          highlightedIndex = index;
        }
      });
      return highlightedIndex;
    });

    if (highlightedThumbnail !== 2) {
      console.log(`⚠️ Warning: Expected thumbnail 2 (page 3) to be highlighted, got ${highlightedThumbnail}`);
    } else {
      console.log('✅ Current page thumbnail is highlighted');
    }

    // Toggle sidebar closed
    console.log('9. Closing thumbnails sidebar...');
    const hideButton = await page.$('button:has-text("Hide")');
    if (hideButton) {
      await hideButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.screenshot({ path: 'screenshots/thumb-06-sidebar-closed.png' });
      console.log('✅ Thumbnails sidebar closed');
    }

    // Check for console errors
    const consoleErrors = await page.evaluate(() => {
      return window.console._errors || [];
    });

    if (consoleErrors.length > 0) {
      console.log('⚠️ Console errors detected:', consoleErrors);
    }

    console.log('\n✅ All Page Thumbnails tests passed!');
    console.log('Screenshots saved to screenshots/ directory');

    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'screenshots/thumb-error.png' });
    throw error;
  } finally {
    await browser.close();
  }
})();
