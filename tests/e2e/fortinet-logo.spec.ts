/**
 * E2E test: verify Fortinet OEM logo renders via logo.dev (www.fortinet.com)
 * after the domain-map fix (bare apex → www subdomain).
 *
 * Pages checked:
 *   1. /oems-overview  — OEM card grid
 *   2. /              — Tower view (OEM cluster row)
 *   3. /tools         — Tools list
 */

import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const BASE = "http://localhost:5174";
const LOGO_DEV_PREFIX = "https://img.logo.dev/www.fortinet.com";

/**
 * Wait for an <img> element to finish loading (complete=true) or error,
 * then return its intrinsic dimensions.
 */
async function waitForImageLoad(imgHandle: import("@playwright/test").Locator) {
  // Poll until the browser marks the image as "complete".
  await imgHandle
    .evaluate((el: HTMLImageElement) => {
      if (el.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        el.addEventListener("load", () => resolve(), { once: true });
        el.addEventListener("error", () => resolve(), { once: true });
      });
    })
    .catch(() => null);
}

interface ImgInfo {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  complete: boolean;
  errored: boolean;
}

async function collectFortinetImgs(page: import("@playwright/test").Page): Promise<ImgInfo[]> {
  // All <img> elements whose src contains "fortinet" (logo.dev URL) or whose
  // nearest ancestor [aria-label] is "Fortinet".
  const imgs = page.locator('img[src*="fortinet"], [aria-label="Fortinet"] img');
  const count = await imgs.count();
  if (count === 0) return [];

  const results: ImgInfo[] = [];
  for (let i = 0; i < count; i++) {
    const img = imgs.nth(i);
    await waitForImageLoad(img);
    const info = await img.evaluate((el: HTMLImageElement) => ({
      src: el.src,
      naturalWidth: el.naturalWidth,
      naturalHeight: el.naturalHeight,
      complete: el.complete,
      errored: el.complete && el.naturalWidth === 0,
    }));
    results.push(info);
  }
  return results;
}

// Also detect monogram fallback: a span[aria-label="Fortinet"] containing text "FN"
async function detectMonogram(page: import("@playwright/test").Page) {
  const chip = page.locator('[aria-label="Fortinet"]');
  const count = await chip.count();
  if (count === 0) return { found: false, text: "" };

  // Check text content of each chip that doesn't contain an img
  for (let i = 0; i < count; i++) {
    const el = chip.nth(i);
    const hasImg = (await el.locator("img").count()) > 0;
    if (!hasImg) {
      const text = (await el.textContent()) ?? "";
      if (text.trim().length > 0) {
        return { found: true, text: text.trim() };
      }
    }
  }
  return { found: false, text: "" };
}

// ─── /oems-overview ─────────────────────────────────────────────────────────

test("oems-overview: Fortinet card shows logo.dev image with natural dimensions", async ({
  page,
}) => {
  // Capture console errors for diagnostics
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const networkFails: string[] = [];
  page.on("requestfailed", (req) => {
    if (req.url().includes("fortinet")) networkFails.push(req.url());
  });

  await page.goto(`${BASE}/oems-overview`, { waitUntil: "networkidle" });

  // Give lazy-loaded images an extra moment
  await page.waitForTimeout(3000);

  // ── Screenshot: crop to the Fortinet card ──────────────────────────────
  const screenshotDir = "/tmp";
  const screenshotPath = path.join(screenshotDir, "fortinet-logo.png");

  // Try to locate the Fortinet card container for a tight crop
  const fortinetCard = page.locator('[aria-label="Fortinet"]').first();
  const cardVisible = await fortinetCard.isVisible().catch(() => false);

  if (cardVisible) {
    // Scroll into view, then screenshot the parent card if possible
    await fortinetCard.scrollIntoViewIfNeeded();
    // Try to find a card-level ancestor (data-testid, article, etc.)
    const cardBound = page.locator(
      '[data-testid*="fortinet"], [data-oem="Fortinet"], article:has([aria-label="Fortinet"])',
    );
    if ((await cardBound.count()) > 0) {
      await cardBound.first().screenshot({ path: screenshotPath });
    } else {
      // Fall back to viewport screenshot
      await page.screenshot({ path: screenshotPath });
    }
  } else {
    await page.screenshot({ path: screenshotPath });
  }

  console.log(`Screenshot saved to ${screenshotPath}`);

  // ── Collect img info ───────────────────────────────────────────────────
  const imgs = await collectFortinetImgs(page);
  const monogram = await detectMonogram(page);

  console.log("Fortinet <img> elements found:", JSON.stringify(imgs, null, 2));
  console.log("Monogram fallback:", JSON.stringify(monogram));
  if (consoleErrors.length) console.log("Console errors:", consoleErrors);
  if (networkFails.length) console.log("Network failures:", networkFails);

  // ── Assertions ─────────────────────────────────────────────────────────
  expect(
    imgs.length,
    "Expected at least one <img> with fortinet in src on /oems-overview",
  ).toBeGreaterThan(0);

  const primary = imgs[0];
  expect(primary.src, "img src should start with the logo.dev www.fortinet.com URL").toContain(
    LOGO_DEV_PREFIX,
  );

  expect(primary.complete, "img.complete should be true").toBe(true);

  expect(
    primary.naturalWidth,
    `naturalWidth should be >0 (got ${primary.naturalWidth}) — image may have 404'd. src=${primary.src}`,
  ).toBeGreaterThan(0);

  expect(
    primary.naturalHeight,
    `naturalHeight should be >0 (got ${primary.naturalHeight})`,
  ).toBeGreaterThan(0);

  // Confirm NO monogram fallback is visible
  expect(
    monogram.found,
    `Monogram fallback ("${monogram.text}") was rendered — logo.dev load may have failed`,
  ).toBe(false);
});

