import { test, expect } from '@playwright/test';

test('Check 1 - Sidebar new leaf by Functional Domain', async ({ page }) => {
  await page.goto('http://localhost:5174/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  
  // Take screenshot of initial state
  await page.screenshot({ path: '/tmp/qa-framework-home-initial.png' });
  
  // Look at sidebar — "Tool Landscape" group may be collapsed
  // Try clicking to expand if collapsed
  const allText = await page.textContent('body');
  const hasByFunctional = allText?.includes('by Functional Domain');
  console.log('Initial sidebar has by Functional Domain:', hasByFunctional);
  
  if (!hasByFunctional) {
    // Find "Tool Landscape" nav item and click to expand
    const tlItems = await page.locator('text=Tool Landscape').all();
    console.log('Tool Landscape elements count:', tlItems.length);
    for (const item of tlItems) {
      const visible = await item.isVisible();
      console.log('Tool Landscape visible:', visible);
      if (visible) {
        await item.click();
        await page.waitForTimeout(500);
        break;
      }
    }
  }
  
  await page.screenshot({ path: '/tmp/qa-framework-home-expanded.png' });
  const bodyAfter = await page.textContent('body');
  console.log('After expand has by Functional Domain:', bodyAfter?.includes('by Functional Domain'));
  
  // Try finding the link
  const link = page.locator('a[href="/domains"], a[href*="domains"]').first();
  const linkVisible = await link.isVisible().catch(() => false);
  console.log('Domains link visible:', linkVisible);
  
  if (linkVisible) {
    await link.click();
    await page.waitForTimeout(1000);
    const url = page.url();
    console.log('URL after link click:', url);
    await page.screenshot({ path: '/tmp/qa-framework-check1-after.png' });
    expect(url).toContain('/domains');
  } else {
    // Try text-based click
    const textLink = page.locator('text=by Functional Domain').first();
    const textLinkVisible = await textLink.isVisible().catch(() => false);
    console.log('Text link visible:', textLinkVisible);
    if (textLinkVisible) {
      await textLink.click();
      await page.waitForTimeout(1000);
      console.log('URL after text click:', page.url());
      await page.screenshot({ path: '/tmp/qa-framework-check1-text.png' });
    }
  }
  
  // Final check: does navigation to /domains work
  await page.goto('http://localhost:5174/domains');
  await page.waitForTimeout(2000);
  console.log('Direct /domains URL works:', page.url().includes('/domains'));
});

test('Check 3 - /domains/perimeter-edge drill-in table', async ({ page }) => {
  await page.goto('http://localhost:5174/domains/perimeter-edge');
  // Use domcontentloaded to avoid networkidle timeout
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/qa-framework-perimeter.png', fullPage: true });
  
  const body = await page.textContent('body');
  console.log('PERIMETER_BODY:', body?.substring(0, 4000));
  
  const hasToolCol = body?.includes('Tool');
  const hasCollectionCol = body?.includes('Collection') && (body?.includes('vector') || body?.includes('Vector'));
  const hasAlertCol = body?.includes('alert threshold') || body?.includes('Alert threshold') || body?.includes('Critical alert');
  const hasChangeCol = body?.includes('change point') || body?.includes('Change point') || body?.includes('Daily change');
  console.log('Has Tool col:', hasToolCol);
  console.log('Has Collection col:', hasCollectionCol);
  console.log('Has Alert col:', hasAlertCol);
  console.log('Has Change col:', hasChangeCol);
  
  const tools = ['Fortinet', 'Palo Alto', 'F5 BIG-IP', 'Radware', 'Imperva', 'AppTrana'];
  for (const tool of tools) {
    console.log(`Has ${tool}:`, body?.includes(tool));
  }
});

test('Check 5 - fortinetFw tool detail OperationsPanel', async ({ page }) => {
  await page.goto('http://localhost:5174/tools/fortinetFw');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  
  const body = await page.textContent('body');
  console.log('FORTINET_BODY:', body?.substring(0, 3000));
  
  console.log('Has SNMPv3:', body?.includes('SNMPv3'));
  console.log('Has Syslog:', body?.includes('Syslog'));
  console.log('Has .1.3.6.1.4.1.12356:', body?.includes('.1.3.6.1.4.1.12356'));
  console.log('Has Operational telemetry:', body?.includes('Operational telemetry') || body?.includes('OperationsPanel') || body?.includes('telemetry'));
});
