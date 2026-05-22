const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1920,1080']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('1. Navigating to home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'session49-verify-01-home.png' });
    
    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    console.log('2. Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile('test-sample.pdf');
    
    // Wait for PDF to load
    await page.waitForSelector('.react-pdf__Page', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'session49-verify-02-loaded.png' });
    
    console.log('3. Entering edit mode...');
    const editButton = await page.$('button[title*="Edit"]');
    if (editButton) {
      await editButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: 'session49-verify-03-edit-mode.png' });
    }
    
    console.log('4. Checking toolbar...');
    const toolbar = await page.$('.toolbar, [role="toolbar"]');
    if (toolbar) {
      console.log('✅ Toolbar found');
    }
    
    // Final screenshot
    await page.screenshot({ path: 'session49-verify-final.png' });
    
    // Report console errors
    if (consoleErrors.length > 0) {
      console.log('\n⚠️  Console Errors Found:');
      consoleErrors.forEach(err => console.log('  -', err));
    } else {
      console.log('\n✅ No console errors detected');
    }
    
    console.log('\n✅ Verification complete!');
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    await page.screenshot({ path: 'session49-verify-error.png' });
  } finally {
    await browser.close();
  }
})();
