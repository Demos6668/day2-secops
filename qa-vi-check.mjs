import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const results = {};

  // ── CHECK 1: Direct OSINT app ──────────────────────────────────────────────
  const page1 = await browser.newPage();
  try {
    await page1.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 20000 });
    await page1.waitForTimeout(2000);

    // img with myvi.in src
    const viImg = await page1.$('img[src*="myvi.in"]');
    const viSrc = viImg ? await viImg.getAttribute('src') : null;
    const viNaturalWidth = viImg
      ? await viImg.evaluate(el => el.naturalWidth)
      : 0;

    // img with logo-mark.png should NOT exist
    const oldImg = await page1.$('img[src*="logo-mark.png"]');

    // text "day2.OSINT" visible
    const wordmark = await page1.locator('text=day2.OSINT').first().isVisible().catch(() => false);

    results.check1_vi_img_present = !!viImg;
    results.check1_vi_src = viSrc;
    results.check1_vi_natural_width = viNaturalWidth;
    results.check1_old_img_absent = !oldImg;
    results.check1_wordmark_visible = wordmark;

    await page1.screenshot({ path: '/tmp/qa-osint-vi-direct.png', fullPage: false });

    // meta author check (check 3)
    const content = await page1.content();
    const authorMatch = content.match(/<meta[^>]+name="author"[^>]+content="([^"]+)"/i)
      || content.match(/<meta[^>]+content="([^"]+)"[^>]+name="author"/i);
    results.check3_meta_author = authorMatch ? authorMatch[1] : 'NOT FOUND';

  } catch (e) {
    results.check1_error = e.message;
  } finally {
    await page1.close();
  }

  // ── CHECK 2: Iframe via port 5174 ──────────────────────────────────────────
  const page2 = await browser.newPage();
  try {
    await page2.goto('http://localhost:5174/vuln/osint', { waitUntil: 'networkidle', timeout: 30000 });
    await page2.waitForTimeout(6000);

    // Try to find iframe by title
    let foundInFrame = false;
    let iframeViNW = 0;

    // Check all frames for the 5173 content
    const frames = page2.frames();
    for (const frame of frames) {
      const url = frame.url();
      if (url.includes('5173') || url.includes('localhost')) {
        try {
          const viImgFrame = await frame.$('img[src*="myvi.in"]');
          if (viImgFrame) {
            iframeViNW = await viImgFrame.evaluate(el => el.naturalWidth);
            foundInFrame = true;
            break;
          }
        } catch (_) {}
      }
    }

    // Also try via iframe element handle
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
    results.check2_frames_found = frames.map(f => f.url());

    // Screenshot of the 5174 page
    await page2.screenshot({ path: '/tmp/qa-osint-vi-iframe.png', fullPage: false });

  } catch (e) {
    results.check2_error = e.message;
  } finally {
    await page2.close();
  }

  await browser.close();

  console.log(JSON.stringify(results, null, 2));
})();
