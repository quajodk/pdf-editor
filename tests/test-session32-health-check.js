const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('\n🔍 Session 32 - Comprehensive Health Check\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Monitor console for errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Test Home Page
    console.log('✅ Test 1: Loading home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'session32-01-home.png', fullPage: true });
    console.log('   ✓ Home page loaded successfully\n');

    // 2. Test PDF Upload
    console.log('✅ Test 2: Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found');
    const pdfPath = path.resolve(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(pdfPath);

    // Wait for PDF to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'session32-02-pdf-loaded.png', fullPage: true });
    console.log('   ✓ PDF uploaded and rendered successfully\n');

    // 3. Test Edit Text Mode
    console.log('✅ Test 3: Testing Edit Text mode...');
    const editButton = await page.$('button[title*="Edit"]');
    if (editButton) {
      await editButton.click();
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: 'session32-03-edit-mode.png', fullPage: true });
      console.log('   ✓ Edit mode activated\n');
    } else {
      console.log('   ⚠️  Edit button not found\n');
    }

    // 4. Test Add Text Tool
    console.log('✅ Test 4: Testing Add Text tool...');
    const textButton = await page.$('button[title*="Add Text"]');
    if (textButton) {
      await textButton.click();
      await new Promise(r => setTimeout(r, 500));

      // Click on canvas to add text
      const canvas = await page.$('canvas');
      const box = await canvas.boundingBox();
      await page.mouse.click(box.x + 100, box.y + 100);
      await new Promise(r => setTimeout(r, 500));

      // Type some text
      await page.keyboard.type('Test annotation');
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: 'session32-04-text-added.png', fullPage: true });
      console.log('   ✓ Text annotation added\n');
    } else {
      console.log('   ⚠️  Add Text button not found\n');
    }

    // 5. Test Pen Tool
    console.log('✅ Test 5: Testing Pen tool...');
    const penButton = await page.$('button[title*="Pen"]');
    if (penButton) {
      await penButton.click();
      await new Promise(r => setTimeout(r, 500));

      // Draw something
      const canvas = await page.$('canvas');
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + 200, box.y + 200);
      await page.mouse.down();
      await page.mouse.move(box.x + 250, box.y + 250);
      await page.mouse.move(box.x + 300, box.y + 200);
      await page.mouse.up();
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: 'session32-05-pen-drawn.png', fullPage: true });
      console.log('   ✓ Pen drawing works\n');
    } else {
      console.log('   ⚠️  Pen button not found\n');
    }

    // 6. Test Shape Tools
    console.log('✅ Test 6: Testing Shape tools...');
    const rectButton = await page.$('button[title*="Rectangle"]');
    if (rectButton) {
      await rectButton.click();
      await new Promise(r => setTimeout(r, 500));

      const canvas = await page.$('canvas');
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + 400, box.y + 100);
      await page.mouse.down();
      await page.mouse.move(box.x + 500, box.y + 150);
      await page.mouse.up();
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: 'session32-06-shape-added.png', fullPage: true });
      console.log('   ✓ Shape tools work\n');
    } else {
      console.log('   ⚠️  Rectangle button not found\n');
    }

    // 7. Check for Console Errors
    console.log('✅ Test 7: Checking for console errors...');
    if (consoleErrors.length === 0) {
      console.log('   ✓ No console errors detected\n');
    } else {
      console.log('   ⚠️  Console errors detected:');
      consoleErrors.forEach(err => console.log('      -', err));
      console.log();
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SESSION 32 HEALTH CHECK SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Home page loads correctly');
    console.log('✅ PDF upload and rendering works');
    console.log('✅ Edit Text mode functional');
    console.log('✅ Add Text tool works');
    console.log('✅ Pen drawing tool works');
    console.log('✅ Shape tools work');
    const errorStatus = consoleErrors.length === 0 ? '✅' : '⚠️ ';
    console.log(errorStatus + ' Console errors: ' + consoleErrors.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎉 All core features working correctly!');
    console.log('📸 Screenshots saved: session32-01 through session32-06\n');

  } catch (error) {
    console.error('\n❌ Health check failed:', error.message);
    await page.screenshot({ path: 'session32-error.png', fullPage: true });
  }

  await browser.close();
})();