// ─── / (tower view) ─────────────────────────────────────────────────────────

test("tower view (/): Fortinet logo marks visible in OEM cluster row", async ({ page }) => {
  const networkFails: string[] = [];
  page.on("requestfailed", (req) => {
    if (req.url().includes("fortinet")) networkFails.push(req.url());
  });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  // Wait for at least one Fortinet chip to appear (handles lazy rendering)
  await page
    .locator('[aria-label="Fortinet"]')
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => null);
  // Give lazy-loaded images extra time to resolve after chips become visible
  await page.waitForTimeout(4000);

  const imgs = await collectFortinetImgs(page);
  const monogram = await detectMonogram(page);

  console.log("Tower view — Fortinet imgs:", JSON.stringify(imgs, null, 2));
  console.log("Tower view — Monogram:", JSON.stringify(monogram));
  if (networkFails.length) console.log("Tower view — Network failures:", networkFails);

  // If the tower view doesn't show OEMs at all, skip gracefully
  const oemChips = await page.locator('[aria-label="Fortinet"]').count();
  test.skip(
    oemChips === 0,
    "No Fortinet OEM chips found on tower view — page may not show OEM cluster row",
  );

  expect(imgs.length, "Expected at least one Fortinet <img> on tower view").toBeGreaterThan(0);

  for (const img of imgs) {
    expect(img.src).toContain(LOGO_DEV_PREFIX);
    expect(img.complete).toBe(true);
    expect(img.naturalWidth, `naturalWidth=0 on tower view, src=${img.src}`).toBeGreaterThan(0);
  }

  expect(monogram.found, `Monogram fallback visible on tower view ("${monogram.text}")`).toBe(
    false,
  );
});

// ─── /tools ─────────────────────────────────────────────────────────────────

test("/tools: at least one Fortinet row shows logo.dev image", async ({ page }) => {
  const networkFails: string[] = [];
  page.on("requestfailed", (req) => {
    if (req.url().includes("fortinet")) networkFails.push(req.url());
  });

  await page.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  const imgs = await collectFortinetImgs(page);
  const monogram = await detectMonogram(page);

  console.log("/tools — Fortinet imgs:", JSON.stringify(imgs, null, 2));
  console.log("/tools — Monogram:", JSON.stringify(monogram));
  if (networkFails.length) console.log("/tools — Network failures:", networkFails);

  const oemChips = await page.locator('[aria-label="Fortinet"]').count();
  test.skip(
    oemChips === 0,
    "No Fortinet OEM chips found on /tools — page may not include Fortinet rows",
  );

  expect(imgs.length, "Expected at least one Fortinet <img> on /tools").toBeGreaterThan(0);

  const successful = imgs.filter((i) => i.naturalWidth > 0);
  expect(
    successful.length,
    `Expected at least one successfully-loaded Fortinet logo on /tools. Found ${imgs.length} img(s) but none loaded. Srcs: ${imgs.map((i) => i.src).join(", ")}`,
  ).toBeGreaterThan(0);

  // Report all img details
  for (const img of imgs) {
    expect(img.src).toContain(LOGO_DEV_PREFIX);
  }
});
