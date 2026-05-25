import { test, expect, Page } from "@playwright/test";

const PAGE_URL = "http://localhost:5174/vuln/osint";
const OSINT_ORIGIN = "http://localhost:5173";

/**
 * Injects a window.fetch override that rejects any request to localhost:5173 immediately.
 * Must be called BEFORE page.goto() so addInitScript runs before React mounts.
 */
async function blockFetchProbe(page: Page) {
  await page.addInitScript(() => {
    const orig = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url;
      if (url.includes("localhost:5173")) {
        throw new TypeError("simulated connection refused");
      }
      return orig(input, init);
    };
  });
}

/**
 * Sets up a hanging route for the OSINT origin so the iframe never receives a
 * response and never fires onLoad. This prevents iframeLoaded from flipping to
 * true, letting the 12-second giveUp timer drive reachability → "unreachable".
 *
 * NOTE: route.abort() of any kind causes Chromium to fire the iframe's onLoad
 * immediately (for the resulting error document), which sets iframeLoaded=true
 * and flips reachability to "ready". A hanging route avoids this by keeping the
 * navigation pending indefinitely.
 */
async function hangOsintOrigin(page: Page) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await page.route(`${OSINT_ORIGIN}/**`, (_route) => {
    // Intentionally do nothing — route hangs, iframe never loads, onLoad never fires.
  });
}

test.describe("OSINT tolerant signal model — reachable path", () => {
  test("checks 1-7: iframe present, ready state, connected pill, reload works", async ({
    page,
  }) => {
    await page.goto(PAGE_URL);

    // Check 3: iframe is in the DOM from the start — NOT gated on fetch probe
    const iframe = page.locator('iframe[title="Day2 OSINT"]');
    await expect(iframe).toBeAttached({ timeout: 3_000 });

    // Check 2: data-osint-state becomes "ready" within 8 seconds
    const wrapper = page.locator("[data-osint-state]");
    await expect(wrapper).toHaveAttribute("data-osint-state", "ready", { timeout: 8_000 });

    // Check 5: header pill reads "connected"
    const pill = page.locator("text=connected").first();
    await expect(pill).toBeVisible({ timeout: 2_000 });

    // Check 6: "Day2 OSINT is not reachable" must NOT appear at any point
    const errorPanel = page.locator("text=Day2 OSINT is not reachable");
    await expect(errorPanel).not.toBeVisible();

    // Check 4: iframe contentFrame body has > 10 KB after SPA boots
    const iframeFrame = page.frame({ url: /localhost:5173/ });
    if (iframeFrame) {
      await iframeFrame.waitForLoadState("load");
      const bodyLen = await iframeFrame.evaluate(() => document.body.innerHTML.length);
      expect(bodyLen).toBeGreaterThan(10_000);
    } else {
      console.log("INFO: iframe frame not directly accessible; skipping body-size assertion");
    }

    // Screenshot — reachable happy path
    await page.screenshot({ path: "/tmp/osint-tolerant-reachable.png", fullPage: false });

    // Check 7: click Reload — state returns to "ready" and iframe rebuilds
    const reloadBtn = page.getByRole("button", { name: /Reload OSINT/i });
    await expect(reloadBtn).toBeVisible();
    await reloadBtn.click();

    // After reload the state transitions through probing → ready
    await expect(wrapper).toHaveAttribute("data-osint-state", "ready", { timeout: 10_000 });
    await expect(page.locator('iframe[title="Day2 OSINT"]')).toBeAttached({ timeout: 3_000 });
    // Error panel must still not appear
    await expect(errorPanel).not.toBeVisible();
  });
});

test.describe("OSINT tolerant signal model — unreachable path (checks 8-10)", () => {
  // Checks 8-10 run in a single test to avoid browser-context state leakage between tests.

  test("checks 8-10: blocked → unreachable panel → retry → ready", async ({ page }) => {
    // 1. Hang the OSINT origin so iframe never fires onLoad
    await hangOsintOrigin(page);
    // 2. Reject the fetch probe immediately via JS override
    await blockFetchProbe(page);

    await page.goto(PAGE_URL);

    const wrapper = page.locator("[data-osint-state]");
    const errorPanel = page.locator("text=Day2 OSINT is not reachable");

    // Check 8: within 14 seconds, data-osint-state becomes "unreachable"
    // (probeOk=false immediately via fetch override; iframeLoaded stays false
    //  because the hanging route keeps the iframe navigation pending;
    //  giveUp fires at 12s → reachability = "unreachable")
    await expect(wrapper).toHaveAttribute("data-osint-state", "unreachable", { timeout: 14_000 });

    // Check 9: error panel shows with Retry button and Open-in-new-tab link
    await expect(errorPanel).toBeVisible({ timeout: 2_000 });
    await expect(page.getByRole("button", { name: /Retry/i })).toBeVisible();
    await expect(page.locator('a:has-text("Open in new tab")').last()).toBeVisible();

    // Screenshot — unreachable state
    await page.screenshot({ path: "/tmp/osint-tolerant-unreachable.png", fullPage: false });

    // Check 10: unroute the hang, click Retry, confirm state returns to "ready"
    // Unrouting clears the hanging route so the next iframe navigation completes normally;
    // iframeLoaded fires → reachability = "ready"
    await page.unroute(`${OSINT_ORIGIN}/**`);

    await page.getByRole("button", { name: /Retry/i }).click();

    await expect(wrapper).toHaveAttribute("data-osint-state", "ready", { timeout: 14_000 });
    await expect(errorPanel).not.toBeVisible();
  });
});
