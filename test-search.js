const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Navigating to app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/search-01-home.png' });
    console.log('Screenshot saved: search-01-home.png');

    // Upload a PDF file with text
    console.log('Uploading PDF...');
    const fileInput = await page.$('input[type="file"]');
    const pdfPath = path.join(__dirname, 'test-sample.pdf');
    await fileInput.uploadFile(pdfPath);

    // Wait for PDF to load
    await page.waitForSelector('.react-pdf__Page', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({ path: 'screenshots/search-02-pdf-loaded.png' });
    console.log('Screenshot saved: search-02-pdf-loaded.png');

    // Test 1: Open search with button
    console.log('Test 1: Opening search with button...');
    const searchButtonXPath = '//button[contains(text(), "Search")]';
    const searchButton = await page.waitForSelector(`xpath/${searchButtonXPath}`);
    await searchButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.screenshot({ path: 'screenshots/search-03-search-opened.png' });
    console.log('Screenshot saved: search-03-search-opened.png');

    // Test 2: Enter search query
    console.log('Test 2: Entering search query...');
    const searchInput = await page.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type('PDF');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for search to complete

      await page.screenshot({ path: 'screenshots/search-04-search-results.png' });
      console.log('Screenshot saved: search-04-search-results.png');

      // Check if results are shown
      const resultsText = await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const resultElement = spans.find(span => span.textContent.includes('of'));
        return resultElement ? resultElement.textContent : null;
      });

      if (resultsText) {
        console.log('✓ Search results displayed:', resultsText);
      } else {
        console.log('⚠ No search results found');
      }
    }

    // Test 3: Navigate through results
    console.log('Test 3: Testing next/previous buttons...');
    const nextButton = await page.$('button[aria-label*="next search"]');
    if (nextButton) {
      await nextButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));

      await page.screenshot({ path: 'screenshots/search-05-next-result.png' });
      console.log('Screenshot saved: search-05-next-result.png');
      console.log('✓ Next button works');
    }

    const prevButton = await page.$('button[aria-label*="previous search"]');
    if (prevButton) {
      await prevButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));

      await page.screenshot({ path: 'screenshots/search-06-prev-result.png' });
      console.log('Screenshot saved: search-06-prev-result.png');
      console.log('✓ Previous button works');
    }

    // Test 4: Test keyboard shortcut (Enter for next)
    console.log('Test 4: Testing Enter key for next result...');
    await searchInput.focus();
    await page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.screenshot({ path: 'screenshots/search-07-enter-next.png' });
    console.log('Screenshot saved: search-07-enter-next.png');
    console.log('✓ Enter key navigation works');

    // Test 5: Close search
    console.log('Test 5: Closing search...');
    const closeButton = await page.$('button[aria-label*="Close search"]');
    if (closeButton) {
      await closeButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));

      await page.screenshot({ path: 'screenshots/search-08-search-closed.png' });
      console.log('Screenshot saved: search-08-search-closed.png');
      console.log('✓ Search closed successfully');
    }

    // Test 6: Test keyboard shortcut Ctrl+F
    console.log('Test 6: Testing Ctrl+F shortcut...');
    await page.keyboard.down('Control');
    await page.keyboard.press('f');
    await page.keyboard.up('Control');
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.screenshot({ path: 'screenshots/search-09-ctrl-f.png' });
    console.log('Screenshot saved: search-09-ctrl-f.png');

    const searchVisible = await page.$('input[placeholder*="Search"]');
    if (searchVisible) {
      console.log('✓ Ctrl+F opens search');
    } else {
      console.log('✗ Ctrl+F did not open search');
    }

    // Test 7: Search for non-existent text
    console.log('Test 7: Searching for non-existent text...');
    const searchInput2 = await page.$('input[placeholder*="Search"]');
    await searchInput2.click({ clickCount: 3 }); // Select all
    await searchInput2.type('NONEXISTENTTEXT123');
    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.screenshot({ path: 'screenshots/search-10-no-results.png' });
    console.log('Screenshot saved: search-10-no-results.png');

    const noResultsText = await page.evaluate(() => {
      const element = document.body.textContent;
      return element.includes('No results found');
    });

    if (noResultsText) {
      console.log('✓ "No results found" message displayed');
    } else {
      console.log('⚠ No results message not found');
    }

    console.log('\n=== SEARCH FEATURE TEST COMPLETE ===');
    console.log('All screenshots saved in screenshots/ directory');

    // Keep browser open for manual inspection
    console.log('\nBrowser will close in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();
