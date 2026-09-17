import { useEffect, useRef, useState } from 'react';
import type { PageTransition } from './usePageTransition';

export default function usePageScrubber(transition: PageTransition) {
  const ref = useRef<HTMLElement>(null);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const media = window.matchMedia('(max-width: 860px)');
    const pages = transition.pages;
    const clamp = (n: number) => Math.max(0, Math.min(pages().length - 1, n));
    let timer: ReturnType<typeof setTimeout> | undefined;
    let suppressClickUntil = 0;
    let press:
      | {
          id: number;
          x: number;
          y: number;
          left: number;
          width: number;
          active: boolean;
        }
      | undefined;
    const selectPage = transition.navigateToPage;
    const selectAt = (pointerX: number) => {
      if (!press) return;
      const normalized = (pointerX - press.left) / press.width;
      const bounded = Math.max(0, Math.min(1, normalized));
      nav.style.setProperty(
        '--scrub-edge',
        `${Math.tanh(normalized - bounded) * 8}px`
      );
      const index = Math.round(bounded * (pages().length - 1));
      if (index !== transition.selected()) selectPage(index);
    };
    const down = (event: PointerEvent) => {
      if (!media.matches || !event.isPrimary || event.button !== 0) return;
      clearTimeout(timer);
      // Freeze the usable track coordinates for the gesture, excluding padding.
      const links = nav.querySelectorAll<HTMLAnchorElement>('a');
      const first = links[0].getBoundingClientRect();
      const last = links[links.length - 1].getBoundingClientRect();
      const left = first.left + first.width / 2;
      press = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left,
        width: Math.max(1, last.left + last.width / 2 - left),
        active: false,
      };
      nav.setPointerCapture(event.pointerId);
      timer = setTimeout(() => {
        if (!press) return;
        press.active = true;
        setScrubbing(true);
        selectAt(press.x);
      }, 210);
    };
    const move = (event: PointerEvent) => {
      if (!press || press.id !== event.pointerId) return;
      if (!press.active) {
        if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 12) {
          clearTimeout(timer);
          suppressClickUntil = performance.now() + 500;
          press = undefined;
        }
        return;
      }
      event.preventDefault();
      selectAt(event.clientX);
    };
    const release = (event: PointerEvent) => {
      if (!press || press.id !== event.pointerId) return;
      clearTimeout(timer);
      const current = press;
      press = undefined;
      if (nav.hasPointerCapture(event.pointerId))
        nav.releasePointerCapture(event.pointerId);
      setScrubbing(false);
      nav.style.removeProperty('--scrub-edge');
      if (current.active) {
        suppressClickUntil = performance.now() + 500;
        // Release keeps the selected integer target; it adds no projection.
      } else {
        suppressClickUntil = performance.now() + 500;
        const link = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest<HTMLAnchorElement>('a');
        const index =
          link && nav.contains(link)
            ? pages().findIndex((el) => `#${el.id}` === link.hash)
            : -1;
        if (index >= 0) selectPage(index);
      }
    };
    const click = (event: MouseEvent) => {
      if (!media.matches) return;
      event.preventDefault();
      event.stopPropagation();
      if (performance.now() < suppressClickUntil) return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a')
          : null;
      if (!link) return;
      const index = pages().findIndex((el) => `#${el.id}` === link.hash);
      if (index >= 0) selectPage(index);
    };
    const key = (event: KeyboardEvent) => {
      if (!media.matches) return;
      const current = transition.selected();
      const next = {
        ArrowLeft: current - 1,
        ArrowUp: current - 1,
        ArrowRight: current + 1,
        ArrowDown: current + 1,
        Home: 0,
        End: pages().length - 1,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      const index = clamp(next);
      nav
        .querySelectorAll<HTMLAnchorElement>('a')
        [index]?.focus({ preventScroll: true });
      selectPage(index);
    };
    const cancel = () => {
      clearTimeout(timer);
      if (press) suppressClickUntil = performance.now() + 500;
      press = undefined;
      setScrubbing(false);
      nav.style.removeProperty('--scrub-edge');
    };
    const blockTouch = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    };
    const lostCapture = () => {
      if (press) cancel();
    };
    nav.addEventListener('pointerdown', down);
    nav.addEventListener('pointermove', move);
    nav.addEventListener('pointerup', release);
    nav.addEventListener('pointercancel', cancel);
    nav.addEventListener('lostpointercapture', lostCapture);
    nav.addEventListener('click', click);
    nav.addEventListener('keydown', key);
    nav.addEventListener('touchmove', blockTouch, { passive: false });
    window.addEventListener('resize', cancel);
    window.addEventListener('blur', cancel);
    return () => {
      cancel();
      nav.removeEventListener('pointerdown', down);
      nav.removeEventListener('pointermove', move);
      nav.removeEventListener('pointerup', release);
      nav.removeEventListener('pointercancel', cancel);
      nav.removeEventListener('lostpointercapture', lostCapture);
      nav.removeEventListener('click', click);
      nav.removeEventListener('keydown', key);
      nav.removeEventListener('touchmove', blockTouch);
      window.removeEventListener('resize', cancel);
      window.removeEventListener('blur', cancel);
    };
  }, [transition]);
  return { ref, scrubbing };
}
