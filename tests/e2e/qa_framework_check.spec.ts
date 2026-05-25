import { test, expect } from '@playwright/test';

test.describe('SecOps Framework QA', () => {

  test('Check 1 - Sidebar new leaf by Functional Domain', async ({ page }) => {
    await page.goto('http://localhost:5174/');
    await page.waitForLoadState('networkidle');
    
    // Look for Tool Landscape group and expand if needed
    const toolLandscape = page.locator('text=Tool Landscape').first();
    if (await toolLandscape.isVisible()) {
      await toolLandscape.click();
      await page.waitForTimeout(300);
    }
    
    const domainLeaf = page.locator('text=by Functional Domain').first();
    await expect(domainLeaf).toBeVisible();
    
    await domainLeaf.click();
    await page.waitForURL('**/domains**');
    await page.screenshot({ path: '/tmp/qa-framework-check1.png' });
    expect(page.url()).toContain('/domains');
  });

  test('Check 2 - /domains index page with 6 cards', async ({ page }) => {
    await page.goto('http://localhost:5174/domains');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/tmp/qa-framework-domains.png', fullPage: true });
    
    const body = await page.textContent('body');
    console.log('DOMAINS_BODY:', body?.substring(0, 2000));
    
    const domains = ['Perimeter & Edge', 'Identity & Access', 'Workload & Data', 'Endpoint Rigs', 'Network Plumbing', 'Firewall Controller'];
    for (const domain of domains) {
      const el = page.locator(`text="${domain}"`).first();
      await expect(el).toBeVisible({ timeout: 5000 });
    }
    
    // Check for badges
    const hasSNMP = body?.includes('SNMPv3') || body?.includes('SNMP');
    const hasREST = body?.includes('REST API') || body?.includes('REST');
    console.log('Has SNMP badge:', hasSNMP);
    console.log('Has REST badge:', hasREST);
  });

  test('Check 3 - /domains/perimeter-edge drill-in table', async ({ page }) => {
    await page.goto('http://localhost:5174/domains/perimeter-edge');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/tmp/qa-framework-perimeter.png', fullPage: true });
    
    const body = await page.textContent('body');
    console.log('PERIMETER_BODY:', body?.substring(0, 3000));
    
    // Check table columns
    const hasToolCol = body?.includes('Tool');
    const hasCollectionCol = body?.includes('Collection vector') || body?.includes('Collection Vector');
    const hasAlertCol = body?.includes('Critical alert threshold') || body?.includes('alert threshold');
    const hasChangeCol = body?.includes('Daily change points') || body?.includes('change points');
    console.log('Has Tool col:', hasToolCol, 'Collection col:', hasCollectionCol, 'Alert col:', hasAlertCol, 'Change col:', hasChangeCol);
    
    // Check tools present
    const tools = ['Fortinet NGFW', 'Palo Alto Prisma Access', 'F5 BIG-IP', 'Radware DefensePro', 'Imperva WAF', 'AppTrana'];
    for (const tool of tools) {
      const hasTool = body?.includes(tool);
      console.log(`Has ${tool}:`, hasTool);
    }
  });

  test('Check 4 - Palo Alto SASE tool detail', async ({ page }) => {
    await page.goto('http://localhost:5174/tools/paloAltoSase');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/tmp/qa-framework-palo.png', fullPage: true });
    
    const body = await page.textContent('body');
    console.log('PALO_BODY:', body?.substring(0, 3000));
    
    const notFound = body?.includes('Not Found') || body?.includes('404') || body?.includes('not found');
    console.log('Is NotFound page:', notFound);
    console.log('Has Palo Alto OEM:', body?.includes('Palo Alto'));
    console.log('Has Prisma Access:', body?.includes('Prisma Access'));
    console.log('Has SASE:', body?.includes('SASE'));
    console.log('Has REST API:', body?.includes('REST API'));
    console.log('Has SNMPv3:', body?.includes('SNMPv3'));
    console.log('Has Syslog:', body?.includes('Syslog'));
    console.log('Has /infra/v1/status:', body?.includes('/infra/v1/status'));
    console.log('Has SASE gateways or URL filtering:', body?.includes('SASE gateways') || body?.includes('URL filtering'));
  });

  test('Check 5 - fortinetFw tool detail OperationsPanel', async ({ page }) => {
    await page.goto('http://localhost:5174/tools/fortinetFw');
    await page.waitForLoadState('networkidle');
    
    const body = await page.textContent('body');
    console.log('FORTINET_BODY:', body?.substring(0, 2000));
    
    console.log('Has SNMPv3:', body?.includes('SNMPv3'));
    console.log('Has Syslog:', body?.includes('Syslog'));
    console.log('Has .1.3.6.1.4.1.12356:', body?.includes('.1.3.6.1.4.1.12356'));
  });

  test('Check 6 - /domains worst-status-first sorting', async ({ page }) => {
    await page.goto('http://localhost:5174/domains');
    await page.waitForLoadState('networkidle');
    
    const body = await page.textContent('body');
    console.log('DOMAINS_ORDER:', body?.substring(0, 3000));
    // We check visually in the screenshot
  });

  test('Check 7 - /oems-overview new OEMs', async ({ page }) => {
    await page.goto('http://localhost:5174/oems-overview');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/tmp/qa-framework-oems.png', fullPage: true });
    
    const body = await page.textContent('body');
    console.log('OEMS_BODY:', body?.substring(0, 3000));
    
    console.log('Has Palo Alto:', body?.includes('Palo Alto'));
    console.log('Has F5:', body?.includes('F5'));
    console.log('Has Radware:', body?.includes('Radware'));
    console.log('Has Check Point:', body?.includes('Check Point'));
  });
});
