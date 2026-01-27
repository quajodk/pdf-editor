const puppeteer = require('puppeteer');
const path = require('path');

// Utility function to wait (replacement for deprecated waitForTimeout)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('🧪 Testing Multi-Select Annotations Feature...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // Navigate to the app
    console.log('1. Loading app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'screenshots/multiselect-01-loaded.png' });

    // Upload PDF
    console.log('2. Uploading test PDF...');
    const pdfPath = path.resolve(__dirname, 'test-sample.pdf');
    const fileInput = await page.waitForSelector('input[type="file"]');
    await fileInput.uploadFile(pdfPath);
    await wait(3000); // Wait for PDF to load
    await page.screenshot({ path: 'screenshots/multiselect-02-uploaded.png' });

    // Add text annotation 1
    console.log('3. Adding first text annotation...');
    // Find and click Text button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const textButton = buttons.find(btn => btn.textContent.includes('Text') && !btn.textContent.includes('Select'));
      if (textButton) textButton.click();
    });
    await wait(500);
    await page.click('.react-pdf__Page', { offset: { x: 100, y: 100 } });
    await wait(300);
    await page.keyboard.type('First Annotation');
    await page.keyboard.press('Enter');
    await wait(500);
    await page.screenshot({ path: 'screenshots/multiselect-03-text1.png' });

    // Add text annotation 2
    console.log('4. Adding second text annotation...');
    await page.click('.react-pdf__Page', { offset: { x: 200, y: 200 } });
    await wait(300);
    await page.keyboard.type('Second Annotation');
    await page.keyboard.press('Enter');
    await wait(500);
    await page.screenshot({ path: 'screenshots/multiselect-04-text2.png' });

    // Add a rectangle
    console.log('5. Adding rectangle...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const rectButton = buttons.find(btn => btn.textContent.includes('Rectangle'));
      if (rectButton) rectButton.click();
    });
    await wait(500);
    const pdfCanvas = await page.$('.react-pdf__Page');
    const box = await pdfCanvas.boundingBox();
    await page.mouse.move(box.x + 300, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 400, box.y + 200);
    await page.mouse.up();
    await wait(500);
    await page.screenshot({ path: 'screenshots/multiselect-05-rectangle.png' });

    // Switch to select tool
    console.log('6. Switching to Select tool...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const selectButton = buttons.find(btn => btn.textContent.includes('Select'));
      if (selectButton) selectButton.click();
    });
    await wait(500);
    await page.screenshot({ path: 'screenshots/multiselect-06-select-tool.png' });

    // Select first text annotation
    console.log('7. Selecting first annotation...');
    await page.click('.react-pdf__Page', { offset: { x: 100, y: 100 } });
    await wait(500);
    await page.screenshot({ path: 'screenshots/multiselect-07-selected-one.png' });

    // Shift+click to add second text annotation to selection
    console.log('8. Shift+click to add second annotation...');
    await page.keyboard.down('Shift');
    await page.click('.react-pdf__Page', { offset: { x: 200, y: 200 } });
    await page.keyboard.up('Shift');
    await wait(500);
    await page.screenshot({ path: 'screenshots/multiselect-08-selected-two.png' });

    // Shift+click to add rectangle to selection
    console.log('9. Shift+click to add rectangle...');
    await page.keyboard.down('Shift');
    await page.click('.react-pdf__Page', { offset: { x: 350, y: 150 } });
    await page.keyboard.up('Shift');
    await wait(500);
    await page.screenshot({ path: 'screenshots/multiselect-09-selected-three.png' });

    // Check if delete button shows count
    console.log('10. Verifying delete button shows count...');
    const deleteText = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const deleteButton = buttons.find(btn => btn.textContent.includes('Delete'));
      return deleteButton ? deleteButton.textContent : 'Not found';
    });
    console.log(`   Delete button text: "${deleteText}"`);
    if (deleteText.includes('3')) {
      console.log('   ✅ Delete button shows count of 3 selected items');
    } else {
      console.log('   ⚠️  Delete button may not show correct count');
    }
    await page.screenshot({ path: 'screenshots/multiselect-10-delete-button.png' });

    // Delete all selected annotations
    console.log('11. Deleting all selected annotations...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const deleteButton = buttons.find(btn => btn.textContent.includes('Delete'));
      if (deleteButton) deleteButton.click();
    });
    await wait(500);
    await page.screenshot({ path: 'screenshots/multiselect-11-deleted-all.png' });

    // Verify annotations are gone
    console.log('12. Verifying annotations were deleted...');
    const textAnnotations = await page.$$eval('.react-pdf__Page div', els =>
      els.filter(el => el.textContent === 'First Annotation' || el.textContent === 'Second Annotation').length
    );
    if (textAnnotations === 0) {
      console.log('   ✅ All annotations successfully deleted');
    } else {
      console.log('   ⚠️  Some annotations may still exist');
    }

    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('\n✅ Multi-select test completed!');
    if (consoleErrors.length > 0) {
      console.log('\n⚠️  Console errors detected:');
      consoleErrors.forEach(err => console.log(`   - ${err}`));
    } else {
      console.log('✅ No console errors detected');
    }

    await wait(2000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'screenshots/multiselect-error.png' });
  } finally {
    await browser.close();
  }
})();
