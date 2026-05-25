/**
 * E2E spec: Day2 OSINT reachability probe behaviour on /vuln/osint
 *
 * Path A — OSINT service is up   → state transitions to "ready", iframe mounts
 * Path B — OSINT service is down → state transitions to "unreachable", no iframe
 */

import { test, expect } from "@playwright/test";

const APP_URL = "http://localhost:5174/vuln/osint";
const OSINT_ORIGIN = "http://localhost:5173";
const STATE_TIMEOUT = 8_000; // generous cap beyond the 4 s probe timeout

// ─── helpers ───────────────────────────────────────────────────────────────

async function waitForState(
  page: import("@playwright/test").Page,
  state: "ready" | "unreachable" | "probing",
  timeoutMs = STATE_TIMEOUT,
) {
  await expect(page.locator(`[data-osint-state="${state}"]`)).toBeVisible({
    timeout: timeoutMs,
  });
}

// ─── Path A — reachable ────────────────────────────────────────────────────

test.describe("Path A — OSINT reachable", () => {
  test("state reaches ready, iframe mounts with content, pill shows connected", async ({
    page,
  }) => {
    await page.goto(APP_URL, { waitUntil: "domcontentloaded" });

    // 1. Wait up to 8 s for state to become "ready"
    await waitForState(page, "ready");

    // 2. iframe[title="Day2 OSINT"] exists
    const iframe = page.locator('iframe[title="Day2 OSINT"]');
    await expect(iframe).toBeAttached({ timeout: 3_000 });

    // 3. iframe contentFrame body has > 10 KB
    //    The OSINT origin is a Vite SPA — the raw HTML shell is ~2.6 KB but the
    //    body grows to hundreds of KB once JS bootstraps. Poll up to 15 s.
    const frame = await iframe.contentFrame();
    expect(frame, "contentFrame must be accessible (same-origin sandbox)").not.toBeNull();
    if (frame) {
      let bodyLen = 0;
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        bodyLen = await frame
          .locator("body")
          .innerHTML({ timeout: 2_000 })
          .then((h) => h.length)
          .catch(() => 0);
        if (bodyLen > 10_000) break;
        await page.waitForTimeout(500);
      }
      expect(bodyLen, "iframe body HTML must exceed 10 KB after JS bootstraps").toBeGreaterThan(
        10_000,
      );
    }

    // 4. Header pill text is "connected"
    await expect(page.locator("text=connected").first()).toBeVisible({ timeout: 3_000 });

    // 5. Unreachable message is NOT shown
    await expect(page.locator("text=Day2 OSINT is not reachable")).not.toBeVisible();

    await page.screenshot({ path: "/tmp/osint-reachable.png", fullPage: false });
  });

  test("Reload button cycles state probing → ready and iframe rebuilds", async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
    await waitForState(page, "ready");

    // Grab current iframe key via data attribute (React key shows as DOM position)
    const iframeBefore = page.locator('iframe[title="Day2 OSINT"]');
    await expect(iframeBefore).toBeAttached();

    // Click Reload button in the header toolbar (aria-label="Reload OSINT")
    // Set up a race-safe probing detector: listen for the attribute BEFORE clicking
    const probingPromise = page
      .waitForFunction(
        () =>
          document.querySelector("[data-osint-state]")?.getAttribute("data-osint-state") ===
          "probing",
        { timeout: 4_000 },
      )
      .catch(() => null); // non-fatal if the transition is too fast to observe

    await page.getByRole("button", { name: "Reload OSINT" }).click();

    // Best-effort: wait to see probing (may be too fast on localhost)
    await probingPromise;

    // Then resolve to "ready" again
    await waitForState(page, "ready");

    // iframe must still exist after reload
    const iframeAfter = page.locator('iframe[title="Day2 OSINT"]');
    await expect(iframeAfter).toBeAttached({ timeout: 3_000 });
  });
});

// ─── Path B — unreachable ──────────────────────────────────────────────────

test.describe("Path B — OSINT unreachable (route-intercepted)", () => {
  test("state becomes unreachable, panel + buttons shown, no iframe; Retry recovers", async ({
    page,
  }) => {
    // Intercept ALL traffic to the OSINT origin so the fetch probe fails
    await page.route(`${OSINT_ORIGIN}/**`, (route) => route.abort("connectionrefused"));

    await page.goto(APP_URL, { waitUntil: "domcontentloaded" });

    // 1. state becomes "unreachable" within 8 s (probe timeout 4 s + margin)
    await waitForState(page, "unreachable");

    // 2. Panel heading is visible
    await expect(page.locator("text=Day2 OSINT is not reachable")).toBeVisible({ timeout: 2_000 });

    // 3. Retry button is visible
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible({ timeout: 2_000 });

    // 4. "Open in new tab" link is visible — scoped to the unreachable panel to
    //    avoid strict-mode clash with the header "New tab" link (same aria-label)
    const unreachablePanel = page
      .locator("div.absolute.inset-0")
      .filter({ hasText: "Day2 OSINT is not reachable" });
    await expect(
      unreachablePanel.getByRole("link", { name: "Open Day2 OSINT in a new tab" }),
    ).toBeVisible({ timeout: 2_000 });

    // 5. No iframe in page
    await expect(page.locator('iframe[title="Day2 OSINT"]')).not.toBeAttached();

    // 6. Header pill text is "unreachable"
    await expect(page.locator("text=unreachable").first()).toBeVisible({ timeout: 2_000 });

    await page.screenshot({ path: "/tmp/osint-unreachable.png", fullPage: false });

    // 7. Lift route block, click Retry → state must recover to "ready"
    await page.unroute(`${OSINT_ORIGIN}/**`);

    await page.getByRole("button", { name: "Retry" }).click();

    // Should briefly probe then become ready
    await waitForState(page, "ready");

    // iframe must mount after recovery
    await expect(page.locator('iframe[title="Day2 OSINT"]')).toBeAttached({ timeout: 5_000 });
  });
});
