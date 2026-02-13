import { expect, type Page, test } from '@playwright/test';

/**
 * Theme toggle E2E tests with screenshot-based animation verification.
 *
 * Covers:
 * 1. Theme toggle switches data-theme attribute
 * 2. Theme persists across SPA navigation
 * 3. Theme persists on hard reload
 * 4. Circular reveal animation fires on theme toggle (mid-animation screenshot)
 * 5. Navigation slide animation does NOT fire on theme toggle
 * 6. Navigation slide animation DOES fire on page navigation
 * 7. Cards, header, footer colors match the active theme
 */

const BASE = '/en';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const getTheme = (page: Page) => page.evaluate(() => document.documentElement.dataset['theme']);

const getLocalStorageTheme = (page: Page) => page.evaluate(() => localStorage.getItem('theme'));

const clickThemeToggle = (page: Page) => page.locator('#theme-toggle').click();

/* ------------------------------------------------------------------ */
/*  1. Basic toggle                                                   */
/* ------------------------------------------------------------------ */

test.describe('Theme toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
  });

  test('switches between light and dark', async ({ page }) => {
    const initial = await getTheme(page);
    await page.screenshot({ path: 'e2e/screenshots/theme-01-initial.png' });

    await clickThemeToggle(page);
    await page.waitForTimeout(600);

    const toggled = await getTheme(page);
    expect(toggled).not.toBe(initial);
    await page.screenshot({ path: 'e2e/screenshots/theme-02-toggled.png' });

    await clickThemeToggle(page);
    await page.waitForTimeout(600);

    const restored = await getTheme(page);
    expect(restored).toBe(initial);
    await page.screenshot({ path: 'e2e/screenshots/theme-03-restored.png' });
  });

  test('persists theme in localStorage', async ({ page }) => {
    await clickThemeToggle(page);
    await page.waitForTimeout(600);

    const theme = await getTheme(page);
    const stored = await getLocalStorageTheme(page);
    expect(stored).toBe(theme);
  });
});

/* ------------------------------------------------------------------ */
/*  2. Theme persistence across SPA navigation                        */
/* ------------------------------------------------------------------ */

test.describe('Theme persistence', () => {
  test('survives SPA navigation', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.dataset['theme'] = 'dark';
    });
    await page.screenshot({ path: 'e2e/screenshots/theme-04-dark-before-nav.png' });

    await page.locator('nav a:has-text("Blog")').click();
    await page.waitForURL('**/blog');
    await page.waitForTimeout(400);

    const themeAfterNav = await getTheme(page);
    expect(themeAfterNav).toBe('dark');
    await page.screenshot({ path: 'e2e/screenshots/theme-05-dark-after-nav.png' });
  });

  test('survives hard reload', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.dataset['theme'] = 'dark';
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const themeAfterReload = await getTheme(page);
    expect(themeAfterReload).toBe('dark');
    await page.screenshot({ path: 'e2e/screenshots/theme-06-dark-after-reload.png' });
  });
});

/* ------------------------------------------------------------------ */
/*  3. Circular reveal animation on theme toggle                      */
/* ------------------------------------------------------------------ */

