import { test } from "@playwright/test";

test("tower view: inspect Fortinet presence", async ({ page }) => {
  await page.goto("http://localhost:5174/", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  const count = await page.locator('[aria-label="Fortinet"]').count();
  const imgCount = await page.locator('img[src*="fortinet"]').count();
  const bodyText = (await page.textContent("body")) ?? "";
  const hasFortinetText = bodyText.includes("Fortinet");
  const pageTitle = await page.title();
  const url = page.url();

  console.log("Page URL:", url);
  console.log("Page title:", pageTitle);
  console.log("Fortinet aria-label chips:", count);
  console.log("Fortinet img[src*=fortinet]:", imgCount);
  console.log("Has Fortinet text in page:", hasFortinetText);

  await page.screenshot({ path: "/tmp/tower-view.png" });
});
