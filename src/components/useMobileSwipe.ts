import { useEffect } from 'react';
import type { PageTransition } from './usePageTransition';

// Input adapters only: viewport movement belongs to navigateToPage.
export default function useMobileSwipe(transition: PageTransition) {
  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)');
    const excluded = (target: EventTarget | null) =>
      target instanceof Element &&
      Boolean(
        target.closest(
          'input, textarea, select, [contenteditable="true"], [role="dialog"], .mobile-pagination'
        )
      );
    let gesture:
      | { x: number; y: number; index: number; committed: boolean }
      | undefined;
    let wheelTimer: ReturnType<typeof setTimeout> | undefined;
    let wheelDelta = 0;
    let wheelIndex = 0;
    let wheelCommitted = false;
    const start = (event: TouchEvent) => {
      if (
        document.documentElement.dataset.menuLocked ||
        (event.target instanceof Element &&
          event.target.closest('.mobile-menu'))
      )
        return;
      if (
        !media.matches ||
        event.touches.length !== 1 ||
        excluded(event.target)
      )
        return;
      const touch = event.touches[0];
      gesture = {
        x: touch.clientX,
        y: touch.clientY,
        index: transition.selected(),
        committed: false,
      };
    };
    const move = (event: TouchEvent) => {
      if (!gesture) return;
      if (event.touches.length !== 1 || !event.cancelable) {
        gesture = undefined;
        return;
      }
      const touch = event.touches[0];
      const delta = gesture.y - touch.clientY;
      if (
        !gesture.committed &&
        Math.abs(touch.clientX - gesture.x) > Math.abs(delta)
      ) {
        gesture = undefined;
        return;
      }
      // Stop native momentum before it can move the page or start another easing.
      event.preventDefault();
      const threshold = Math.min(80, Math.max(48, window.innerHeight * 0.12));
      if (!gesture.committed && Math.abs(delta) >= threshold) {
        gesture.committed = true;
        transition.navigateToPage(gesture.index + Math.sign(delta));
      }
    };
    const end = () => {
      gesture = undefined;
    };
    const wheel = (event: WheelEvent) => {
      if (document.documentElement.dataset.menuLocked) return;
      if (
        media.matches &&
        event.target instanceof Element &&
        event.target.closest('.mobile-pagination') &&
        !event.ctrlKey
      ) {
        if (event.cancelable) event.preventDefault();
        return;
      }
      if (
        !media.matches ||
        event.ctrlKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        excluded(event.target) ||
        !event.cancelable
      )
        return;
      event.preventDefault();
      if (!wheelTimer) {
        wheelIndex = transition.selected();
        wheelDelta = 0;
        wheelCommitted = transition.isMoving();
      }
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        wheelTimer = undefined;
        wheelCommitted = false;
        wheelDelta = 0;
      }, 180);
      if (wheelCommitted) return;
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? window.innerHeight
            : 1;
      wheelDelta += event.deltaY * unit;
      if (Math.abs(wheelDelta) >= 60) {
        wheelCommitted = true;
        transition.navigateToPage(wheelIndex + Math.sign(wheelDelta));
      }
    };
    const click = (event: MouseEvent) => {
      if (
        !media.matches ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('.topbar a[href^="#"]')
          : null;
      if (!link) return;
      const index = transition
        .pages()
        .findIndex((el) => `#${el.id}` === link.hash);
      if (index < 0) return;
      event.preventDefault();
      transition.navigateToPage(index);
    };
    const key = (event: KeyboardEvent) => {
      if (
        !media.matches ||
        event.defaultPrevented ||
        excluded(event.target) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      if (event.target instanceof Element && event.target.closest('a, button'))
        return;
      const current = transition.selected();
      const next = {
        ArrowDown: current + 1,
        PageDown: current + 1,
        ArrowUp: current - 1,
        PageUp: current - 1,
        Home: 0,
        End: transition.pages().length - 1,
        ' ': current + (event.shiftKey ? -1 : 1),
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      transition.navigateToPage(next);
    };
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('click', click);
    window.addEventListener('keydown', key);
    return () => {
      clearTimeout(wheelTimer);
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('click', click);
      window.removeEventListener('keydown', key);
    };
  }, [transition]);
}
