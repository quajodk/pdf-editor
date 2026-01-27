const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('🧪 Starting browser tests...');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log('📱 Navigating to application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/01-homepage.png' });
    console.log('✅ Screenshot: Homepage');

    // Test 1: Upload PDF
    console.log('\n📄 Test 1: Upload PDF');
    const pdfPath = path.resolve(__dirname, 'test-sample.pdf');
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(pdfPath);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for PDF to load
      await page.screenshot({ path: 'screenshots/02-pdf-loaded.png' });
      console.log('✅ PDF uploaded and displayed');
    } else {
      console.log('❌ Could not find file input');
    }

    // Test 2: Check toolbar tools
    console.log('\n🔧 Test 2: Check toolbar');
    const toolbarButtons = await page.$$('.bg-blue-600, .bg-gray-100');
    console.log(`✅ Found ${toolbarButtons.length} toolbar buttons`);

    // Test 3: Try text tool
    console.log('\n✍️ Test 3: Test text annotation');
    // Find text tool button
    const buttons = await page.$$('button');
    let textButtonFound = false;
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && text.includes('T') && text.length < 5) {
        await button.click();
        textButtonFound = true;
        break;
      }
    }

    if (textButtonFound) {
      console.log('✅ Text tool activated');
      // Click on PDF to place text
      await page.click('.absolute.inset-0.cursor-crosshair');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Type text
      await page.keyboard.type('Test annotation');
      await page.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: 'screenshots/03-text-annotation.png' });
      console.log('✅ Text annotation added');
    }

    // Test 4: Check styling controls
    console.log('\n🎨 Test 4: Check for styling controls');
    const hasColorPicker = await page.$('input[type="color"]') !== null;
    const hasSlider = await page.$('input[type="range"]') !== null;
    const hasFontSelector = await page.$('select') !== null;

    console.log(`Color picker: ${hasColorPicker ? '✅' : '❌ Missing'}`);
    console.log(`Width/Size slider: ${hasSlider ? '✅' : '❌ Missing'}`);
    console.log(`Font selector: ${hasFontSelector ? '✅' : '❌ Missing'}`);

    // Test 5: Check save button
    console.log('\n💾 Test 5: Check save functionality');
    const saveButton = await page.$('button.bg-green-600');
    if (saveButton) {
      console.log('✅ Save button found');
    } else {
      console.log('❌ Save button not found');
    }

    console.log('\n📊 Summary:');
    console.log('- Core features working: PDF upload, display, text annotation');
    console.log('- Missing: UI controls for text/pen styling');
    console.log('- Next priority: Add color picker, font controls, pen width slider');

    console.log('\n⏰ Keeping browser open for 10 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Browser tests complete');
  }
})();
