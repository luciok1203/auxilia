/* Run against `yarn vite preview --port 4173`.
 * PLAYWRIGHT_MODULE may point to an existing Playwright installation.
 * Synthetic VisualViewport cases test geometry, not actual Kakao/Safari chrome. */
const report = (message) => process.stdout.write(`${message}\n`);
const assert = require('node:assert/strict');
const { chromium, webkit } = require(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const url = process.env.QA_URL || 'http://127.0.0.1:4173';

async function installViewport(page, height, safeTop = 0, safeBottom = 0) {
  await page.addInitScript(
    ({ height, safeTop, safeBottom }) => {
      const viewport = new EventTarget();
      Object.assign(viewport, {
        height,
        width: innerWidth,
        offsetTop: 0,
        scale: 1,
      });
      Object.defineProperty(window, 'visualViewport', { value: viewport });
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.style.setProperty(
          '--safe-top',
          `${safeTop}px`
        );
        document.documentElement.style.setProperty(
          '--safe-bottom',
          `${safeBottom}px`
        );
        viewport.dispatchEvent(new Event('resize'));
      });
    },
    { height, safeTop, safeBottom }
  );
}

async function resizeVisible(page, height, scale = 1) {
  await page.evaluate(
    ({ height, scale }) => {
      Object.assign(visualViewport, { height, scale });
      visualViewport.dispatchEvent(new Event('resize'));
    },
    { height, scale }
  );
  await page.waitForTimeout(100);
}

async function settled(page, index) {
  await page.waitForFunction((index) => {
    const section = document.querySelectorAll('.hero, .section')[index];
    return Math.abs(section.getBoundingClientRect().top) < 1;
  }, index);
  assert.equal(
    await page
      .locator('.mobile-pagination a')
      .nth(index)
      .getAttribute('aria-current'),
    'location'
  );
}

async function timeInput(page, method) {
  await page.waitForTimeout(550); // Let prior tap's compatibility-click guard expire.
  return page.evaluate(
    (method) =>
      new Promise((resolve) => {
        const original = window.scrollTo;
        const calls = [];
        const start = performance.now();
        window.scrollTo = function (...args) {
          calls.push({ t: performance.now() - start, y: args[0].top });
          return original.apply(this, args);
        };
        if (method === 'tap')
          document.querySelectorAll('.mobile-pagination a')[2].click();
        else {
          const target = document.getElementById('about');
          for (const [type, y] of [
            ['touchstart', 500],
            ['touchmove', 360],
            ['touchend', 360],
          ]) {
            const event = new Event(type, { bubbles: true, cancelable: true });
            Object.defineProperty(event, 'touches', {
              value: type === 'touchend' ? [] : [{ clientX: 180, clientY: y }],
            });
            target.dispatchEvent(event);
          }
        }
        setTimeout(() => {
          window.scrollTo = original;
          resolve({
            first: calls[0]?.t,
            last: calls.at(-1)?.t,
            count: calls.length,
          });
        }, 600);
      }),
    method
  );
}

