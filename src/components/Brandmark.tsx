function LogoText() {
  return (
    <>
      AUXILIA
      <div className="hairline" />
      <span className="sub">
        <small>by</small> LCC Group
      </span>
    </>
  );
}

export default function Brandmark() {
  const faceRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const face = faceRef.current;
    const line = face?.querySelector<HTMLElement>('.hairline');
    if (!face || !line) return;

    const update = () => {
      const bounds = face.getBoundingClientRect();
      const lineBounds = line.getBoundingClientRect();
      face.style.setProperty('--line-top', `${lineBounds.top - bounds.top}px`);
      face.style.setProperty(
        '--line-right',
        `${bounds.right - lineBounds.right}px`
      );
      face.style.setProperty(
        '--line-bottom',
        `${bounds.bottom - lineBounds.bottom}px`
      );
      face.style.setProperty(
        '--line-left',
        `${lineBounds.left - bounds.left}px`
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(face);
    observer.observe(line);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="brandmark">
      <div className="brandmark-face" ref={faceRef}>
        <LogoText />
      </div>
    </div>
  );
}
import { useLayoutEffect, useRef } from 'react';
