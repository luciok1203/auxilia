import { useEffect, useState } from 'react';
import useMobileSwipe from './useMobileSwipe';
import usePageScrubber from './usePageScrubber';
import usePageTransition from './usePageTransition';

const pages = [
  ['top', 'AUXILIA'],
  ['about', 'About'],
  ['lifewave', 'LifeWave'],
  ['products', 'Products'],
  ['survey', 'Survey'],
  ['business', 'Business'],
] as const;

export default function MobileNavigation() {
  const transition = usePageTransition();
  useMobileSwipe(transition);
  const { ref, scrubbing } = usePageScrubber(transition);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)');
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (!media.matches) return;
      let nearest = 0;
      let distance = Number.POSITIVE_INFINITY;
      pages.forEach(([id], index) => {
        const element = document.getElementById(id);
        if (!element) return;
        const offset = Math.abs(element.getBoundingClientRect().top);
        if (offset < distance) {
          distance = offset;
          nearest = index;
        }
      });
      setActive(nearest);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    pages.forEach(([id]) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    media.addEventListener('change', schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      media.removeEventListener('change', schedule);
    };
  }, []);

  return (
    <nav
      ref={ref}
      className={`mobile-pagination${scrubbing ? ' is-scrubbing' : ''}`}
      aria-label="섹션 이동: 길게 누른 뒤 좌우로 드래그하여 탐색"
    >
      {pages.map(([id, label], index) => (
        <a
          href={`#${id}`}
          draggable={false}
          key={id}
          aria-label={`${index + 1}. ${label}`}
          aria-current={active === index ? 'location' : undefined}
        >
          <span />
        </a>
      ))}
    </nav>
  );
}
