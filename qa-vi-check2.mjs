// Use the pnpm-resolved playwright path directly
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// @playwright/test exposes chromium
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const results = {};

  // ── CHECK 1 & CHECK 3: Direct OSINT app at 5173 ───────────────────────────
  const page1 = await browser.newPage();
  try {
    await page1.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 20000 });
    await page1.waitForTimeout(2000);

    const viImg = await page1.$('img[src*="myvi.in"]');
    const viSrc = viImg ? await viImg.getAttribute('src') : null;
    const viNaturalWidth = viImg ? await viImg.evaluate(el => el.naturalWidth) : 0;

    const oldImg = await page1.$('img[src*="logo-mark.png"]');

    const wordmark = await page1.locator('text=day2.OSINT').first().isVisible().catch(() => false);

    results.check1_vi_img_present = !!viImg;
    results.check1_vi_src = viSrc;
    results.check1_vi_natural_width = viNaturalWidth;
    results.check1_old_img_absent = !oldImg;
    results.check1_wordmark_visible = wordmark;

    await page1.screenshot({ path: '/tmp/qa-osint-vi-direct.png', fullPage: false });

    // Check 3 – meta author
    const content = await page1.content();
    const m1 = content.match(/name="author"[^>]*content="([^"]+)"/i);
    const m2 = content.match(/content="([^"]+)"[^>]*name="author"/i);
    results.check3_meta_author = (m1 || m2) ? (m1 || m2)[1] : 'NOT FOUND';

  } catch (e) {
    results.check1_error = e.message;
  } finally {
    await page1.close();
  }

  // ── CHECK 2: Iframe via port 5174 ─────────────────────────────────────────
  const page2 = await browser.newPage();
  try {
    await page2.goto('http://localhost:5174/vuln/osint', { waitUntil: 'load', timeout: 30000 });
    await page2.waitForTimeout(7000);

    let foundInFrame = false;
    let iframeViNW = 0;

    const frames = page2.frames();
    results.check2_all_frame_urls = frames.map(f => f.url());

    for (const frame of frames) {
      try {
        const viImgFrame = await frame.$('img[src*="myvi.in"]');
        if (viImgFrame) {
          iframeViNW = await viImgFrame.evaluate(el => el.naturalWidth);
          foundInFrame = true;
          break;
        }
      } catch (_) {}
    }

    // Fallback: contentFrame via element handles
    if (!foundInFrame) {
      const iframes = await page2.$$('iframe');
      for (const iframeEl of iframes) {
        try {
          const cf = await iframeEl.contentFrame();
          if (cf) {
            const viImgFrame = await cf.$('img[src*="myvi.in"]');
            if (viImgFrame) {
              iframeViNW = await viImgFrame.evaluate(el => el.naturalWidth);
              foundInFrame = true;
              break;
            }
          }
        } catch (_) {}
      }
    }

    results.check2_iframe_vi_img = foundInFrame;
    results.check2_iframe_vi_natural_width = iframeViNW;

    await page2.screenshot({ path: '/tmp/qa-osint-vi-iframe.png', fullPage: false });

  } catch (e) {
    results.check2_error = e.message;
  } finally {
    await page2.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
