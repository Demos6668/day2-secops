const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Full dashboard screenshot
  await page.screenshot({ path: '/tmp/qa-tile-names.png', fullPage: false });
  console.log('Full screenshot saved.');

  // Find ToolTile rows - look for the h-12 rows with tool names
  const tileData = await page.evaluate(() => {
    const results = [];

    // Try to find tool name elements - look for truncated text elements in tower pillars
    // The title block should have the solution name
    const allElements = document.querySelectorAll('*');
    const candidates = [];

    for (const el of allElements) {
      const style = window.getComputedStyle(el);
      const text = el.textContent?.trim() || '';
      // Look for elements with overflow:hidden or text-overflow:ellipsis that contain tool names
      if (
        (style.overflow === 'hidden' || style.textOverflow === 'ellipsis') &&
        text.length > 3 &&
        text.length < 60 &&
        el.children.length === 0 // leaf nodes
      ) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 10 && rect.height < 30 && rect.top > 100) {
          candidates.push({
            text,
            fontSize: style.fontSize,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            overflow: style.overflow,
            textOverflow: style.textOverflow,
            whiteSpace: style.whiteSpace,
          });
        }
      }
    }
    return candidates.slice(0, 30);
  });

  console.log('\n=== Candidate tool name elements ===');
  tileData.forEach((el, i) => {
    console.log(`[${i}] "${el.text}" | fontSize:${el.fontSize} | w:${el.width}px | textOverflow:${el.textOverflow} | whiteSpace:${el.whiteSpace} | pos:(${el.left},${el.top})`);
  });

  // Now look specifically for known tool names
  const toolNameCheck = await page.evaluate(() => {
    const targetNames = [
      'Multi Factor Authentication',
      'MFA',
      'Deep Security',
      'HIPS',
      'Privilege Access Management',
      'PAM',
      'Next-Generation Firewall',
      'Endpoint Security',
      'TrendMicro',
      'Trend Micro',
    ];

    const found = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim() || '';
      for (const name of targetNames) {
        if (text.toLowerCase().includes(name.toLowerCase())) {
          const parent = node.parentElement;
          const rect = parent?.getBoundingClientRect();
          const style = parent ? window.getComputedStyle(parent) : null;
          found.push({
            fullText: text,
            matchedName: name,
            parentTag: parent?.tagName,
            parentClass: parent?.className?.toString().slice(0, 80),
            fontSize: style?.fontSize,
            width: rect ? Math.round(rect.width) : 0,
            top: rect ? Math.round(rect.top) : 0,
          });
          break;
        }
      }
    }
    return found;
  });

  console.log('\n=== Known tool name occurrences ===');
  if (toolNameCheck.length === 0) {
    console.log('NONE FOUND - tool names may not be in DOM or page may need interaction');
  } else {
    toolNameCheck.forEach((r, i) => {
      console.log(`[${i}] "${r.fullText}" (matched:"${r.matchedName}") | ${r.parentTag}.${r.parentClass} | fontSize:${r.fontSize} | w:${r.width}px | top:${r.top}`);
    });
  }

  // Find the tower pillar area and crop it
  const pillarBox = await page.evaluate(() => {
    // Look for elements that might be tower pillars
    const allDivs = document.querySelectorAll('div[class*="pillar"], div[class*="tower"], div[class*="column"], div[class*="col"]');
    for (const div of allDivs) {
      const rect = div.getBoundingClientRect();
      if (rect.width > 100 && rect.width < 400 && rect.height > 200 && rect.top >= 0) {
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }
    }
    return null;
  });

  console.log('\nPillar box found:', pillarBox);

  // Try to screenshot a pillar area - use a fixed crop of the left portion
  await page.screenshot({
    path: '/tmp/qa-tile-pillar.png',
    clip: { x: 0, y: 100, width: 300, height: 700 },
  });
  console.log('Pillar crop saved (left 300px, y=100-800).');

  // Also get a wider look at the tower area
  await page.screenshot({
    path: '/tmp/qa-tile-pillar-wide.png',
    clip: { x: 0, y: 60, width: 800, height: 840 },
  });
  console.log('Wide crop saved.');

  await browser.close();
})();
