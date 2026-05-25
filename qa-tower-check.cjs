const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Full dashboard screenshot
  await page.screenshot({ path: '/tmp/qa-tile-names.png', fullPage: false });
  console.log('Full screenshot saved to /tmp/qa-tile-names.png');

  // Find ToolTile rows using overflow/ellipsis detection
  const tileData = await page.evaluate(() => {
    const results = [];
    const allElements = document.querySelectorAll('*');

    for (const el of allElements) {
      const style = window.getComputedStyle(el);
      const text = el.textContent?.trim() || '';
      if (
        (style.overflow === 'hidden' || style.textOverflow === 'ellipsis') &&
        text.length > 3 &&
        text.length < 80 &&
        el.children.length === 0
      ) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 8 && rect.height < 32 && rect.top > 80 && rect.top < 850) {
          results.push({
            text,
            fontSize: style.fontSize,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            textOverflow: style.textOverflow,
            whiteSpace: style.whiteSpace,
            overflow: style.overflow,
          });
        }
      }
    }
    return results.slice(0, 40);
  });

  console.log('\n=== Candidate tool name elements (leaf nodes w/ overflow) ===');
  tileData.forEach((el, i) => {
    const truncated = el.textOverflow === 'ellipsis' || el.overflow === 'hidden' ? ' [may truncate]' : '';
    console.log(`[${i}] "${el.text}" | ${el.fontSize} | w:${el.width}px${truncated} | pos:(${el.left},${el.top})`);
  });

  // Search for known tool names in all text nodes
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
      'Carbon Black',
      'CrowdStrike',
      'Palo Alto',
      'Splunk',
      'SentinelOne',
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
            fontSize: style?.fontSize,
            width: rect ? Math.round(rect.width) : 0,
            top: rect ? Math.round(rect.top) : 0,
            left: rect ? Math.round(rect.left) : 0,
            textOverflow: style?.textOverflow,
            whiteSpace: style?.whiteSpace,
          });
          break;
        }
      }
    }
    return found;
  });

  console.log('\n=== Known tool name occurrences ===');
  if (toolNameCheck.length === 0) {
    console.log('NONE FOUND - checking page structure...');
    // Dump visible text to understand what is on the page
    const pageText = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const texts = [];
      let node;
      while ((node = walker.nextNode())) {
        const t = node.textContent?.trim();
        if (t && t.length > 2) texts.push(t);
      }
      return texts.slice(0, 60);
    });
    console.log('Page text sample:', pageText.join(' | '));
  } else {
    toolNameCheck.forEach((r, i) => {
      const truncNote = r.textOverflow === 'ellipsis' ? ' [ELLIPSIS]' : '';
      console.log(`[${i}] "${r.fullText}" | fontSize:${r.fontSize} | w:${r.width}px | textOverflow:${r.textOverflow}${truncNote} | pos:(${r.left},${r.top})`);
    });
  }

  // Crop: leftmost tower pillar area
  // Try to find pillar containers
  const pillarInfo = await page.evaluate(() => {
    // Look for repeated column-like structures
    const candidates = [];
    const divs = document.querySelectorAll('div');
    for (const div of divs) {
      const rect = div.getBoundingClientRect();
      const cls = (div.className || '').toString();
      if (rect.width > 100 && rect.width < 350 && rect.height > 300 && rect.top >= 0 && rect.left >= 0) {
        candidates.push({
          cls: cls.slice(0, 60),
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        });
      }
    }
    // Return first 5 sorted by x position
    return candidates.sort((a, b) => a.x - b.x).slice(0, 5);
  });

  console.log('\n=== Pillar-like containers ===');
  pillarInfo.forEach((p, i) => {
    console.log(`[${i}] pos:(${p.x},${p.y}) size:${p.w}x${p.h} | class:"${p.cls}"`);
  });

  // Crop first pillar if found
  if (pillarInfo.length > 0) {
    const p = pillarInfo[0];
    const clipX = Math.max(0, p.x);
    const clipY = Math.max(0, p.y);
    const clipW = Math.min(p.w, 1440 - clipX);
    const clipH = Math.min(p.h, 900 - clipY);
    await page.screenshot({
      path: '/tmp/qa-tile-pillar.png',
      clip: { x: clipX, y: clipY, width: clipW, height: clipH },
    });
    console.log(`Pillar crop saved: x=${clipX} y=${clipY} ${clipW}x${clipH}`);
  } else {
    // Fallback crop
    await page.screenshot({
      path: '/tmp/qa-tile-pillar.png',
      clip: { x: 20, y: 80, width: 280, height: 750 },
    });
    console.log('Pillar crop saved (fallback): x=20 y=80 280x750');
  }

  await browser.close();
  console.log('\nDone.');
})();
