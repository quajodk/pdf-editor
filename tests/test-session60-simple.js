const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });

    console.log('Session 60 Health Check\n');

    // Monitor console
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // 1. Home page
    console.log('1. Loading home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'session60-health-01-home.png' });
    console.log('✅ Home page loaded\n');

    // 2. Upload PDF
    console.log('2. Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(path.resolve(__dirname, 'test-sample.pdf'));
    await page.waitForSelector('.react-pdf__Page__canvas', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'session60-health-02-loaded.png' });
    console.log('✅ PDF loaded\n');

    // 3. Check toolbar buttons
    console.log('3. Checking toolbar...');
    const buttons = await page.$$('button');
    console.log(`✅ Found ${buttons.length} buttons\n`);

    // 4. Look for Edit Text button
    console.log('4. Testing Edit Text mode...');
    const allButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => ({
        title: b.getAttribute('title') || b.innerText || 'no-title',
        text: b.innerText
      }));
    });

    const editTextBtn = allButtons.find(b =>
      (b.title && b.title.includes('Edit')) ||
      (b.text && b.text.includes('📝'))
    );

    if (editTextBtn) {
      console.log('✅ Edit Text button found:', editTextBtn.title);
      await page.click(`button[title="${editTextBtn.title}"]`);
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: 'session60-health-03-edit-mode.png' });
      console.log('✅ Edit mode activated\n');
    } else {
      console.log('❌ Edit Text button not found\n');
      console.log('Available buttons:', allButtons.map(b => b.title).join(', '));
    }

    // Final screenshot
    await page.screenshot({ path: 'session60-health-final.png' });

    // Summary
    console.log('='.repeat(50));
    console.log('HEALTH CHECK SUMMARY');
    console.log('='.repeat(50));
    console.log('✅ Home page loads');
    console.log('✅ PDF upload works');
    console.log('✅ PDF renders');
    console.log('✅ Toolbar present');
    console.log(`Console errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('\nErrors found:');
      errors.forEach(e => console.log('  -', e));
    }
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
