const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.toString());
  });

  await page.goto('http://localhost:3000/fare-groups', { waitUntil: 'networkidle2' });

  console.log('Page loaded. Trying to click "Create Fare Group" button...');
  try {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const createBtn = btns.find(b => b.textContent.includes('Create Fare Group'));
      if (createBtn) createBtn.click();
      else console.log('BROWSER ERROR: Button not found');
    });

    await page.waitForTimeout(1000);
    console.log('Done.');
  } catch (e) {
    console.log('Script error:', e.message);
  }

  await browser.close();
})();