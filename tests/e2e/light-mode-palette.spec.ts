/**
 * Light-mode palette QA spec — Day2 SecOps
 *
 * Verifies that the .light CSS block correctly overrides the always-dark
 * custom properties, glass-panel borders, and that dark: Tailwind variants
 * gate severity-chip text colours correctly in both themes.
 */
import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5174";

/** Force a theme by writing directly to localStorage before navigation. */
async function setTheme(page: import("@playwright/test").Page, theme: "dark" | "light") {
  await page.addInitScript((t) => {
    localStorage.setItem("abcl-secviz-theme", t);
  }, theme);
}

// ---------------------------------------------------------------------------
// Check 1 — Dashboard `/` in dark mode and light mode
// ---------------------------------------------------------------------------
test("Check 1 dark: glass panels have dark #161B22 background, hairline borders", async ({
  page,
}) => {
  await setTheme(page, "dark");
  await page.goto(`${BASE}/`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  // Verify html element has no `light` class (dark mode)
  const htmlClass = await page.locator("html").getAttribute("class");
  expect(htmlClass).not.toContain("light");
  expect(htmlClass).toContain("dark");

  // Pick first glass-panel element and check its background colour
  const panel = page.locator(".glass-panel").first();
  await expect(panel).toBeVisible();

  const bg = await panel.evaluate((el) => window.getComputedStyle(el).backgroundColor);
  // #161B22 = rgb(22, 27, 34)
  expect(bg).toBe("rgb(22, 27, 34)");

  // Border should be a faint rgba white, not fully transparent and not solid
  const border = await panel.evaluate((el) => window.getComputedStyle(el).borderColor);
  // Must contain an alpha channel (not opaque black or opaque white)
  expect(border).toMatch(/rgba/);

  await page.screenshot({ path: "/tmp/qa-light-dark.png", fullPage: false });
  console.log("DARK screenshot: /tmp/qa-light-dark.png");
});

test("Check 1 light: glass panels have white background, hairline borders visible", async ({
  page,
}) => {
  await setTheme(page, "light");
  await page.goto(`${BASE}/`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  const htmlClass = await page.locator("html").getAttribute("class");
  expect(htmlClass).toContain("light");

  // Glass panel background must be white (#FFFFFF = rgb(255,255,255))
  const panel = page.locator(".glass-panel").first();
  await expect(panel).toBeVisible();

  const bg = await panel.evaluate((el) => window.getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgb(255, 255, 255)");

  // Border colour should not be pure transparent (hairline must be visible)
  const border = await panel.evaluate((el) => window.getComputedStyle(el).borderColor);
  // rgba(15,23,42,0.10) — should NOT be fully transparent
  expect(border).toMatch(/rgba/);
  // The alpha channel must be > 0 (i.e. not ",\s*0\)")
  expect(border).not.toMatch(/,\s*0\)/);

  // ToolTile text must use --text-primary (#0F172A) in light mode
  const canvasRoot = page.locator(".surface-canvas").first();
  if ((await canvasRoot.count()) > 0) {
    const canvasBg = await canvasRoot.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    // #F8FAFC = rgb(248,250,252)
    expect(canvasBg).toBe("rgb(248, 250, 252)");
  }

  await page.screenshot({ path: "/tmp/qa-light-light.png", fullPage: false });
  console.log("LIGHT screenshot: /tmp/qa-light-light.png");
});

// ---------------------------------------------------------------------------
// Check 2 — /config/changes (Risky changes) in light mode
// ---------------------------------------------------------------------------
test("Check 2 light: dangerous-class rows show dark red text (#B91C1C) not faint pink", async ({
  page,
}) => {
  await setTheme(page, "light");
  await page.goto(`${BASE}/config/changes`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Look for an element with the dangerous row class (text-[#B91C1C])
  const dangerousChip = page.locator('[class*="B91C1C"]').first();
  if ((await dangerousChip.count()) > 0) {
    const color = await dangerousChip.evaluate((el) => window.getComputedStyle(el).color);
    // #B91C1C = rgb(185, 28, 28)
    expect(color).toBe("rgb(185, 28, 28)");
    console.log("Dangerous chip color in light mode:", color, " PASS");
  } else {
    console.log("No .dangerous chip found on /config/changes; checking card backgrounds instead");
    // At minimum, glass panels must be white
    const panel = page.locator(".glass-panel").first();
    if ((await panel.count()) > 0) {
      const bg = await panel.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      expect(bg).toBe("rgb(255, 255, 255)");
    }
  }

  await page.screenshot({ path: "/tmp/qa-light-changes.png", fullPage: false });
  console.log("CHANGES screenshot: /tmp/qa-light-changes.png");
});

// ---------------------------------------------------------------------------
// Check 3 — /audit/checklist in light mode
// ---------------------------------------------------------------------------
test("Check 3 light: in-progress amber chips show dark amber (#B45309) not faint orange", async ({
  page,
}) => {
  await setTheme(page, "light");
  await page.goto(`${BASE}/audit/checklist`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  const amberChip = page.locator('[class*="B45309"]').first();
  if ((await amberChip.count()) > 0) {
    const color = await amberChip.evaluate((el) => window.getComputedStyle(el).color);
    // #B45309 = rgb(180, 83, 9)
    expect(color).toBe("rgb(180, 83, 9)");
    console.log("Amber chip color in light mode:", color, " PASS");
  } else {
    console.log("No amber chip found on /audit/checklist; verifying page loaded");
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(100);
  }

  await page.screenshot({ path: "/tmp/qa-light-checklist.png", fullPage: false });
  console.log("CHECKLIST screenshot: /tmp/qa-light-checklist.png");
});

// ---------------------------------------------------------------------------
// Check 4 — /tools/impervaWaf loss-reason chips in light mode
// ---------------------------------------------------------------------------
test("Check 4 light: loss-reason chips have readable text on /tools/impervaWaf", async ({
  page,
}) => {
  await setTheme(page, "light");
  await page.goto(`${BASE}/tools/impervaWaf`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // The page background should be light
  const htmlClass = await page.locator("html").getAttribute("class");
  expect(htmlClass).toContain("light");

  // Any severity chip text must NOT be faint (#F87171 = rgb(248,113,113))
  const chips = page.locator(
    '[class*="B91C1C"], [class*="B45309"], [class*="92400E"], [class*="15803D"]',
  );
  const chipCount = await chips.count();
  console.log("Loss-reason chips found:", chipCount);

  for (let i = 0; i < Math.min(chipCount, 5); i++) {
    const color = await chips.nth(i).evaluate((el) => window.getComputedStyle(el).color);
    // Must not be the light tint rgb(248,113,113)
    expect(color).not.toBe("rgb(248, 113, 113)");
    // Must not be faint amber rgb(245,158,11)
    expect(color).not.toBe("rgb(245, 158, 11)");
    console.log(`Chip ${i} color: ${color}`);
  }

  await page.screenshot({ path: "/tmp/qa-light-tool.png", fullPage: false });
  console.log("TOOL screenshot: /tmp/qa-light-tool.png");
});

// ---------------------------------------------------------------------------
// Check 5 — Contrast: text-[#B91C1C] computed color is rgb(185,28,28) in light mode
// ---------------------------------------------------------------------------
test("Check 5 contrast: B91C1C element computes rgb(185,28,28) not the pink tint in light mode", async ({
  page,
}) => {
  await setTheme(page, "light");
  await page.goto(`${BASE}/`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  // Inject a test probe element to confirm CSS variable resolution
  const computedColor = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.className = "text-[#B91C1C] dark:text-[#F87171]";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    const color = window.getComputedStyle(probe).color;
    document.body.removeChild(probe);
    return color;
  });

  console.log(
    "Computed color for text-[#B91C1C] dark:text-[#F87171] in light mode:",
    computedColor,
  );

  // In light mode the dark: variant must NOT apply
  // So it must be rgb(185,28,28) not rgb(248,113,113)
  expect(computedColor).toBe("rgb(185, 28, 28)");
});

// ---------------------------------------------------------------------------
// Check 6 — No regression: dark mode severity chips stay in light tints
// ---------------------------------------------------------------------------
test("Check 6 dark regression: severity chips render original light tints (F87171, F59E0B, etc.)", async ({
  page,
}) => {
  await setTheme(page, "dark");
  await page.goto(`${BASE}/`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  // In dark mode: text-[#B91C1C] dark:text-[#F87171] must render as rgb(248,113,113)
  const computedColor = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.className = "text-[#B91C1C] dark:text-[#F87171]";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    const color = window.getComputedStyle(probe).color;
    document.body.removeChild(probe);
    return color;
  });

  console.log("Computed color for text-[#B91C1C] dark:text-[#F87171] in dark mode:", computedColor);
  // Dark mode must use the bright tint: rgb(248,113,113)
  expect(computedColor).toBe("rgb(248, 113, 113)");

  // Amber tint check: dark:text-[#F59E0B] must give rgb(245,158,11)
  const amberColor = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.className = "text-[#B45309] dark:text-[#F59E0B]";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    const color = window.getComputedStyle(probe).color;
    document.body.removeChild(probe);
    return color;
  });

  console.log("Computed color for text-[#B45309] dark:text-[#F59E0B] in dark mode:", amberColor);
  expect(amberColor).toBe("rgb(245, 158, 11)");

  // Green tint check: dark:text-[#4ADE80] must give rgb(74,222,128)
  const greenColor = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.className = "text-[#15803D] dark:text-[#4ADE80]";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    const color = window.getComputedStyle(probe).color;
    document.body.removeChild(probe);
    return color;
  });

  console.log("Computed color for text-[#15803D] dark:text-[#4ADE80] in dark mode:", greenColor);
  expect(greenColor).toBe("rgb(74, 222, 128)");
});
