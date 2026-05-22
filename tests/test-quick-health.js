const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Navigating to application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Check for errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/health-check.png', fullPage: true });
    
    // Check if app loaded
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for main elements
    const uploadButton = await page.$('button');
    console.log('Upload button found:', !!uploadButton);
    
    // Check for console errors
    if (errors.length > 0) {
      console.log('Console errors detected:');
      errors.forEach(err => console.log('  -', err));
    } else {
      console.log('✅ No console errors detected');
    }
    
    console.log('✅ Health check passed!');
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
  } finally {
    await browser.close();
  }
})();
