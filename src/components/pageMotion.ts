// Shared by touch, wheel and scrubber section transitions.
const PAGE_TRANSITION_MS = 450;

export function pageMotion(elapsed: number) {
  // Accessibility preferences reduce decorative motion, not navigation duration.
  // Shortening this to 180ms made the same swipe feel 2.5x faster on some phones.
  const progress = Math.max(0, Math.min(1, elapsed / PAGE_TRANSITION_MS));
  // Match CSS cubic-bezier(.7, 0, .3, 1): quiet endpoints, fast midpoint.
  // Invert the curve's x coordinate; using progress directly would not match CSS.
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 20; iteration++) {
    const t = (low + high) / 2;
    const x = 2.1 * t * (1 - t) ** 2 + 0.9 * t ** 2 * (1 - t) + t ** 3;
    if (x < progress) low = t;
    else high = t;
  }
  const t = (low + high) / 2;
  const eased =
    progress === 0 || progress === 1 ? progress : t * t * (3 - 2 * t);
  return { eased, complete: progress === 1 };
}
