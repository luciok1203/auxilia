// Shared by touch, wheel and scrubber section transitions.
const PAGE_TRANSITION_MS = 450;

export function pageMotion(elapsed: number, reducedMotion: boolean) {
  const duration = reducedMotion ? 180 : PAGE_TRANSITION_MS;
  const progress = Math.max(0, Math.min(1, elapsed / duration));
  // Peak speed at 1/4, followed by a long, monotonic deceleration.
  const eased = Math.max(
    0,
    Math.min(1, 1 - (1 - progress) ** 4 * (1 + 4 * progress))
  );
  return { eased, complete: progress === 1 };
}