async function run(name, engine) {
  const browser = await engine.launch(
    name === 'Chromium' ? { channel: 'msedge' } : {}
  );
  try {
    for (const [width, height, visible, top, bottom] of [
      [320, 568, 568, 0, 0],
      [375, 667, 667, 47, 34],
      [390, 664, 664, 47, 34],
      [430, 740, 740, 47, 34],
      [375, 812, 550, 47, 34],
      [667, 375, 320, 0, 21],
    ]) {
      const page = await browser.newPage({
        viewport: { width, height },
        hasTouch: true,
        isMobile: true,
      });
      await installViewport(page, visible, top, bottom);
      const failed = [];
      page.on('pageerror', (error) => failed.push(error.message));
      page.on('response', (response) => {
        if (response.url().includes('.woff') && response.status() !== 200)
          failed.push(response.url());
      });
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
      const layout = await page.evaluate(() => {
        const sections = [...document.querySelectorAll('.hero, .section')];
        return {
          heights: sections.map((el) => el.getBoundingClientRect().height),
          overflow: document.documentElement.scrollWidth > innerWidth,
          fonts: [
            ...new Set(
              [...document.fonts]
                .filter((f) => f.status === 'loaded')
                .map((f) => f.family.replaceAll('"', ''))
            ),
          ],
          clipping: [...document.querySelectorAll('.section')].map((el) => {
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            const top = rect.top + Number.parseFloat(style.paddingTop);
            const bottom = rect.bottom - Number.parseFloat(style.paddingBottom);
            const children = [
              ...el.querySelectorAll(
                'h2,.bodycopy,.card,.product,.choice,.cta,.step,.mobile-notice'
              ),
            ];
            return {
              id: el.id,
              px: Math.max(
                0,
                ...children.map((child) => {
                  const r = child.getBoundingClientRect();
                  return Math.max(top - r.top, r.bottom - bottom);
                })
              ),
            };
          }),
        };
      });
      assert.deepEqual(failed, []);
      assert.equal(layout.overflow, false);
      assert.ok(layout.heights.every((h) => Math.abs(h - visible) < 1));
      for (const font of [
        'Tinos',
        'Libre Baskerville Variable',
        'Noto Serif KR Variable',
        'Arimo',
        'Noto Sans KR Variable',
      ])
        assert.ok(layout.fonts.includes(font), font);
      assert.ok(
        layout.clipping.every((c) => c.px < 2),
        `${name} ${width}/${visible}: ${JSON.stringify(layout.clipping)}`
      );
      await page.locator('.mobile-pagination a').nth(5).tap();
      await settled(page, 5); // Include max-scroll clamping in mismatched WebViews.
      report(
        `${name}: ${width}×${visible}, safe area ${top}+${bottom}: fonts/layout passed`
      );
      await page.close();
    }

    for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        reducedMotion,
      });
      await installViewport(page, 700);
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      const links = page.locator('.mobile-pagination a');
      await links.nth(1).tap();
      await settled(page, 1);
      const tapTiming = await timeInput(page, 'tap');
      await settled(page, 2);
      await links.nth(1).tap();
      await settled(page, 1);
      const swipeTiming = await timeInput(page, 'swipe');
      await settled(page, 2);
      const expectedDuration = 450;
      for (const timing of [tapTiming, swipeTiming]) {
        assert.ok(timing.count > 2);
        assert.ok(
          Math.abs(timing.last - expectedDuration) < 70,
          JSON.stringify(timing)
        );
      }
      assert.ok(Math.abs(tapTiming.last - swipeTiming.last) < 50);
      report(
        `${name} ${reducedMotion}: tap ${tapTiming.last.toFixed(1)}ms, swipe ${swipeTiming.last.toFixed(1)}ms`
      );
      await links.nth(1).tap();
      await settled(page, 1);
      // Same controller: wheel, tap, latest-target scrub intent.
      await page
        .locator('#about')
        .dispatchEvent('wheel', { deltaY: 120, deltaMode: 0 });
      await settled(page, 2);
      await links.nth(5).tap();
      await page.waitForTimeout(50);
      await links.nth(3).tap();
      await resizeVisible(page, 620);
      await settled(page, 3);
      const beforeMenu = await page.evaluate(() => window.scrollY);
      await page.locator('.mobile-menu-toggle').tap();
      await page.waitForTimeout(550);
      await page.keyboard.press('PageDown');
      const prevented = await page
        .locator('.mobile-menu-toggle')
        .evaluate((el) => {
          const event = new WheelEvent('wheel', {
            deltaY: 200,
            bubbles: true,
            cancelable: true,
          });
          el.dispatchEvent(event);
          return event.defaultPrevented;
        });
      assert.equal(prevented, true);
      if (name === 'Chromium') await page.mouse.wheel(0, 200);
      assert.equal(await page.evaluate(() => window.scrollY), beforeMenu);
      await page.locator('.mobile-menu-toggle').tap();
      await page.waitForFunction(
        () => !document.documentElement.dataset.menuLocked
      );
      assert.equal(await page.evaluate(() => window.scrollY), beforeMenu);
      assert.equal(await page.evaluate(() => document.body.style.position), '');
      await page.locator('.mobile-menu-toggle').tap();
      await page
        .locator('.mobile-menu-overlay')
        .tap({ position: { x: 5, y: 100 } });
      await page.waitForFunction(
        () => !document.documentElement.dataset.menuLocked
      );
      assert.equal(await page.evaluate(() => document.body.style.position), '');
      const durations = await page
        .locator('.mobile-menu-toggle span')
        .first()
        .evaluate((el) => getComputedStyle(el).transitionDuration);
      assert.equal(durations, '0.36s');
      assert.ok(
        await page
          .locator('.mobile-drawer')
          .evaluate((el) =>
            getComputedStyle(el).transitionTimingFunction.startsWith(
              'cubic-bezier(0.7, 0, 0.3, 1)'
            )
          )
      );
      const drawerDuration = await page
        .locator('.mobile-drawer')
        .evaluate((el) => getComputedStyle(el).transitionDuration);
      assert.ok(
        drawerDuration.split(',').every((value) => value.trim() === '0.36s')
      );
      // Long press is retained on touch and reduced-motion preferences.
      const nav = page.locator('.mobile-pagination');
      await page.waitForTimeout(550); // Separate synthetic mouse input from touch compatibility events.
      const box = await links.nth(3).boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + 10);
      await page.mouse.down();
      await page.waitForFunction(() =>
        document
          .querySelector('.mobile-pagination')
          .classList.contains('is-scrubbing')
      );
      assert.match(await nav.getAttribute('class'), /is-scrubbing/);
      await page.mouse.up();
      await page.locator('.mobile-menu-toggle').tap();
      assert.equal(
        await page.evaluate(() => document.documentElement.dataset.menuLocked),
        'true'
      );
      await resizeVisible(page, 580);
      await page.keyboard.press('Escape');
      await page.waitForFunction(
        () => !document.documentElement.dataset.menuLocked
      );
      assert.equal(await page.evaluate(() => document.body.style.position), '');
      await settled(page, 3);
      // Reopening must cancel pending close cleanup; selection waits for closing.
      await page.locator('.mobile-menu-toggle').tap();
      await page.waitForTimeout(550);
      await page.locator('.mobile-menu-toggle').tap();
      await page.waitForTimeout(100);
      await page.locator('.mobile-menu-toggle').tap();
      await page.waitForTimeout(600);
      assert.equal(
        await page.evaluate(() => document.documentElement.dataset.menuLocked),
        'true'
      );
      await page.locator('.mobile-drawer nav button').first().tap();
      await page.waitForFunction(
        () => !document.documentElement.dataset.menuLocked
      );
      await settled(page, 1);
      await links.nth(3).tap();
      await settled(page, 3);
      // Pinch zoom must not resize the document. Keyboard must not displace the page.
      await resizeVisible(page, 290, 2);
      assert.equal(
        await page
          .locator('.hero')
          .evaluate((el) => el.getBoundingClientRect().height),
        580
      );
      await resizeVisible(page, 580);
      await page.evaluate(() => {
        const field = document.createElement('input');
        field.id = 'qa-field';
        field.style.position = 'fixed';
        document.body.append(field);
        field.focus({ preventScroll: true });
      });
      await resizeVisible(page, 300);
      assert.equal(
        await page
          .locator('.hero')
          .evaluate((el) => el.getBoundingClientRect().height),
        580
      );
      assert.equal(
        await nav.evaluate((el) => getComputedStyle(el).visibility),
        'hidden'
      );
      await page.locator('#qa-field').evaluate((el) => el.remove());
      await resizeVisible(page, 650);
      await settled(page, 3);
      await page.setViewportSize({ width: 844, height: 390 });
      await resizeVisible(page, 390);
      await settled(page, 3);
      await page.setViewportSize({ width: 390, height: 844 });
      await resizeVisible(page, 650);
      await settled(page, 3);
      await links.nth(0).tap();
      await settled(page, 0);
      const light = page.locator('fePointLight').first();
      const initial = await light.getAttribute('x');
      await page.locator('.hero').dispatchEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        clientX: 300,
        clientY: 200,
      });
      await page.waitForTimeout(350);
      assert.notEqual(await light.getAttribute('x'), initial);
      report(
        `${name}: ${reducedMotion}: navigation, resize, drawer, long press, pinch, keyboard, touch light passed`
      );
      await page.close();
    }
    // iOS can treat attachment:fixed as scrolling. A taller CSS/layout viewport
    // must not leave a repeating background seam that advances with each page.
    const paper = await browser.newPage({
      viewport: { width: 390, height: 740 },
      isMobile: true,
      hasTouch: true,
    });
    await installViewport(paper, 700);
    await paper.goto(url);
    await paper.evaluate(() => document.fonts.ready);
    await paper.addStyleTag({
      content: 'body { background-attachment: scroll !important; }',
    });
    let background;
    for (let index = 0; index < 6; index++) {
      if (index) await paper.locator('.mobile-pagination a').nth(index).tap();
      await settled(paper, index);
      const pixels = await paper.screenshot({
        clip: { x: 2, y: 90, width: 2, height: 480 },
      });
      background ??= pixels;
      assert.ok(
        background.equals(pixels),
        `${name}: background shifted on page ${index}`
      );
    }
    await paper.close();
    report(
      `${name}: fixed paper background pixels unchanged across all six pages`
    );
    const desktop = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await desktop.goto(url);
    await desktop.evaluate(() => document.fonts.ready);
    assert.equal(
      await desktop
        .locator('.mobile-menu')
        .evaluate((el) => getComputedStyle(el).display),
      'none'
    );
    assert.equal(
      await desktop
        .locator('.hero')
        .evaluate((el) => el.getBoundingClientRect().height),
      900
    );
    report(`${name}: desktop layout passed`);
    await desktop.close();
  } finally {
    await browser.close();
  }
}

(async () => {
  await run('Chromium', chromium);
  await run('WebKit', webkit);
})().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
