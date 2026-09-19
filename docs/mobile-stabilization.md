# Mobile cross-browser stabilization

## Confirmed causes (2026-09-18)

- The deployed `https://auxilia.kr/assets/index-mfJ0TpcP.css` returned HTTP 200
  but contained **zero `@font-face` declarations**. Local CSS listed Cormorant,
  Baskerville, Georgia, Times New Roman and Helvetica/Arial without shipping fonts.
  Different OS font availability therefore changed typefaces and metrics.
- `pageMotion()` returned a completed animation immediately for reduced motion.
  CSS removed all drawer transitions and scrubber transitions under the same query.
  Mobile CSS also disabled section reveal independently of that preference.
  The logo allowed only fine pointers and explicitly rejected touch events.
- Pages used `100dvh`, transition resize logic used `innerHeight`, and only the
  indicator listened to `visualViewport.resize`. No shared visible-height correction
  existed. Actual Kakao browser chrome behavior has **not** been measured on a phone;
  the layout/visual-viewport mismatch is a reproduced failure mode, not a claimed
  diagnosis of a particular Kakao/iOS version.
- Reproduced with a 375×812 layout viewport and 550px visual viewport: the last
  page stopped **262px below** its intended top because the layout viewport clamped
  the document's maximum scroll position. A measured scroll tail fixes that range.

## Implementation

### Fonts

- Logo/byline: Tinos regular (Times-compatible silhouette).
- Latin serif body: Libre Baskerville Variable, real 400–700 weights and italic.
- Korean serif: Noto Serif KR Variable, real 200–900 weights.
- Navigation/utility text: Arimo 400/500/700, actual 400/700 italic resources,
  plus Noto Sans KR Variable for Korean.
- Fontsource packages are asset-only dependencies, pinned by `yarn.lock`. Vite
  emits version-hashed, same-origin WOFF2 URLs. No `local()` or runtime Google/CDN
  fetch is involved. Korean unicode subsets load only when needed.
- `font-synthesis: none` prevents fabricated styles; text autosizing is fixed at
  100% without disabling browser zoom. Temporary fallback while downloading is
  intentional (`font-display: swap`). Font family/metrics are shared; OS rasterizer
  antialiasing can still differ, so pixel-identical screenshots are not promised.
- Redistribution notices are shipped at `/font-licenses.txt`.

### Motion

- Existing discrete/latest-target RAF animator and normal **450ms** curve remain.
  All navigation adapters still call the same controller. Touch/swipe adapter was
  not replaced, and native snap remains disabled only in managed mobile mode.
- Reduced motion retains feedback with **180ms**, no spring easing for controls,
  and a smaller/faster light response; it no longer disables the whole experience.
- Pointer Events now let touch presses/drags over the hero move its point light.
  They never prevent scrolling or intercept the page swipe adapter. No idle RAF.
- Mobile section reveal uses opacity only. A second transformed reveal layer was
  observed painting at a stale position in Windows WebKit during programmatic
  scroll; removing only that extra translation corrected the screenshot.
- Height changes during a running transition update geometry, preserving its
  original clock/target. They no longer cancel the animation and jump to its end.

### Viewport

- `trackViewport()` starts before React. `visualViewport.height` (or `innerHeight`
  when unavailable) drives `--app-height`, `--app-vh`, and fixed control bounds.
  CSS retains `100vh`/`100dvh` fallbacks. No UA sniffing or scroll-driven React state.
- Resize, orientation, pageshow and visual-viewport events are coalesced in RAF;
  unchanged measurements are ignored. The controller realigns the remembered page
  after geometry changes. Drawer locking still restores its original page.
- Safe area is deducted from content and compact-layout decisions. Compact rules
  use measured height instead of layout-viewport media queries. The existing small
  landscape Products layout is slightly tighter to accommodate the shipped font.
- A non-visible bottom scroll tail covers `max(0, innerHeight - appHeight)` so
  the last section can align even when the layout viewport is taller.
- Pinch zoom does not resize sections. While an editable field and keyboard shrink
  the viewport, section height is held stable to avoid displacing focus; dialogs
  use the smaller visual height and the scrubber hides until keyboard close.
- One full page cannot physically contain all content in an arbitrarily tiny
  keyboard viewport; keyboard handling deliberately preserves the page beneath it.

## Automated verification

Run `yarn build`, then `yarn vite preview --host 127.0.0.1 --port 4173`.
Run `yarn test:mobile` with Playwright available; `PLAYWRIGHT_MODULE` can point to
an existing installation (no test library is included in the production bundle).
Install its WebKit and Chromium browsers first; on this Windows workstation the
Chromium test uses installed Edge. `QA_URL` can target a preview deployment.

`scripts/mobile-qa.cjs` exercises Chromium and WebKit:

- WOFF response errors, actually loaded families, no horizontal overflow;
- 320/375/390/430px portrait layouts, 667px short landscape, safe area 47+34px;
- visual height smaller than layout height, all six section heights/content bounds,
  and final-page alignment (including maximum scroll clamping);
- taps, swipe intent, wheel, latest target, resize during a transition, long press;
- drawer X/overlay/ESC, body lock restoration, keyboard and pinch-zoom cases;
- normal/reduced-motion variants, touch light response and desktop layout.

One-page input-to-last-RAF-call measurements before the final geometry-only fixes:
Chromium tap/swipe **465/466ms**, WebKit **460/454ms**; reduced motion respectively
**186/184ms** and **199/186ms**. Frame scheduling accounts for deviation from the
450/180ms controller durations. Test instrumentation is confined to the QA script.

### Still required on actual devices / deployed build

Windows Playwright WebKit is **not** iPhone Safari or Kakao WKWebView. Real-device
validation and deployment were not performed in this task. Test the built preview
on iPhone Safari, iOS Kakao, Android Chrome and Android Kakao:

1. Cold-load with cache disabled: WOFF2 requests succeed with font MIME types,
   same-origin asset URLs, loaded fonts, no network/CORS errors. Verify deployed
   HTML references the new hashed bundle, not an old cached deployment.
2. Portrait and landscape: browser bars expanded/collapsed, safe-area clearance,
   Products and Business fully visible, all six dots match the displayed section.
3. Quick/slow/continuous swipes, far scrub jumps, long press, drawer X/overlay/ESC;
   repeat with iOS Reduce Motion on and off. Check the actual animation visually.
4. Rotate while settled, during a page transition and with the drawer open; then
   close the drawer. Open/close keyboard in a form and pinch zoom without trapping it.
5. If a particular WebView reports an incorrect `visualViewport.height`, capture
   innerHeight, visualViewport height/offsetTop/scale, safe-area values and screenshot.
   A browser reporting both heights incorrectly cannot be inferred from desktop tests.

References: [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport),
[Fontsource self-hosting](https://fontsource.org/),
[Tinos source/license](https://github.com/googlefonts/tinos).

## Changed files

- Font loading: `src/fonts.css`, `src/main.tsx`, `index.html` (logo preload),
  `package.json`, `yarn.lock`, `public/font-licenses.txt`.
- Shared viewport: `src/viewport.ts`, `src/styles.css`.
- Existing interaction integration: `src/components/usePageTransition.ts`,
  `useMobileSwipe.ts`, `usePageScrubber.ts`, `pageMotion.ts`, `MobileMenu.tsx`,
  `Brandmark.tsx`. No replacement navigation engine or gesture library.
- Verification: `scripts/mobile-qa.cjs`, this document.
