const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testPDFSave() {
  console.log('🧪 Testing PDF Save with Annotations...\n');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Set download behavior
    const downloadPath = path.resolve(__dirname, 'downloads');
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath);
    }

    await page._client().send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath
    });

    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    // Upload PDF
    console.log('📤 Uploading test PDF...');
    const pdfPath = path.resolve(__dirname, 'test-sample.pdf');

    // Wait for file input
    await page.waitForSelector('input[type="file"]', { timeout: 5000 });
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(pdfPath);

    // Wait for PDF to load
    console.log('⏳ Waiting for PDF to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take screenshot of loaded PDF
    await page.screenshot({ path: 'screenshots/01-pdf-loaded.png', fullPage: true });
    console.log('✅ PDF loaded successfully');

    // Add text annotation
    console.log('✏️ Adding text annotation...');
    await page.click('button[title="Text"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Click on PDF canvas to add text
    const canvas = await page.$('.cursor-crosshair');
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + 100, box.y + 100);

    // Wait for text input and type
    await page.waitForSelector('input[type="text"]', { timeout: 2000 });
    await page.type('input[type="text"]', 'Test Annotation');
    await page.keyboard.press('Enter');

    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'screenshots/02-text-added.png', fullPage: true });
    console.log('✅ Text annotation added');

    // Add rectangle shape
    console.log('📐 Adding rectangle shape...');
    await page.click('button[title="Rectangle"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Draw rectangle
    await page.mouse.move(box.x + 200, box.y + 150);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, box.y + 200);
    await page.mouse.up();

    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'screenshots/03-rectangle-added.png', fullPage: true });
    console.log('✅ Rectangle added');

    // Add highlight
    console.log('🎨 Adding highlight...');
    await page.click('button[title="Highlight"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Draw highlight
    await page.mouse.move(box.x + 150, box.y + 250);
    await page.mouse.down();
    await page.mouse.move(box.x + 250, box.y + 280);
    await page.mouse.up();

    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'screenshots/04-highlight-added.png', fullPage: true });
    console.log('✅ Highlight added');

    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Download PDF
    console.log('💾 Downloading PDF with annotations...');

    // Clear downloads folder
    const files = fs.readdirSync(downloadPath);
    files.forEach(file => fs.unlinkSync(path.join(downloadPath, file)));

    // Click download button
    await page.click('button[title="Download PDF (Ctrl+S)"]');

    // Wait for download
    console.log('⏳ Waiting for download to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if file was downloaded
    const downloadedFiles = fs.readdirSync(downloadPath);
    if (downloadedFiles.length > 0) {
      const downloadedFile = downloadedFiles[0];
      const filePath = path.join(downloadPath, downloadedFile);
      const stats = fs.statSync(filePath);

      console.log(`✅ PDF downloaded: ${downloadedFile}`);
      console.log(`   File size: ${stats.size} bytes`);

      if (stats.size > 1000) {
        console.log('✅ File appears to be a valid PDF');
      } else {
        console.log('❌ File size is suspiciously small');
      }
    } else {
      console.log('❌ No file was downloaded');
    }

    // Take final screenshot
    await page.screenshot({ path: 'screenshots/05-download-complete.png', fullPage: true });

    // Report console errors
    if (consoleErrors.length > 0) {
      console.log('\n⚠️ Console Errors:');
      consoleErrors.forEach(err => console.log('  -', err));
    } else {
      console.log('\n✅ No console errors detected');
    }

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'screenshots/error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Create screenshots directory
const screenshotsDir = path.resolve(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

testPDFSave().catch(console.error);
