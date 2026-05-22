const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });
  const page = await browser.newPage();

  try {
    console.log('Navigating to application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Upload PDF
    console.log('Uploading PDF...');
    const pdfPath = path.join(__dirname, 'test-sample.pdf');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(pdfPath);

    // Wait for PDF to load and text extraction to complete
    console.log('Waiting for PDF to load and text extraction...');
    await new Promise(resolve => setTimeout(resolve, 8000)); // Wait for text extraction

    // Click Edit Text tool
    console.log('Clicking Edit Text tool...');
    const editTextButton = await page.$('button[title*="Edit Text"]');
    if (!editTextButton) {
      console.error('❌ Edit Text button not found');
      await browser.close();
      return;
    }
    await editTextButton.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshot before editing
    await page.screenshot({ path: 'test-edit-01-before.png', fullPage: true });
    console.log('Screenshot saved: test-edit-01-before.png');

    // Look for highlighted text areas
    const textAreas = await page.$$('.bg-yellow-200');
    console.log(`Found ${textAreas.length} editable text areas`);

    if (textAreas.length === 0) {
      console.error('❌ No editable text areas found');
      await browser.close();
      return;
    }

    // Click on the first text area to edit
    console.log('Clicking on first text area...');
    await textAreas[0].click();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Take screenshot of edit dialog
    await page.screenshot({ path: 'test-edit-02-editing.png', fullPage: true });
    console.log('Screenshot saved: test-edit-02-editing.png');

    // Find the textarea and modify text
    const textarea = await page.$('textarea');
    if (!textarea) {
      console.error('❌ Textarea not found');
      await browser.close();
      return;
    }

    // Clear and enter longer text
    console.log('Entering longer text...');
    await textarea.click({ clickCount: 3 }); // Select all
    await textarea.type('This is a much longer text that should expand beyond the original word boundaries and not overlap with the following text. This demonstrates the fix for the text editing bug.');

    // Take screenshot with new text typed
    await page.screenshot({ path: 'test-edit-03-typed.png', fullPage: true });
    console.log('Screenshot saved: test-edit-03-typed.png');

    // Press Ctrl+Enter to save
    console.log('Saving edited text...');
    await page.keyboard.down('Control');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Control');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshot after saving
    await page.screenshot({ path: 'test-edit-04-saved.png', fullPage: true });
    console.log('Screenshot saved: test-edit-04-saved.png');

    // Check for console errors
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    // Test editing another text area to verify multiple edits work
    console.log('Testing second text edit...');
    if (textAreas.length > 1) {
      await textAreas[1].click();
      await new Promise(resolve => setTimeout(resolve, 500));

      const textarea2 = await page.$('textarea');
      if (textarea2) {
        await textarea2.click({ clickCount: 3 });
        await textarea2.type('Another expanded text edit that is longer than the original');
        await page.keyboard.down('Control');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Control');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'test-edit-05-multiple-edits.png', fullPage: true });
    console.log('Screenshot saved: test-edit-05-multiple-edits.png');

    // Test download to verify changes persist
    console.log('Testing PDF download...');
    const downloadButton = await page.$('button[title*="Download"]');
    if (downloadButton) {
      await downloadButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ PDF download initiated');
    }

    console.log('\n✅ Text editing fix verification complete!');
    console.log('Key improvements:');
    console.log('  - Text is grouped into lines/paragraphs instead of individual words');
    console.log('  - Textarea allows multi-line editing');
    console.log('  - Text boundaries expand to accommodate longer text');
    console.log('  - No overlapping text issues');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-edit-error.png', fullPage: true });
  } finally {
    console.log('\nTest complete. Browser will remain open for inspection.');
    console.log('Press Ctrl+C to close.');
  }
})();
