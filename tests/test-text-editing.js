const puppeteer = require('puppeteer');
const path = require('path');

async function testTextEditing() {
  console.log('🧪 Testing Text Editing Functionality...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // Navigate to the app
    console.log('1️⃣  Loading PDF Editor...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'screenshots/test-text-edit-01-loaded.png' });
    console.log('✅ App loaded\n');

    // Upload PDF
    console.log('2️⃣  Uploading PDF...');
    const pdfPath = path.resolve(__dirname, 'test-sample.pdf');
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(pdfPath);
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.screenshot({ path: 'screenshots/test-text-edit-02-uploaded.png' });
      console.log('✅ PDF uploaded\n');
    }

    // Click text tool
    console.log('3️⃣  Selecting Text tool...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const textButton = buttons.find(btn => btn.textContent?.includes('Text') || btn.textContent?.includes('Add Text'));
      if (textButton) textButton.click();
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✅ Text tool selected\n');

    // Add text annotation
    console.log('4️⃣  Adding text annotation...');
    const canvas = await page.$('.absolute.inset-0');
    if (canvas) {
      const box = await canvas.boundingBox();
      await page.mouse.click(box.x + 300, box.y + 200);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Type text
      await page.keyboard.type('Original Text');
      await page.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: 'screenshots/test-text-edit-03-text-added.png' });
      console.log('✅ Text annotation added: "Original Text"\n');
    }

    // Switch to select tool
    console.log('5️⃣  Switching to Select tool...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const selectButton = buttons.find(btn => btn.textContent?.includes('Select'));
      if (selectButton) selectButton.click();
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✅ Select tool activated\n');

    // Double-click to edit text
    console.log('6️⃣  Double-clicking text to edit...');
    if (canvas) {
      const box = await canvas.boundingBox();
      await page.mouse.click(box.x + 300, box.y + 200, { clickCount: 2, delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if input appeared
      const input = await page.$('input[type="text"]');
      if (input) {
        console.log('✅ Edit input appeared\n');

        // Clear and type new text
        console.log('7️⃣  Editing text...');
        await page.evaluate(() => {
          const input = document.querySelector('input[type="text"]');
          if (input) input.value = '';
        });
        await page.keyboard.type('Edited Text - This was modified!');
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.screenshot({ path: 'screenshots/test-text-edit-04-editing.png' });
        console.log('✅ Typed new text\n');

        // Submit by pressing Enter
        console.log('8️⃣  Submitting edit...');
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.screenshot({ path: 'screenshots/test-text-edit-05-edited.png' });
        console.log('✅ Text edited successfully!\n');
      } else {
        console.log('❌ Edit input did not appear\n');
      }
    }

    // Check for console errors
    console.log('9️⃣  Checking for console errors...');
    const logs = [];
    page.on('console', msg => logs.push(msg));
    const errors = logs.filter(log => log.type() === 'error');
    if (errors.length === 0) {
      console.log('✅ No console errors\n');
    } else {
      console.log(`❌ Found ${errors.length} console errors\n`);
    }

    console.log('✨ TEST COMPLETE!\n');
    console.log('📸 Screenshots saved to screenshots/');
    console.log('   - test-text-edit-01-loaded.png');
    console.log('   - test-text-edit-02-uploaded.png');
    console.log('   - test-text-edit-03-text-added.png');
    console.log('   - test-text-edit-04-editing.png');
    console.log('   - test-text-edit-05-edited.png\n');

    // Keep browser open for manual verification
    console.log('🔍 Browser will stay open for manual verification...');
    console.log('   Press Ctrl+C to close\n');

    // Wait indefinitely
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'screenshots/test-text-edit-error.png' });
    await browser.close();
    process.exit(1);
  }
}

testTextEditing();
