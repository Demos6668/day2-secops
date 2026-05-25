import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);

  // Check all elements containing day2.OSINT regardless of visibility
  const count = await page.locator('text=day2.OSINT').count();
  const isVisible = await page.locator('text=day2.OSINT').first().isVisible().catch(() => false);

  // Also check via evaluate
  const domText = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.includes('day2')) texts.push(node.nodeValue.trim());
    }
    return texts;
  });

  // Check sidebar specifically
  const sidebarSpan = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    return spans.filter(s => s.textContent.includes('day2')).map(s => ({
      text: s.textContent,
      visible: s.offsetParent !== null,
      display: getComputedStyle(s).display,
      opacity: getComputedStyle(s).opacity,
    }));
  });

  console.log(JSON.stringify({ count, isVisible, domText, sidebarSpan }, null, 2));
  await browser.close();
})();
