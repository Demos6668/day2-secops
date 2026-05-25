import { test } from '@playwright/test';
test('probe dark mode severity chip colors on real elements', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('abcl-secviz-theme', 'dark');
  });
  await page.goto('http://localhost:5174/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  
  const htmlClass = await page.locator('html').getAttribute('class');
  console.log('HTML class:', htmlClass);
  
  // The SEVERITY_TEXT classes in ToolTile.tsx are:
  //   Critical: "text-[#B91C1C] dark:text-[#F87171]"
  // In dark mode the rendered class string contains "dark:text-\[#F87171\]"
  // but the computed color should be rgb(248,113,113) if CSS is applied.
  
  // Broader search: find all elements with 'CRIT' or 'MOD' text content  
  const critChips = page.locator('span').filter({ hasText: /^CRIT$/ });
  const modChips = page.locator('span').filter({ hasText: /^MOD$/ });
  const critCount = await critChips.count();
  const modCount = await modChips.count();
  console.log('CRIT chips:', critCount, 'MOD chips:', modCount);
  
  for (let i = 0; i < Math.min(critCount, 3); i++) {
    const cls = await critChips.nth(i).getAttribute('class');
    const color = await critChips.nth(i).evaluate(el => window.getComputedStyle(el).color);
    console.log(`CRIT[${i}] class: ${cls} | color: ${color}`);
  }
  
  for (let i = 0; i < Math.min(modCount, 2); i++) {
    const cls = await modChips.nth(i).getAttribute('class');
    const color = await modChips.nth(i).evaluate(el => window.getComputedStyle(el).color);
    console.log(`MOD[${i}] class: ${cls} | color: ${color}`);
  }
  
  // Also find cause count badges (High = text-[#B91C1C] dark:text-[#F87171])
  const causeBadges = page.locator('span[class*="B91C1C"]');
  const badgeCount = await causeBadges.count();
  console.log('Cause badges with B91C1C class:', badgeCount);
  for (let i = 0; i < Math.min(badgeCount, 3); i++) {
    const color = await causeBadges.nth(i).evaluate(el => window.getComputedStyle(el).color);
    console.log(`Badge[${i}] color: ${color}`);
  }
});