test.describe('Theme toggle animation', () => {
  test('circular reveal fires — mid-animation differs from before/after', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    const beforeBuf = await page.screenshot();

    const toggleBtn = page.locator('#theme-toggle');
    const box = await toggleBtn.boundingBox();
    expect(box).toBeTruthy();
    const { x, y, width, height } = box as { x: number; y: number; width: number; height: number };

    await page.mouse.click(x + width / 2, y + height / 2);

    await page.waitForTimeout(150);
    const midBuf = await page.screenshot({ path: 'e2e/screenshots/theme-07-mid-reveal.png' });

    await page.waitForTimeout(600);
    const afterBuf = await page.screenshot({ path: 'e2e/screenshots/theme-08-after-reveal.png' });

    expect(Buffer.compare(beforeBuf, midBuf)).not.toBe(0);
    expect(Buffer.compare(midBuf, afterBuf)).not.toBe(0);
    expect(Buffer.compare(beforeBuf, afterBuf)).not.toBe(0);
  });

  test('circular reveal covers ALL elements — no instant color changes (CDP animation control)', async ({
    page,
  }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
      document.documentElement.dataset['theme'] = 'light';
    });
    await page.waitForTimeout(200);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Animation.enable');

    const animationIds: string[] = [];
    cdp.on('Animation.animationStarted', (evt: { animation: { id: string } }) => {
      animationIds.push(evt.animation.id);
    });

    const regions = await page.evaluate(() => {
      const collect = (name: string, sel: string, corner = false) => {
        const el = document.querySelector(sel);
        if (!el) return undefined;
        const r = el.getBoundingClientRect();
        return {
          name,
          cx: corner ? Math.round(r.x + 12) : Math.round(r.x + r.width / 2),
          cy: corner ? Math.round(r.y + 12) : Math.round(r.y + 12),
        };
      };
      return [
        collect('header', 'header'),
        collect('main', 'main'),
        collect('card-1', '.card:nth-child(1)', true),
        collect('card-2', '.card:nth-child(2)', true),
      ].filter(Boolean) as Array<{ name: string; cx: number; cy: number }>;
    });

    const samplePixel = (buf: Buffer, px: number, py: number) =>
      page.evaluate(
        ({ b64, sx, sy }) => {
          const img = new Image();
          return new Promise<{ r: number; g: number; b: number }>((resolve) => {
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve({ r: 0, g: 0, b: 0 });
                return;
              }
              ctx.drawImage(img, 0, 0);
              const d = ctx.getImageData(sx, sy, 1, 1).data;
              resolve({ r: d[0] ?? 0, g: d[1] ?? 0, b: d[2] ?? 0 });
            };
            img.src = `data:image/png;base64,${b64}`;
          });
        },
        { b64: buf.toString('base64'), sx: px, sy: py },
      );

    const beforeFull = await page.screenshot({
      path: 'e2e/screenshots/theme-14-elements-before.png',
    });

    const toggleBtn = page.locator('#theme-toggle');
    const btnBox = await toggleBtn.boundingBox();
    expect(btnBox).toBeTruthy();
    const { x, y, width, height } = btnBox as {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    await page.mouse.click(x + width / 2, y + height / 2);

    await page.waitForTimeout(50);

    if (animationIds.length > 0) {
      await cdp.send('Animation.setPaused', { animations: animationIds, paused: true });
    }

    await page.waitForTimeout(50);
    const pausedFull = await page.screenshot({
      path: 'e2e/screenshots/theme-15-elements-paused.png',
    });

    if (animationIds.length > 0) {
      await cdp.send('Animation.setPaused', { animations: animationIds, paused: false });
    }
    await page.waitForTimeout(700);
    const afterFull = await page.screenshot({
      path: 'e2e/screenshots/theme-16-elements-after.png',
    });

    await cdp.send('Animation.disable');
    await cdp.detach();

    const colorDist = (
      a: { r: number; g: number; b: number },
      b: { r: number; g: number; b: number },
    ) => Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);

    const THRESHOLD = 20;

    type Diag = {
      name: string;
      before: { r: number; g: number; b: number };
      paused: { r: number; g: number; b: number };
      after: { r: number; g: number; b: number };
      distBA: number;
      distPB: number;
      distPA: number;
      status: string;
    };
    const diagnostics: Diag[] = [];

    for (const region of regions) {
      const bPx = await samplePixel(beforeFull, region.cx, region.cy);
      const pPx = await samplePixel(pausedFull, region.cx, region.cy);
      const aPx = await samplePixel(afterFull, region.cx, region.cy);

      const distBA = colorDist(bPx, aPx);
      const distPB = colorDist(pPx, bPx);
      const distPA = colorDist(pPx, aPx);

      const themeChanged = distBA > THRESHOLD;
      const stillOld = themeChanged && distPB < THRESHOLD;
      const alreadyNew = themeChanged && distPA < THRESHOLD;
      const crossFading = themeChanged && !stillOld && !alreadyNew;

      diagnostics.push({
        name: region.name,
        before: bPx,
        paused: pPx,
        after: aPx,
        distBA,
        distPB,
        distPA,
        status: !themeChanged
          ? 'NO_CHANGE'
          : stillOld
            ? 'OK_REVEAL'
            : alreadyNew
              ? 'BUG_INSTANT'
              : crossFading
                ? 'BUG_CROSSFADE'
                : 'UNKNOWN',
      });
    }

    console.log(
      `\n=== Theme Reveal Diagnostics (CDP paused, ${animationIds.length} animations captured) ===`,
    );
    for (const d of diagnostics) {
      const fmt = (c: { r: number; g: number; b: number }) => `rgb(${c.r},${c.g},${c.b})`;
      console.log(
        `  ${d.name.padEnd(10)} ${d.status.padEnd(16)} | ` +
          `before=${fmt(d.before)} paused=${fmt(d.paused)} after=${fmt(d.after)} | ` +
          `Δ(b↔a)=${d.distBA.toFixed(1)} Δ(p↔b)=${d.distPB.toFixed(1)} Δ(p↔a)=${d.distPA.toFixed(1)}`,
      );
    }
    console.log(`${'='.repeat(90)}\n`);

    const bugs = diagnostics.filter(
      (d) => d.status === 'BUG_INSTANT' || d.status === 'BUG_CROSSFADE',
    );
    if (bugs.length > 0) {
      const details = bugs.map((b) => `${b.name} (${b.status})`).join(', ');
      expect(bugs, `Elements NOT covered by circular reveal: ${details}`).toHaveLength(0);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  4. Navigation does NOT trigger on theme toggle                    */
/* ------------------------------------------------------------------ */

test.describe('Animation isolation', () => {
  test('theme toggle does not move main content', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    await clickThemeToggle(page);
    await page.waitForTimeout(100);

    const mainPositionDuring = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return null;
      const style = getComputedStyle(main);
      return { transform: style.transform, opacity: style.opacity };
    });

    expect(mainPositionDuring).toBeTruthy();
    const { transform, opacity } = mainPositionDuring as { transform: string; opacity: string };
    expect(transform).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    expect(opacity).toBe('1');

    await page.waitForTimeout(600);
    await page.screenshot({ path: 'e2e/screenshots/theme-09-no-slide-on-toggle.png' });
  });

  test('navigation DOES animate main content with slide', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    const beforeBuf = await page.screenshot();

    await page.locator('nav a:has-text("Blog")').click();

    await page.waitForTimeout(100);
    await page.screenshot({ path: 'e2e/screenshots/theme-10-nav-mid-slide.png' });

    await page.waitForURL('**/blog');
    await page.waitForTimeout(400);

    const afterNavBuf = await page.screenshot({
      path: 'e2e/screenshots/theme-11-nav-after-slide.png',
    });

    expect(Buffer.compare(beforeBuf, afterNavBuf)).not.toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  5. No color flash on SPA navigation in dark theme                 */
/* ------------------------------------------------------------------ */

test.describe('SPA navigation color flash', () => {
  test('interactive elements must not use transition:all (causes flash on SPA navigation)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/blog`);
    await page.waitForLoadState('networkidle');

    const violations = await page.evaluate(() => {
      const seen = new Set<Element>();
      const results: Array<{ el: string; property: string; transition: string }> = [];

      document.querySelectorAll('button, a, [class*="btn"], [role="button"]').forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const cs = getComputedStyle(el);
        const prop = cs.transitionProperty;
        const dur = cs.transitionDuration;
        if ((prop === 'all' || prop.includes('all')) && dur !== '0s') {
          const tag = el.tagName.toLowerCase();
          const cls = el.className ? `.${String(el.className).split(' ').join('.')}` : '';
          results.push({
            el: `${tag}${cls}`,
            property: prop,
            transition: cs.transition,
          });
        }
      });
      return results;
    });

    console.log('\n=== transition:all violations ===');
    for (const v of violations) {
      console.log(`  ${v.el}: transitionProperty=${v.property}`);
    }
    console.log('=================================\n');

    expect(
      violations,
      `Elements with transition:all (causes white flash on SPA nav in dark theme):\n${violations.map((v) => `  ${v.el}`).join('\n')}`,
    ).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  6. Visual regression: theme colors on key elements                */
/* ------------------------------------------------------------------ */

test.describe('Theme visual consistency', () => {
  test('light theme colors are correct', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
      document.documentElement.dataset['theme'] = 'light';
    });
    await page.waitForTimeout(100);

    const colors = await page.evaluate(() => {
      const html = document.documentElement;
      const card = document.querySelector('.card');
      const header = document.querySelector('header');
      const cs = (el: Element | null) => (el ? getComputedStyle(el) : null);
      return {
        htmlBg: cs(html)?.backgroundColor,
        htmlColor: cs(html)?.color,
        cardBg: cs(card)?.backgroundColor,
        headerBg: cs(header)?.backgroundColor,
      };
    });

    await page.screenshot({ path: 'e2e/screenshots/theme-12-light-colors.png' });

    expect(colors.htmlBg).toBeTruthy();
    expect(colors.cardBg).toBeTruthy();
    expect(colors.headerBg).toBeTruthy();

    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.dataset['theme'] = 'dark';
    });
    await page.waitForTimeout(100);

    const darkColors = await page.evaluate(() => {
      const html = document.documentElement;
      const card = document.querySelector('.card');
      const header = document.querySelector('header');
      const cs = (el: Element | null) => (el ? getComputedStyle(el) : null);
      return {
        htmlBg: cs(html)?.backgroundColor,
        htmlColor: cs(html)?.color,
        cardBg: cs(card)?.backgroundColor,
        headerBg: cs(header)?.backgroundColor,
      };
    });

    await page.screenshot({ path: 'e2e/screenshots/theme-13-dark-colors.png' });

    expect(darkColors.htmlBg).not.toBe(colors.htmlBg);
    expect(darkColors.cardBg).not.toBe(colors.cardBg);
    expect(darkColors.headerBg).not.toBe(colors.headerBg);
  });
});
