import { test, expect } from '@playwright/test';

test('Take all required screenshots and verify details', async ({ page }) => {
  // Screenshot 1: /domains page
  await page.goto('http://localhost:5174/domains');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/qa-framework-domains.png', fullPage: true });
  
  // Check 6: sort order - verify Firewall Controller (0%) appears before Identity (97%)
  const body6 = await page.textContent('body');
  const fcIdx = body6?.indexOf('Firewall Controller') ?? -1;
  const iaIdx = body6?.indexOf('Identity & Access') ?? -1;
  const peIdx = body6?.indexOf('Perimeter & Edge') ?? -1;
  console.log('Firewall Controller idx:', fcIdx);
  console.log('Identity & Access idx:', iaIdx);
  console.log('Perimeter & Edge idx:', peIdx);
  console.log('FC before IA (worst-first):', fcIdx < iaIdx && fcIdx > 0 && iaIdx > 0);
  
  // Screenshot 2: /domains/perimeter-edge
  await page.goto('http://localhost:5174/domains/perimeter-edge');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/qa-framework-perimeter.png', fullPage: true });
  
  // Check if F5 BIG-IP renders (it shows as "BIG-IP Load Balancer / F5")
  const body3 = await page.textContent('body');
  console.log('Has BIG-IP:', body3?.includes('BIG-IP'));
  console.log('Has F5:', body3?.includes('F5'));
  console.log('Has Radware:', body3?.includes('Radware'));
  console.log('Has DefensePro:', body3?.includes('DefensePro'));
  
  // Screenshot 3: /tools/paloAltoSase
  await page.goto('http://localhost:5174/tools/paloAltoSase');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/qa-framework-palo.png', fullPage: true });
  
  // Check logo image
  const imgs = await page.locator('img').all();
  for (const img of imgs) {
    const src = await img.getAttribute('src');
    const alt = await img.getAttribute('alt');
    if (src?.includes('paloalto') || alt?.toLowerCase()?.includes('palo')) {
      console.log('Palo Alto logo img src:', src);
    }
  }
  
  // Check for brand chip / OEM marker
  const paloBody = await page.textContent('body');
  console.log('Palo Alto brand chip / OEM marker present:', 
    paloBody?.includes('paloaltonetworks') || paloBody?.includes('Palo Alto') || paloBody?.includes('logo.dev'));
});
