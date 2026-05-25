/**
 * E2E diagnostic spec: Day2 OSINT iframe embed on /vuln/osint
 *
 * Captures:
 *  - Page title
 *  - Browser console messages
 *  - Network requests (especially failures and :5173 traffic)
 *  - Page errors (uncaught exceptions)
 *  - iframe presence, bounding box, src, sandbox, contentDocument accessibility
 *  - Screenshot at /tmp/osint-embed.png
 *  - Whether the loading overlay persists (onLoad fired or not)
 */

import { test, expect } from "@playwright/test";
import * as path from "path";

const TARGET_URL = "http://localhost:5174/vuln/osint";
const SCREENSHOT_PATH = "/tmp/osint-embed.png";

test("diagnose OSINT iframe embed", async ({ page }) => {
  // --- Collect console messages ---
  const consoleMsgs: string[] = [];
  page.on("console", (msg) => {
    consoleMsgs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  // --- Collect page errors (uncaught exceptions) ---
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  // --- Collect network requests ---
  const requests: Array<{ url: string; status: number | null; failed: boolean }> = [];
  page.on("requestfailed", (req) => {
    requests.push({ url: req.url(), status: null, failed: true });
  });
  page.on("response", (resp) => {
    requests.push({ url: resp.url(), status: resp.status(), failed: false });
  });

  // --- Navigate ---
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 15_000 });

  // Give React time to mount the iframe
  await page.waitForTimeout(2000);

  // --- Page title ---
  const title = await page.title();
  console.log("\n=== PAGE TITLE ===");
  console.log(title);

  // --- Check iframe presence ---
  const iframeHandle = page.locator("iframe").first();
  const iframeCount = await page.locator("iframe").count();
  console.log(`\n=== IFRAME COUNT: ${iframeCount} ===`);

  let iframeSrc: string | null = null;
  let iframeSandbox: string | null = null;
  let iframeBoundingBox: { x: number; y: number; width: number; height: number } | null = null;
  let iframeVisible = false;
  let iframeInDOM = false;
  let crossOriginConfirmed = false;
  let contentDocAccessible = false;
  let overlayVisible = false;
  let onLoadFired = false;

  if (iframeCount > 0) {
    iframeInDOM = true;

    iframeSrc = await iframeHandle.getAttribute("src");
    iframeSandbox = await iframeHandle.getAttribute("sandbox");
    iframeBoundingBox = await iframeHandle.boundingBox();
    iframeVisible = await iframeHandle.isVisible();

    console.log(`\n=== IFRAME ATTRIBUTES ===`);
    console.log(`  src:     ${iframeSrc}`);
    console.log(`  sandbox: ${iframeSandbox}`);
    console.log(`  visible: ${iframeVisible}`);
    console.log(`  boundingBox: ${JSON.stringify(iframeBoundingBox)}`);

    // --- Check loading overlay (z-10 spinner) ---
    // The overlay has class "pointer-events-none" and contains the spinner
    const overlaySelector =
      "div.absolute.inset-0.flex.items-center.justify-center.bg-card\\/80.backdrop-blur-sm.z-10";
    const overlayCount = await page.locator(overlaySelector).count();
    // Also try a broader selector
    const overlayBroad = await page
      .locator("div.absolute.inset-0")
      .filter({ hasText: "Loading Day2 OSINT" })
      .count();
    overlayVisible = overlayBroad > 0;
    console.log(`\n=== LOADING OVERLAY ===`);
    console.log(`  overlay present (broad): ${overlayVisible}`);

    // --- Wait up to 10s for iframe contentDocument body to have content ---
    console.log(`\n=== WAITING FOR IFRAME CONTENT (up to 10s) ===`);
    let bodyHtml = "";
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      try {
        bodyHtml = await iframeHandle.contentFrame().then(async (frame) => {
          if (!frame) return "";
          const body = await frame
            .locator("body")
            .innerHTML({ timeout: 1000 })
            .catch(() => "");
          return body;
        });
        if (bodyHtml && bodyHtml.trim().length > 0) break;
      } catch {
        // cross-origin or not yet loaded
      }
      await page.waitForTimeout(500);
    }

    // --- Try contentFrame access ---
    try {
      const frame = await iframeHandle.contentFrame();
      if (frame) {
        contentDocAccessible = true;
        const bodyLength = await frame
          .locator("body")
          .innerHTML({ timeout: 3000 })
          .then((h) => h.length)
          .catch(() => 0);
        console.log(`  contentFrame accessible: true`);
        console.log(`  body innerHTML length: ${bodyLength}`);
        // Check if body has real content
        const bodyText = await frame
          .locator("body")
          .innerText({ timeout: 3000 })
          .catch(() => "");
        console.log(`  body text snippet: "${bodyText.slice(0, 200)}"`);

        // onLoad indicator: if we can access contentFrame and it has content, onLoad likely fired
        onLoadFired = bodyLength > 50;
      } else {
        console.log(`  contentFrame: null (cross-origin blocked or not loaded)`);
      }
    } catch (e: any) {
      const msg: string = e?.message ?? String(e);
      if (msg.includes("SecurityError") || msg.includes("cross-origin")) {
        crossOriginConfirmed = true;
        console.log(`  contentFrame SecurityError → cross-origin load SUCCEEDED`);
        onLoadFired = true; // cross-origin = it loaded
      } else {
        console.log(`  contentFrame error: ${msg}`);
      }
    }

    // --- Try evaluating iframe.contentWindow.location.href ---
    console.log(`\n=== IFRAME contentWindow.location.href PROBE ===`);
    try {
      const href = await page.evaluate(() => {
        const iframe = document.querySelector("iframe") as HTMLIFrameElement;
        if (!iframe) return "NO_IFRAME";
        try {
          return iframe.contentWindow?.location?.href ?? "NO_CONTENT_WINDOW";
        } catch (e: any) {
          return `EXCEPTION:${e?.name}:${e?.message}`;
        }
      });
      console.log(`  result: ${href}`);
      if (href && href.startsWith("EXCEPTION:SecurityError")) {
        crossOriginConfirmed = true;
        onLoadFired = true;
        console.log(`  → SecurityError = cross-origin loaded successfully`);
      } else if (href && href.startsWith("http://localhost:5173")) {
        console.log(`  → Same-origin access succeeded, iframe loaded`);
        onLoadFired = true;
      } else {
        console.log(`  → Unexpected result — iframe may not have loaded`);
      }
    } catch (e: any) {
      console.log(`  page.evaluate error: ${e?.message}`);
    }
  } else {
    console.log("  NO iframe found in DOM");
  }

  // --- Re-check overlay state after load attempt ---
  const overlayAfterLoad = await page
    .locator("div.absolute.inset-0")
    .filter({ hasText: "Loading Day2 OSINT" })
    .count();
  console.log(
    `\n=== OVERLAY AFTER LOAD WAIT: ${overlayAfterLoad > 0 ? "STILL VISIBLE" : "gone"} ===`,
  );

  // --- Screenshot ---
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
  console.log(`\n=== SCREENSHOT SAVED: ${SCREENSHOT_PATH} ===`);

  // --- Console messages ---
  console.log(`\n=== BROWSER CONSOLE (${consoleMsgs.length} messages) ===`);
  consoleMsgs.forEach((m) => console.log(" ", m));

  // --- Page errors ---
  console.log(`\n=== PAGE ERRORS (${pageErrors.length}) ===`);
  pageErrors.forEach((e) => console.log(" ", e));

  // --- Network: failed requests ---
  const failed = requests.filter((r) => r.failed);
  console.log(`\n=== FAILED NETWORK REQUESTS (${failed.length}) ===`);
  failed.forEach((r) => console.log(" ", r.url));

  // --- Network: requests to :5173 ---
  const osintReqs = requests.filter((r) => r.url.includes(":5173"));
  console.log(`\n=== REQUESTS TO :5173 (${osintReqs.length}) ===`);
  osintReqs.slice(0, 20).forEach((r) => console.log(`  [${r.status ?? "FAIL"}] ${r.url}`));

  // --- Summary ---
  console.log(`\n${"=".repeat(60)}`);
  console.log("DIAGNOSTIC SUMMARY");
  console.log("=".repeat(60));
  console.log(`  iframe in DOM:           ${iframeInDOM}`);
  console.log(`  iframe visible:          ${iframeVisible}`);
  console.log(`  iframe bounding box:     ${JSON.stringify(iframeBoundingBox)}`);
  console.log(`  iframe src:              ${iframeSrc}`);
  console.log(`  iframe sandbox:          ${iframeSandbox}`);
  console.log(`  loading overlay present: ${overlayVisible}`);
  console.log(`  overlay AFTER wait:      ${overlayAfterLoad > 0}`);
  console.log(`  onLoad fired (inferred): ${onLoadFired}`);
  console.log(`  contentDoc accessible:   ${contentDocAccessible}`);
  console.log(`  cross-origin confirmed:  ${crossOriginConfirmed}`);
  console.log(`  screenshot:              ${SCREENSHOT_PATH}`);
  console.log("=".repeat(60));

  // --- Assertions to surface findings ---
  expect(iframeCount, "iframe must exist in DOM").toBeGreaterThan(0);
  expect(iframeBoundingBox, "iframe must have a non-null bounding box").not.toBeNull();
  if (iframeBoundingBox) {
    expect(iframeBoundingBox.width, "iframe must have positive width").toBeGreaterThan(0);
    expect(iframeBoundingBox.height, "iframe must have positive height").toBeGreaterThan(0);
  }
});
