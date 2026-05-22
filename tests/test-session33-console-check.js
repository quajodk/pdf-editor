const puppeteer = require('puppeteer');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('🧪 Session 33 - Console Error Check\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Comprehensive console monitoring
  const consoleMessages = {
    error: [],
    warning: [],
    info: [],
    log: []
  };

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();

    if (consoleMessages[type]) {
      consoleMessages[type].push(text);
    }

    if (type === 'error') {
      console.log('   ❌ ERROR:', text);
    }
  });

  // Monitor page errors
  page.on('pageerror', error => {
    console.log('   ❌ PAGE ERROR:', error.message);
    consoleMessages.error.push(`PAGE ERROR: ${error.message}`);
  });

  try {
    console.log('1️⃣ Loading application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await delay(2000);
    console.log('   ✅ Loaded');

    console.log('\n2️⃣ Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(path.join(__dirname, 'test-sample.pdf'));
    await delay(5000);
    console.log('   ✅ Uploaded');

    console.log('\n3️⃣ Testing Edit Text...');
    const editBtn = await page.$('button[title*="Edit Text"]');
    if (editBtn) {
      await editBtn.click();
      await delay(2000);
      console.log('   ✅ Activated');
    }

    console.log('\n4️⃣ Testing navigation...');
    const nextBtn = await page.$('button:has-text("Next")');
    if (nextBtn) {
      await nextBtn.click();
      await delay(1000);
      console.log('   ✅ Navigated');
    }

    console.log('\n5️⃣ Testing zoom...');
    const zoomIn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.title?.includes('Zoom In') || b.getAttribute('aria-label')?.includes('Zoom In'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    await delay(1000);
    console.log('   ' + (zoomIn ? '✅' : '⚠️ ') + ' Zoom tested');

    // Wait a bit more to catch any delayed errors
    await delay(3000);

    console.log('\n' + '='.repeat(60));
    console.log('📊 CONSOLE SUMMARY');
    console.log('='.repeat(60));
    console.log('Errors:   ', consoleMessages.error.length);
    console.log('Warnings: ', consoleMessages.warning.length);
    console.log('Info:     ', consoleMessages.info.length);
    console.log('Logs:     ', consoleMessages.log.length);
    console.log('='.repeat(60));

    if (consoleMessages.error.length > 0) {
      console.log('\n❌ ERRORS FOUND:');
      consoleMessages.error.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
      });
    } else {
      console.log('\n✅ NO CONSOLE ERRORS - APPLICATION IS CLEAN!');
    }

    if (consoleMessages.warning.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      consoleMessages.warning.slice(0, 5).forEach((warn, i) => {
        console.log(`${i + 1}. ${warn}`);
      });
      if (consoleMessages.warning.length > 5) {
        console.log(`... and ${consoleMessages.warning.length - 5} more`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Status: ' + (consoleMessages.error.length === 0 ? '✅ PASS' : '❌ FAIL'));
    console.log('='.repeat(60));

    await page.screenshot({ path: 'session33-final-check.png', fullPage: true });

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  } finally {
    await delay(2000);
    await browser.close();
  }
})();
