import { useEffect } from 'react';

// Use one settling animation for mobile touch, wheel and pagination input.
export default function useMobileSwipe() {
  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)');
    const root = document.documentElement;
    let frame = 0;
    let animating = false;
    let wheelTimer: ReturnType<typeof setTimeout> | undefined;
    let wheelDelta = 0;
    let wheelIndex = 0;
    let wheelStart = 0;
    let wheelCommitted = false;
    let viewportWidth = window.innerWidth;
    let restore: (() => void) | undefined;
    let gesture:
      | {
          x: number;
          y: number;
          index: number;
          start: number;
          delta: number;
          dragging: boolean;
        }
      | undefined;
    const targets = () =>
      Array.from(document.querySelectorAll<HTMLElement>('.hero, .section'));
    const nearest = () =>
      targets().reduce(
        (best, el, index, list) =>
          Math.abs(el.getBoundingClientRect().top) <
          Math.abs(list[best].getBoundingClientRect().top)
            ? index
            : best,
        0
      );
    const stop = () => {
      cancelAnimationFrame(frame);
      animating = false;
      restore?.();
      restore = undefined;
    };
    const unlock = () => {
      if (restore) return;
      const snap = root.style.scrollSnapType;
      const behavior = root.style.scrollBehavior;
      root.style.scrollSnapType = 'none';
      root.style.scrollBehavior = 'auto';
      restore = () => {
        root.style.scrollSnapType = snap;
        root.style.scrollBehavior = behavior;
      };
    };
    const settle = (index: number) => {
      const element = targets()[index];
      if (!element) {
        stop();
        return;
      }
      unlock();
      cancelAnimationFrame(frame);
      animating = true;
      const from = window.scrollY;
      const start = performance.now();
      const duration = window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches
        ? 0
        : 600;
      const tick = (now: number) => {
        // Follow 100dvh changes without cancelling the deceleration.
        const to = window.scrollY + element.getBoundingClientRect().top;
        const progress = duration ? Math.min(1, (now - start) / duration) : 1;
        // Accelerate for 30% of the duration, then use 70% for a longer finish.
        // Both segments meet with the same position and velocity.
        const split = 0.3;
        const eased =
          progress < split
            ? progress ** 3 / split ** 2
            : 1 - (1 - progress) ** 3 / (1 - split) ** 2;
        window.scrollTo({
          top: from + (to - from) * eased,
          behavior: 'instant',
        });
        if (progress < 1) frame = requestAnimationFrame(tick);
        else stop();
      };
      frame = requestAnimationFrame(tick);
    };
    const start = (event: TouchEvent) => {
      if (!media.matches || event.touches.length !== 1) return;
      if (
        event.target instanceof Element &&
        event.target.closest('input, textarea, select, [role="dialog"]')
      )
        return;
      stop();
      const touch = event.touches[0];
      gesture = {
        x: touch.clientX,
        y: touch.clientY,
        index: nearest(),
        start: window.scrollY,
        delta: 0,
        dragging: false,
      };
    };
    const move = (event: TouchEvent) => {
      if (!gesture) return;
      if (event.touches.length !== 1 || !event.cancelable) {
        gesture = undefined;
        stop();
        return;
      }
      const touch = event.touches[0];
      const delta = gesture.y - touch.clientY;
      if (!gesture.dragging) {
        if (Math.abs(delta) < 2) return;
        if (Math.abs(touch.clientX - gesture.x) > Math.abs(delta)) {
          gesture = undefined;
          return;
        }
        gesture.dragging = true;
        unlock();
      }
      event.preventDefault();
      gesture.delta = delta;
      window.scrollTo(0, gesture.start + delta * 0.32);
    };
    const end = () => {
      if (!gesture) return;
      const current = gesture;
      gesture = undefined;
      if (!current.dragging) return;
      const threshold = Math.min(80, Math.max(48, window.innerHeight * 0.12));
      const direction =
        Math.abs(current.delta) >= threshold ? Math.sign(current.delta) : 0;
      settle(
        Math.max(0, Math.min(targets().length - 1, current.index + direction))
      );
    };
    const cancel = () => {
      gesture = undefined;
      clearTimeout(wheelTimer);
      wheelTimer = undefined;
      wheelDelta = 0;
      wheelCommitted = false;
      stop();
    };
    const resize = () => {
      // Safari's expanding/collapsing address bar changes height mid-scroll.
      if (window.innerWidth !== viewportWidth) cancel();
      viewportWidth = window.innerWidth;
    };
    const wheel = (event: WheelEvent) => {
      if (
        !media.matches ||
        event.ctrlKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      )
        return;
      if (
        event.target instanceof Element &&
        event.target.closest('input, textarea, select, [role="dialog"]')
      )
        return;
      if (!event.cancelable) return;
      event.preventDefault();
      if (!wheelTimer) {
        wheelIndex = nearest();
        wheelStart = window.scrollY;
        wheelDelta = 0;
        wheelCommitted = animating;
      }
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        wheelTimer = undefined;
        if (!wheelCommitted) settle(wheelIndex);
        wheelCommitted = false;
        wheelDelta = 0;
      }, 180);
      // Ignore the inertia tail so one gesture cannot skip several pages.
      if (wheelCommitted || animating) return;
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? window.innerHeight
            : 1;
      wheelDelta += event.deltaY * unit;
      unlock();
      window.scrollTo({
        top: wheelStart + wheelDelta * 0.32,
        behavior: 'instant',
      });
      if (Math.abs(wheelDelta) >= 60) {
        wheelCommitted = true;
        settle(
          Math.max(
            0,
            Math.min(targets().length - 1, wheelIndex + Math.sign(wheelDelta))
          )
        );
      }
    };
    const click = (event: MouseEvent) => {
      if (
        !media.matches ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('.mobile-pagination a')
          : null;
      if (!link) return;
      const index = targets().findIndex(
        (element) => `#${element.id}` === link.hash
      );
      if (index < 0) return;
      event.preventDefault();
      cancel();
      settle(index);
    };
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', cancel);
    window.addEventListener('resize', resize);
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('click', click);
    media.addEventListener('change', cancel);
    return () => {
      cancel();
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', cancel);
      window.removeEventListener('resize', resize);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('click', click);
      media.removeEventListener('change', cancel);
    };
  }, []);
}
