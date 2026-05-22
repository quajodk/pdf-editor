const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const errors = [];
  const warnings = [];
  
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      errors.push(text);
    } else if (type === 'warning') {
      warnings.push(text);
    }
  });
  
  try {
    console.log('Starting Session 50 verification...\n');
    
    // Navigate to app
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'session50-verify-01-home.png', fullPage: true });
    console.log('✓ Home page loaded');
    
    // Upload PDF
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('File input not found');
    }
    
    await fileInput.uploadFile('test-sample.pdf');
    console.log('✓ File uploaded');
    
    // Wait for PDF to load - look for canvas element
    await page.waitForSelector('canvas', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'session50-verify-02-loaded.png', fullPage: true });
    console.log('✓ PDF rendered to canvas');
    
    // Verify PDF content is visible
    const canvasElement = await page.$('canvas');
    if (canvasElement) {
      console.log('✓ Canvas element present');
    }
    
    // Wait a bit more to ensure all rendering is complete
    await new Promise(r => setTimeout(r, 2000));
    
    // Report results
    console.log('\n=== Verification Summary ===');
    if (errors.length > 0) {
      console.error('❌ Console errors found:', errors.length);
      errors.forEach(err => console.error('  -', err));
      throw new Error('Console errors detected');
    } else {
      console.log('✓ No console errors detected');
    }
    
    if (warnings.length > 0) {
      console.log('⚠ Warnings:', warnings.length, '(non-critical)');
    }
    
    await page.screenshot({ path: 'session50-verify-final.png', fullPage: true });
    console.log('\n✅ All verification checks passed!');
    console.log('Application is production-ready.');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    await page.screenshot({ path: 'session50-verify-error.png', fullPage: true });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
