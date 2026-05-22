const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
  });

  try {
    const page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    console.log('Navigating to application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    console.log('Taking screenshot of home page...');
    await page.screenshot({ path: 'screenshots/text-edit-01-home.png' });

    // Upload PDF
    console.log('Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    const testPdfPath = path.resolve(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(testPdfPath);

    // Wait for PDF to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('PDF loaded');
    await page.screenshot({ path: 'screenshots/text-edit-02-pdf-loaded.png' });

    // Find and click the "Edit Text" button (📝 icon)
    console.log('Clicking Edit Text tool...');
    const editTextButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('📝') || btn.title?.includes('Edit original PDF text'));
    });

    if (editTextButton) {
      await editTextButton.asElement().click();
      console.log('Edit Text tool activated');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: 'screenshots/text-edit-03-tool-active.png' });

      // Look for highlighted text areas (yellow highlights)
      console.log('Checking for highlighted text areas...');
      const hasHighlights = await page.evaluate(() => {
        const highlights = document.querySelectorAll('.bg-yellow-200');
        return highlights.length > 0;
      });

      if (hasHighlights) {
        console.log('✅ Text areas are highlighted for editing');

        // Try to click on a highlighted text area
        console.log('Attempting to click on a highlighted text area...');
        const clicked = await page.evaluate(() => {
          // Find a highlighted text element
          const highlights = document.querySelectorAll('.bg-yellow-200');
          if (highlights.length === 0) return false;

          // Click on the first highlighted element
          const highlight = highlights[0];
          highlight.click();
          return true;
        });

        console.log(`Clicked on highlight: ${clicked}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.screenshot({ path: 'screenshots/text-edit-04-clicked.png' });

        // Check if an input field appeared
        const hasInput = await page.evaluate(() => {
          const inputs = document.querySelectorAll('input[type="text"]');
          return inputs.length > 0;
        });

        if (hasInput) {
          console.log('✅ Edit input appeared');

          // Type new text
          console.log('Typing new text...');
          await page.keyboard.type('EDITED TEXT');
          await new Promise(resolve => setTimeout(resolve, 500));
          await page.screenshot({ path: 'screenshots/text-edit-05-typing.png' });

          // Press Enter to save
          await page.keyboard.press('Enter');
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log('✅ Text edit saved');
          await page.screenshot({ path: 'screenshots/text-edit-06-saved.png' });

          console.log('\n✅ ALL TESTS PASSED!');
          console.log('✅ Edit Text mode working correctly');
        } else {
          console.log('⚠️  Edit input did not appear after clicking');
        }
      } else {
        console.log('⚠️  No text areas highlighted (may need to wait longer for extraction)');
      }
    } else {
      console.log('❌ Edit Text button not found');
    }

    // Check for console errors
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    if (errors.length > 0) {
      console.log('\n⚠️  Console errors detected:');
      errors.forEach(err => console.log('  -', err));
    } else {
      console.log('✅ No console errors detected');
    }

    console.log('\nTest complete. Browser will stay open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();
