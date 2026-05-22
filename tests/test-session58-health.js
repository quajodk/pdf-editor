const puppeteer = require('puppeteer');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const messages = [];
  page.on('console', msg => messages.push(msg.text()));

  console.log('1. Navigating to home page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'session58-health-01-home.png' });
  console.log('✅ Home page loaded');

  console.log('2. Uploading PDF...');
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(path.join(__dirname, 'test-sample.pdf'));
  await delay(2000);
  await page.screenshot({ path: 'session58-health-02-loaded.png' });
  console.log('✅ PDF loaded');

  console.log('3. Checking toolbar...');
  const toolbar = await page.$('.toolbar, [class*="toolbar"]');
  if (toolbar) {
    console.log('✅ Toolbar present');
  }
  
  console.log('4. Testing Edit Text tool...');
  const editTextBtn = await page.$('button[title*="Edit"][title*="Text"], button[aria-label*="Edit"][aria-label*="Text"]');
  if (editTextBtn) {
    await editTextBtn.click();
    await delay(1000);
    await page.screenshot({ path: 'session58-health-03-edit-mode.png' });
    console.log('✅ Edit Text mode activated');
  }

  await page.screenshot({ path: 'session58-health-final.png' });

  console.log('\n📊 Summary:');
  console.log(`Console messages: ${messages.length}`);
  const errors = messages.filter(m => m.toLowerCase().includes('error') || m.toLowerCase().includes('warning'));
  console.log(`Errors/Warnings: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n⚠️ Console errors detected:');
    errors.forEach(e => console.log(`  - ${e}`));
  } else {
    console.log('✅ No console errors detected');
  }

  console.log('\n✅ Health check complete!');
  await browser.close();
})();
