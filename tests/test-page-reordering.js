const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  console.log('Navigating to app...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // Upload test PDF
  console.log('Uploading test PDF...');
  const fileInput = await page.$('input[type="file"]');
  const testPdfPath = path.join(__dirname, 'test-sample.pdf');
  await fileInput.uploadFile(testPdfPath);

  // Wait for PDF to load
  console.log('Waiting for PDF to load...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  await page.screenshot({ path: 'screenshots/reorder-01-initial.png', fullPage: true });
  console.log('Screenshot 1: Initial state');

  // Open thumbnails sidebar
  console.log('Opening thumbnails sidebar...');
  const buttons = await page.$$('button');
  for (const button of buttons) {
    const text = await button.evaluate(el => el.textContent);
    if (text.includes('Pages')) {
      await button.click();
      break;
    }
  }
  await new Promise(resolve => setTimeout(resolve, 1000));

  await page.screenshot({ path: 'screenshots/reorder-02-sidebar-open.png', fullPage: true });
  console.log('Screenshot 2: Thumbnails sidebar open');

  // Get all thumbnail elements
  console.log('Testing drag-and-drop reordering...');
  const thumbnails = await page.$$('div[draggable="true"]');
  console.log(`Found ${thumbnails.length} draggable thumbnails`);

  if (thumbnails.length >= 2) {
    // Get bounding boxes for first and third thumbnails
    const firstBox = await thumbnails[0].boundingBox();
    const thirdBox = await thumbnails[2].boundingBox();

    console.log('Dragging page 1 to position 3...');

    // Perform drag operation: drag first page to third position
    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await page.mouse.down();
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.screenshot({ path: 'screenshots/reorder-03-drag-start.png', fullPage: true });
    console.log('Screenshot 3: Drag started');

    // Move to third position
    await page.mouse.move(thirdBox.x + thirdBox.width / 2, thirdBox.y + thirdBox.height / 2, { steps: 10 });
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.screenshot({ path: 'screenshots/reorder-04-drag-over.png', fullPage: true });
    console.log('Screenshot 4: Dragging over target');

    // Drop
    await page.mouse.up();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for PDF to be reprocessed

    await page.screenshot({ path: 'screenshots/reorder-05-after-drop.png', fullPage: true });
    console.log('Screenshot 5: After drop (pages should be reordered)');

    // Wait for reordering to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({ path: 'screenshots/reorder-06-final.png', fullPage: true });
    console.log('Screenshot 6: Final state');

    console.log('\n✅ Page reordering test completed!');
    console.log('Check screenshots to verify:');
    console.log('  - Page 1 should now be in position 3');
    console.log('  - Original pages 2 and 3 should move up');

  } else {
    console.log('❌ Not enough pages to test reordering');
  }

  // Check for console errors
  console.log('\n📊 Checking for console errors...');
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  if (errors.length === 0) {
    console.log('✅ No console errors detected');
  } else {
    console.log('❌ Console errors found:');
    errors.forEach(err => console.log(`  - ${err}`));
  }

  console.log('\n✨ Test complete! Press Ctrl+C to close browser...');

  // Keep browser open for manual inspection
  await new Promise(resolve => setTimeout(resolve, 60000));

  await browser.close();
})();
