export const VIEWPORT_CHANGE = 'auxilia:viewport-change';
let pageHeight = 0;

export const getPageHeight = () => pageHeight || window.innerHeight;

// One measurement source for page layout, controls and transition realignment.
// This lives outside React: browser chrome changes never re-render the page tree.
export function trackViewport() {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  const mobile = window.matchMedia('(max-width: 860px)');
  let frame = 0;
  let previousWidth = 0;
  let previousKeyboard = false;
  let previousVisualHeight = 0;
  let previousTop = -1;
  let previousSafeArea = -1;
  let previousLayoutHeight = 0;
  const update = () => {
    frame = 0;
    // Pinch zoom is magnification, not a request to resize all six pages.
    if (viewport && Math.abs(viewport.scale - 1) > 0.01) return;
    const height = Math.round(viewport?.height ?? window.innerHeight);
    if (height <= 0) return;
    const width = window.innerWidth;
    const layoutChanged = window.innerHeight !== previousLayoutHeight;
    const editing = document.activeElement?.matches(
      'input, textarea, select, [contenteditable="true"]'
    );
    const keyboard = Boolean(
      editing && pageHeight && height < pageHeight - 120
    );
    const top = viewport?.offsetTop ?? 0;
    const style = getComputedStyle(root);
    const safeTop =
      Number.parseFloat(style.getPropertyValue('--safe-top')) || 0;
    const safeBottom =
      Number.parseFloat(style.getPropertyValue('--safe-bottom')) || 0;
    const safeArea = safeTop + safeBottom;
    if (
      height === previousVisualHeight &&
      width === previousWidth &&
      top === previousTop &&
      keyboard === previousKeyboard &&
      !layoutChanged &&
      safeArea === previousSafeArea
    )
      return;
    previousVisualHeight = height;
    previousTop = top;
    previousSafeArea = safeArea;
    previousLayoutHeight = window.innerHeight;
    root.style.setProperty('--visual-height', `${height}px`);
    root.style.setProperty('--viewport-top', `${top}px`);
    root.toggleAttribute('data-keyboard-open', keyboard);
    // Keep document sections stable under the keyboard; dialogs use visual-height.
    // Resizing the whole document here would scroll the focused field away.
    const nextHeight = keyboard ? pageHeight : height;
    const changed =
      nextHeight !== pageHeight ||
      width !== previousWidth ||
      layoutChanged ||
      keyboard !== previousKeyboard;
    if (mobile.matches) {
      root.style.setProperty('--app-height', `${nextHeight}px`);
      root.style.setProperty('--app-vh', `${nextHeight / 100}px`);
      // A WebView can scroll against the larger layout viewport. Without this
      // non-visible tail, scrollY is clamped before the last page reaches the top.
      root.style.setProperty(
        '--scroll-tail',
        `${Math.max(0, window.innerHeight - nextHeight)}px`
      );
      // Height queries normally use the layout viewport, which may be larger in WebViews.
      const usable = nextHeight - safeTop - safeBottom;
      root.dataset.viewportSize =
        usable <= 550 || (width <= 350 && usable <= 650)
          ? 'short'
          : usable <= 650
            ? 'compact'
            : 'regular';
      root.dataset.viewportOrientation =
        width > nextHeight ? 'landscape' : 'portrait';
    } else {
      root.style.removeProperty('--app-height');
      root.style.removeProperty('--app-vh');
      root.style.removeProperty('--scroll-tail');
      delete root.dataset.viewportSize;
      delete root.dataset.viewportOrientation;
    }
    pageHeight = nextHeight;
    previousWidth = width;
    previousKeyboard = keyboard;
    if (changed) window.dispatchEvent(new Event(VIEWPORT_CHANGE));
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  update();
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  window.addEventListener('pageshow', schedule);
  viewport?.addEventListener('resize', schedule);
  viewport?.addEventListener('scroll', schedule);
  document.addEventListener('focusin', schedule);
  document.addEventListener('focusout', schedule);
  mobile.addEventListener('change', schedule);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    window.removeEventListener('pageshow', schedule);
    viewport?.removeEventListener('resize', schedule);
    viewport?.removeEventListener('scroll', schedule);
    document.removeEventListener('focusin', schedule);
    document.removeEventListener('focusout', schedule);
    mobile.removeEventListener('change', schedule);
  };
}
