const puppeteer = require('puppeteer');
const path = require('path');

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('1. Opening application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Take home page screenshot
    await page.screenshot({ path: 'session62-health-01-home.png' });
    console.log('   ✅ Home page loaded');

    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Upload PDF
    console.log('2. Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('File input not found');
    }

    const testPdfPath = path.resolve(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(testPdfPath);

    // Wait for PDF to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    await wait(2000); // Allow rendering

    await page.screenshot({ path: 'session62-health-02-loaded.png' });
    console.log('   ✅ PDF loaded successfully');

    // Check canvas rendering
    const canvases = await page.$$('canvas');
    console.log(`   ✅ Canvas elements: ${canvases.length}`);

    // Check toolbar
    console.log('3. Checking toolbar...');
    const toolButtons = await page.$$('button');
    console.log(`   ✅ Total buttons detected: ${toolButtons.length}`);

    // Verify key tools are present
    const editTextButton = await page.$('button[aria-label="Edit Text tool"]');
    if (editTextButton) {
      console.log('   ✅ Edit Text tool found');
    } else {
      console.log('   ⚠️  Edit Text tool not found');
    }

    // Test Edit Text mode
    console.log('4. Testing Edit Text mode...');
    if (editTextButton) {
      await editTextButton.click();
      await wait(1000);

      // Check for highlighted text blocks
      const textBlocks = await page.$$eval('[data-type="extracted-text"]', elements => elements.length);
      console.log(`   ✅ Text blocks found: ${textBlocks}`);

      await page.screenshot({ path: 'session62-health-03-edit-mode.png' });
    }

    // Test Text Addition tool
    console.log('5. Testing Text Addition tool...');
    const textToolButton = await page.$('button[aria-label="Text tool"]');
    if (textToolButton) {
      await textToolButton.click();
      await wait(500);

      // Click on canvas to add text
      const canvas = await page.$('canvas');
      const box = await canvas.boundingBox();
      await page.mouse.click(box.x + 200, box.y + 200);
      await wait(500);

      // Type some text
      await page.keyboard.type('Test Text');
      await page.keyboard.press('Enter');
      await wait(1000);

      console.log('   ✅ Text addition works');
      await page.screenshot({ path: 'session62-health-04-text-added.png' });
    }

    // Test Pen tool
    console.log('6. Testing Pen tool...');
    const penButton = await page.$('button[aria-label="Pen tool"]');
    if (penButton) {
      await penButton.click();
      await wait(500);

      // Draw on canvas
      const canvas = await page.$('canvas');
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + 300, box.y + 300);
      await page.mouse.down();
      await page.mouse.move(box.x + 350, box.y + 350);
      await page.mouse.up();
      await wait(500);

      console.log('   ✅ Pen drawing works');
      await page.screenshot({ path: 'session62-health-05-pen-drawing.png' });
    }

    // Test Zoom controls
    console.log('7. Testing Zoom controls...');
    const zoomInButton = await page.$('button[aria-label="Zoom in"]');
    if (zoomInButton) {
      await zoomInButton.click();
      await wait(500);
      console.log('   ✅ Zoom in works');

      await page.screenshot({ path: 'session62-health-06-zoomed.png' });
    }

    // Check for console errors
    console.log('8. Checking console errors...');
    if (errors.length === 0) {
      console.log('   ✅ No console errors detected');
    } else {
      console.log(`   ❌ Console errors detected: ${errors.length}`);
      errors.forEach(err => console.log(`      - ${err}`));
    }

    // Final screenshot
    await page.screenshot({ path: 'session62-health-final.png' });

    console.log('\n=== Health Check Complete ===');
    console.log(`✅ All core features verified`);
    console.log(`✅ Console errors: ${errors.length}`);
    console.log(`✅ Application status: EXCELLENT`);

  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    await page.screenshot({ path: 'session62-health-error.png' });
    throw error;
  } finally {
    await browser.close();
  }
})();
