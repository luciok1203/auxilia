import { type CSSProperties, memo, useEffect, useRef, useState } from 'react';
import type { PageTransition } from './usePageTransition';

const items = ['About', 'LifeWave', 'Products', 'Survey', 'Business'];
const MENU_TRANSITION_MS = 360;

function MobileMenu({ transition }: { transition: PageTransition }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const unlock = useRef<(() => void) | undefined>(undefined);
  const pending = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let removeEndListener: (() => void) | undefined;
    if (menuOpen) {
      pending.current = undefined;
      if (!unlock.current) {
        const page = transition.selected();
        transition.cancel();
        const root = document.documentElement;
        const y = window.scrollY;
        const section = transition.pages()[page];
        const oldTop = section ? y + section.getBoundingClientRect().top : y;
        const oldHeight = section?.getBoundingClientRect().height || 1;
        root.dataset.menuLocked = 'true';
        // Keep the document and Safari's text paint layers in place. Lock user
        // input instead of switching body to fixed and restoring scroll on close.
        const blockScroll = (event: TouchEvent | WheelEvent) => {
          if (
            event.target instanceof Element &&
            event.target.closest('.mobile-drawer')
          )
            return;
          if (event.cancelable) event.preventDefault();
        };
        const blockKeys = (event: KeyboardEvent) => {
          if (
            event.target instanceof Element &&
            event.target.closest('.mobile-drawer')
          )
            return;
          if (
            [
              'ArrowUp',
              'ArrowDown',
              'PageUp',
              'PageDown',
              'Home',
              'End',
            ].includes(event.key)
          )
            event.preventDefault();
        };
        document.addEventListener('touchmove', blockScroll, { passive: false });
        document.addEventListener('wheel', blockScroll, { passive: false });
        document.addEventListener('keydown', blockKeys);
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
          document.removeEventListener('touchmove', blockScroll);
          document.removeEventListener('wheel', blockScroll);
          document.removeEventListener('keydown', blockKeys);
          delete root.dataset.menuLocked;
          background.forEach((el, index) => {
            el.inert = inert[index];
          });
          if (window.matchMedia('(max-width: 860px)').matches && section) {
            const rect = section.getBoundingClientRect();
            const restoredY =
              window.scrollY +
              rect.top +
              ((y - oldTop) / oldHeight) * rect.height;
            // Only a real geometry change (e.g. rotation) needs a correction.
            if (Math.abs(window.scrollY - restoredY) > 0.5)
              window.scrollTo({ top: restoredY, behavior: 'instant' });
          }
        };
      }
      toggle.current?.focus({ preventScroll: true });
    } else if (unlock.current) {
      const finish = () => {
        if (!unlock.current) return;
        unlock.current?.();
        unlock.current = undefined;
        toggle.current?.focus({ preventScroll: true });
        const action = pending.current;
        pending.current = undefined;
        if (action) action();
        else transition.navigateToPage(transition.nearest());
      };
      const drawer = container.current?.querySelector('.mobile-drawer');
      const onEnd = (event: Event) => {
        if (
          event.target === drawer &&
          (event as TransitionEvent).propertyName === 'transform'
        )
          finish();
      };
      drawer?.addEventListener('transitionend', onEnd);
      removeEndListener = () =>
        drawer?.removeEventListener('transitionend', onEnd);
      timer = setTimeout(finish, MENU_TRANSITION_MS + 60);
    }
    return () => {
      clearTimeout(timer);
      removeEndListener?.();
    };
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
      style={{ '--menu-duration': `${MENU_TRANSITION_MS}ms` } as CSSProperties}
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
