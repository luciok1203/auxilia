import { useEffect, useState } from 'react';
import { pageMotion } from './pageMotion';

function createPageTransition() {
  let frame = 0;
  let moving = false;
  let target = 0;
  const pages = () =>
    Array.from(document.querySelectorAll<HTMLElement>('.hero, .section'));
  const nearest = () =>
    pages().reduce(
      (best, element, index, list) =>
        Math.abs(element.getBoundingClientRect().top) <
        Math.abs(list[best].getBoundingClientRect().top)
          ? index
          : best,
      0
    );
  const cancel = () => {
    cancelAnimationFrame(frame);
    moving = false;
  };
  const navigateToPage = (requested: number, force = false) => {
    if (document.documentElement.dataset.menuLocked) return;
    if (!window.matchMedia('(max-width: 860px)').matches) return;
    const list = pages();
    if (!list.length) return;
    const index = Math.max(0, Math.min(list.length - 1, Math.round(requested)));
    if (moving && index === target && !force) return;
    cancel();
    target = index;
    const from = window.scrollY;
    const destination = from + list[index].getBoundingClientRect().top;
    if (Math.abs(destination - from) < 0.5) return;
    moving = true;
    const start = performance.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const tick = (now: number) => {
      const { eased, complete } = pageMotion(now - start, reduced.matches);
      window.scrollTo({
        top: complete ? destination : from + (destination - from) * eased,
        behavior: 'instant',
      });
      if (complete) moving = false;
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  };
  return {
    pages,
    nearest,
    cancel,
    navigateToPage,
    isMoving: () => moving,
    selected: () => (moving ? target : nearest()),
  };
}

export type PageTransition = ReturnType<typeof createPageTransition>;

export default function usePageTransition() {
  const [transition] = useState(createPageTransition);
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(max-width: 860px)');
    const previous = root.dataset.pageNavigation;
    root.dataset.pageNavigation = 'managed';
    const resize = () => {
      if (media.matches) transition.navigateToPage(transition.selected(), true);
      else transition.cancel();
    };
    window.addEventListener('resize', resize);
    media.addEventListener('change', resize);
    return () => {
      transition.cancel();
      if (previous === undefined) delete root.dataset.pageNavigation;
      else root.dataset.pageNavigation = previous;
      window.removeEventListener('resize', resize);
      media.removeEventListener('change', resize);
    };
  }, [transition]);
  return transition;
}
