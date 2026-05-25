import { test } from '@playwright/test';
test('inspect CSS rules for dark:text-[#F87171]', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('abcl-secviz-theme', 'dark');
  });
  await page.goto('http://localhost:5174/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Find the exact CSS rule that would govern dark:text-[#F87171]
  const cssInfo = await page.evaluate(() => {
    const info: string[] = [];
    for (const sheet of document.styleSheets) {
      try {
        const rules = Array.from(sheet.cssRules);
        for (const rule of rules) {
          const text = rule.cssText || '';
          if (text.includes('F87171') || text.includes('f87171')) {
            info.push(text.slice(0, 300));
          }
        }
      } catch { /* cross-origin */ }
    }
    return info;
  });
  
  console.log('CSS rules containing F87171:');
  cssInfo.forEach((r, i) => console.log(`[${i}]: ${r}`));
  
  // Also check what the @variant or darkMode selector looks like
  const darkVariantInfo = await page.evaluate(() => {
    const info: string[] = [];
    for (const sheet of document.styleSheets) {
      try {
        const rules = Array.from(sheet.cssRules);
        for (const rule of rules) {
          if (rule instanceof CSSMediaRule || rule instanceof CSSLayerBlockRule) {
            const nestedRules = Array.from(rule.cssRules || []);
            for (const nested of nestedRules) {
              const text = nested.cssText || '';
              if (text.includes('F87171') || text.includes('f87171')) {
                info.push(`[media/layer]: ${rule.cssText?.slice(0,50)} -> ${text.slice(0, 200)}`);
              }
            }
          }
        }
      } catch { /* cross-origin */ }
    }
    return info;
  });
  
  console.log('Nested dark rules:');
  darkVariantInfo.forEach((r, i) => console.log(`[${i}]: ${r}`));
});
