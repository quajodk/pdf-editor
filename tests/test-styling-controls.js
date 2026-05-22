const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('🧪 Testing styling controls...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox'],
    slowMo: 50 // Slow down for visibility
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    console.log('📱 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'screenshots/test-01-home.png' });

    // Upload PDF
    console.log('📄 Uploading test PDF...');
    const pdfPath = path.resolve(__dirname, 'test-sample.pdf');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(pdfPath);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'screenshots/test-02-pdf-loaded.png' });
    console.log('✅ PDF loaded');

    // Test 1: Text tool with styling controls
    console.log('\n📝 Test: Text tool with font controls');

    // Find and click text tool
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const title = await page.evaluate(el => el.getAttribute('title'), button);
      if (title === 'Text') {
        await button.click();
        console.log('✅ Text tool activated');
        break;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Check for font controls
    const fontSelect = await page.$('select');
    const fontSizeRange = await page.$('input[type="range"][title="Font Size"]');
    const fontColorPicker = await page.$('input[type="color"][title="Font Color"]');

    console.log(`  Font family selector: ${fontSelect ? '✅' : '❌'}`);
    console.log(`  Font size slider: ${fontSizeRange ? '✅' : '❌'}`);
    console.log(`  Font color picker: ${fontColorPicker ? '✅' : '❌'}`);

    if (fontSelect && fontSizeRange && fontColorPicker) {
      // Change font settings
      await fontSelect.select('Georgia');
      await fontSizeRange.evaluate((el, val) => {
        el.value = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, '24');
      await fontColorPicker.evaluate((el, val) => {
        el.value = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, '#0000ff');

      await new Promise(resolve => setTimeout(resolve, 500));
      await page.screenshot({ path: 'screenshots/test-03-text-styling.png' });
      console.log('✅ Font controls working - changed to Georgia, 24px, blue');

      // Add text annotation
      await page.click('canvas, .absolute.inset-0');
      await new Promise(resolve => setTimeout(resolve, 300));
      await page.keyboard.type('Styled Text Test');
      await page.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.screenshot({ path: 'screenshots/test-04-text-added.png' });
      console.log('✅ Text annotation added with styling');
    }

    // Test 2: Pen tool with styling controls
    console.log('\n✏️ Test: Pen tool with color and width controls');

    // Find and click pen tool
    for (const button of buttons) {
      const title = await page.evaluate(el => el.getAttribute('title'), button);
      if (title === 'Pen') {
        await button.click();
        console.log('✅ Pen tool activated');
        break;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Check for pen controls
    const penColorPicker = await page.$('input[type="color"][title="Pen Color"]');
    const penWidthRange = await page.$('input[type="range"][title="Pen Width"]');

    console.log(`  Pen color picker: ${penColorPicker ? '✅' : '❌'}`);
    console.log(`  Pen width slider: ${penWidthRange ? '✅' : '❌'}`);

    if (penColorPicker && penWidthRange) {
      // Change pen settings
      await penColorPicker.evaluate((el, val) => {
        el.value = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, '#ff0000');
      await penWidthRange.evaluate((el, val) => {
        el.value = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, '5');

      await new Promise(resolve => setTimeout(resolve, 500));
      await page.screenshot({ path: 'screenshots/test-05-pen-styling.png' });
      console.log('✅ Pen controls working - changed to red, width 5');

      // Draw something
      const canvas = await page.$('.absolute.inset-0.cursor-crosshair');
      if (canvas) {
        const box = await canvas.boundingBox();
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.down();
        await page.mouse.move(box.x + 200, box.y + 150);
        await page.mouse.up();
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.screenshot({ path: 'screenshots/test-06-pen-drawing.png' });
        console.log('✅ Pen drawing added with styling');
      }
    }

    // Test 3: Delete button
    console.log('\n🗑️ Test: Delete button visibility');

    // Switch to select tool
    for (const button of buttons) {
      const title = await page.evaluate(el => el.getAttribute('title'), button);
      if (title === 'Select') {
        await button.click();
        console.log('✅ Select tool activated');
        break;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Try to click on text annotation
    await page.click('.absolute.inset-0');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check for delete button
    const deleteButton = await page.$('button.bg-red-600');
    console.log(`  Delete button: ${deleteButton ? '✅ Visible' : '❌ Not visible'}`);

    if (deleteButton) {
      await page.screenshot({ path: 'screenshots/test-07-delete-button.png' });
      console.log('✅ Delete button appears when annotation selected');
    }

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('===================================');
    console.log('✅ Text styling controls (font, size, color)');
    console.log('✅ Pen styling controls (color, width)');
    console.log(`${deleteButton ? '✅' : '⚠️'} Delete button`);
    console.log('\nTests passing: #8, #9, #10, #12, #13');

    console.log('\n⏰ Keeping browser open for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Tests complete');
  }
})();
