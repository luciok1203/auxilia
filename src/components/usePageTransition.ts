import { useEffect, useState } from 'react';
import { VIEWPORT_CHANGE, getPageHeight } from '../viewport';
import { pageMotion } from './pageMotion';

function createPageTransition() {
  let frame = 0;
  let moving = false;
  let target = 0;
  let resizeAnimation: (() => void) | undefined;
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
    resizeAnimation = undefined;
  };
  const remember = () => {
    if (!moving) target = nearest();
  };
  const realign = () => {
    if (document.documentElement.dataset.menuLocked) return;
    // Browser chrome may resize the visible viewport DURING the 450ms motion.
    // Update geometry without cancelling the motion or restarting its clock.
    if (moving && resizeAnimation) {
      resizeAnimation();
      return;
    }
    cancel();
    const element = pages()[target];
    if (element)
      window.scrollTo({
        top: window.scrollY + element.getBoundingClientRect().top,
        behavior: 'instant',
      });
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
    let from = window.scrollY;
    let destination = from + list[index].getBoundingClientRect().top;
    let layoutHeight = getPageHeight();
    if (Math.abs(destination - from) < 0.5) return;
    moving = true;
    const start = performance.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    resizeAnimation = () => {
      const nextHeight = getPageHeight();
      from *= nextHeight / layoutHeight;
      layoutHeight = nextHeight;
      destination = window.scrollY + list[index].getBoundingClientRect().top;
      const { eased } = pageMotion(performance.now() - start, reduced.matches);
      window.scrollTo({
        top: from + (destination - from) * eased,
        behavior: 'instant',
      });
    };
    const tick = (now: number) => {
      const { eased, complete } = pageMotion(now - start, reduced.matches);
      window.scrollTo({
        top: complete ? destination : from + (destination - from) * eased,
        behavior: 'instant',
      });
      if (complete) {
        moving = false;
        resizeAnimation = undefined;
      } else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  };
  return {
    pages,
    nearest,
    cancel,
    remember,
    realign,
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
    let width = window.innerWidth;
    let height = getPageHeight();
    transition.remember();
    const remember = () => {
      // Ignore scroll events caused by layout changes until resize realigns us.
      if (
        media.matches &&
        !root.dataset.menuLocked &&
        !root.hasAttribute('data-keyboard-open') &&
        window.innerWidth === width &&
        getPageHeight() === height
      )
        transition.remember();
    };
    const resize = () => {
      if (media.matches && !root.hasAttribute('data-keyboard-open'))
        transition.realign();
      else transition.cancel();
      width = window.innerWidth;
      height = getPageHeight();
    };
    window.addEventListener('scroll', remember, { passive: true });
    window.addEventListener(VIEWPORT_CHANGE, resize);
    media.addEventListener('change', resize);
    return () => {
      transition.cancel();
      window.removeEventListener('scroll', remember);
      if (previous === undefined) delete root.dataset.pageNavigation;
      else root.dataset.pageNavigation = previous;
      window.removeEventListener(VIEWPORT_CHANGE, resize);
      media.removeEventListener('change', resize);
    };
  }, [transition]);
  return transition;
}
