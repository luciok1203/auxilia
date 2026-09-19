import { memo, useEffect, useRef, useState } from 'react';
import type { PageTransition } from './usePageTransition';

const items = ['About', 'LifeWave', 'Products', 'Survey', 'Business'];

function MobileMenu({ transition }: { transition: PageTransition }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const unlock = useRef<(() => void) | undefined>(undefined);
  const pending = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (menuOpen) {
      pending.current = undefined;
      if (!unlock.current) {
        const page = transition.selected();
        transition.cancel();
        const root = document.documentElement;
        const body = document.body;
        const y = window.scrollY;
        const previous = {
          position: body.style.position,
          top: body.style.top,
          width: body.style.width,
          overflow: body.style.overflow,
          rootOverflow: root.style.overflow,
        };
        root.dataset.menuLocked = 'true';
        root.style.overflow = 'hidden';
        Object.assign(body.style, {
          position: 'fixed',
          top: `${-y}px`,
          width: '100%',
          overflow: 'hidden',
        });
        const background = Array.from(
          document.querySelectorAll<HTMLElement>(
            '.hero, main, footer, .mobile-pagination'
          )
        );
        const inert = background.map((el) => el.inert);
        background.forEach((el) => {
          el.inert = true;
        });
        unlock.current = () => {
          Object.assign(body.style, {
            position: previous.position,
            top: previous.top,
            width: previous.width,
            overflow: previous.overflow,
          });
          root.style.overflow = previous.rootOverflow;
          delete root.dataset.menuLocked;
          background.forEach((el, index) => {
            el.inert = inert[index];
          });
          const section = transition.pages()[page];
          const restoredY = section
            ? window.scrollY + section.getBoundingClientRect().top
            : y;
          window.scrollTo({ top: restoredY, behavior: 'instant' });
        };
      }
      toggle.current?.focus({ preventScroll: true });
    } else if (unlock.current) {
      const delay = window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches
        ? 180
        : 380;
      timer = setTimeout(() => {
        unlock.current?.();
        unlock.current = undefined;
        toggle.current?.focus({ preventScroll: true });
        const action = pending.current;
        pending.current = undefined;
        if (action) action();
        else transition.navigateToPage(transition.nearest());
      }, delay);
    }
    return () => clearTimeout(timer);
  }, [menuOpen, transition]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)');
    const resize = () => {
      if (!media.matches) {
        pending.current = undefined;
        setMenuOpen(false);
      }
    };
    media.addEventListener('change', resize);
    return () => {
      media.removeEventListener('change', resize);
      unlock.current?.();
      unlock.current = undefined;
    };
  }, []);

  const close = () => {
    pending.current = undefined;
    setMenuOpen(false);
  };
  const select = (action: () => void) => {
    pending.current = action;
    setMenuOpen(false);
  };

  return (
    <div
      ref={container}
      className={`mobile-menu${menuOpen ? ' is-open' : ''}`}
      role={menuOpen ? 'dialog' : undefined}
      aria-modal={menuOpen ? true : undefined}
      aria-label={menuOpen ? '모바일 메뉴' : undefined}
      onKeyDown={(event) => {
        if (!menuOpen) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
        }
        if (event.key === 'Tab') {
          const buttons = Array.from(
            container.current?.querySelectorAll<HTMLButtonElement>(
              'button:not([tabindex="-1"])'
            ) ?? []
          );
          const index = buttons.indexOf(
            document.activeElement as HTMLButtonElement
          );
          event.preventDefault();
          buttons[
            (index + (event.shiftKey ? -1 : 1) + buttons.length) %
              buttons.length
          ]?.focus();
        }
      }}
    >
      <button
        className="mobile-menu-overlay"
        type="button"
        tabIndex={-1}
        aria-label="메뉴 닫기"
        aria-hidden={!menuOpen}
        onClick={close}
      />
      <aside
        className="mobile-drawer"
        id="mobile-drawer"
        inert={!menuOpen}
        aria-hidden={!menuOpen}
      >
        <div className="mobile-drawer-heading">
          AUXILIA <span>Explore</span>
        </div>
        <nav aria-label="모바일 주요 메뉴">
          {items.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => select(() => transition.navigateToPage(index + 1))}
            >
              <span className="mobile-menu-number">0{index + 1}</span>
              {label}
            </button>
          ))}
        </nav>
        <p className="mobile-drawer-note">People · Technology · Wellness</p>
      </aside>
      <button
        ref={toggle}
        type="button"
        className="mobile-menu-toggle"
        aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
        aria-expanded={menuOpen}
        aria-controls="mobile-drawer"
        onClick={() => {
          pending.current = undefined;
          setMenuOpen((value) => !value);
        }}
      >
        <span />
        <span />
      </button>
    </div>
  );
}

export default memo(MobileMenu);
