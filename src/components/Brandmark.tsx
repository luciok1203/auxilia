import { useEffect, useId, useRef } from 'react';

const REST_LIGHT = { x: 300, y: -65 };
const LIGHT_HEIGHT = 280;

function SilverWordmark() {
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const lights = svg.querySelectorAll('fePointLight');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let bounds = svg.getBoundingClientRect();
    let frame = 0;
    let previousTime = 0;
    let visible = true;
    const light = { ...REST_LIGHT };
    const target = { ...REST_LIGHT };
    const paint = () => {
      // Diffuse and specular are two responses to the SAME physical light.
      for (const point of lights) {
        point.setAttribute('x', light.x.toFixed(2));
        point.setAttribute('y', light.y.toFixed(2));
      }
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
    };
    const reset = () => {
      stop();
      Object.assign(light, REST_LIGHT);
      Object.assign(target, REST_LIGHT);
      paint();
    };
    const measure = () => {
      bounds = svg.getBoundingClientRect();
    };
    const draw = (time: number) => {
      const dt = previousTime ? Math.min(time - previousTime, 64) : 16;
      previousTime = time;
      const blend = 1 - Math.exp(-dt / (motion.matches ? 50 : 90));
      light.x += (target.x - light.x) * blend;
      light.y += (target.y - light.y) * blend;
      if (Math.abs(target.x - light.x) + Math.abs(target.y - light.y) < 0.05) {
        Object.assign(light, target);
        paint();
        stop();
        return;
      }
      paint();
      frame = requestAnimationFrame(draw);
    };
    const move = (event: PointerEvent) => {
      if (!visible || !event.isPrimary) return;
      if (
        event.pointerType === 'touch' &&
        !(event.target instanceof Element && event.target.closest('.hero'))
      )
        return;
      // Cached logo-local geometry; no layout reads or React updates on pointermove.
      // Allow the source beyond the face so opposing bevels can catch the light.
      target.x = Math.max(
        -160,
        Math.min(960, ((event.clientX - bounds.left) / bounds.width) * 800)
      );
      target.y = Math.max(
        -240,
        Math.min(400, ((event.clientY - bounds.top) / bounds.height) * 160)
      );
      if (motion.matches) {
        target.x = REST_LIGHT.x + (target.x - REST_LIGHT.x) * 0.25;
        target.y = REST_LIGHT.y + (target.y - REST_LIGHT.y) * 0.25;
      }
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(svg);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) stop();
    });
    visibility.observe(svg);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('blur', reset);
    motion.addEventListener('change', reset);
    return () => {
      stop();
      resize.disconnect();
      visibility.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      window.removeEventListener('blur', reset);
      motion.removeEventListener('change', reset);
    };
  }, []);

  return (
    <span className="silver-wordmark">
      <span className="silver-size" aria-hidden="true">
        AUXILIA
      </span>
      <svg
        ref={svgRef}
        viewBox="0 0 800 160"
        preserveAspectRatio="none"
        role="img"
        aria-label="AUXILIA"
      >
        <title>AUXILIA</title>
        <defs>
          <filter
            id={id}
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            x="-4"
            y="-4"
            width="808"
            height="168"
            colorInterpolationFilters="sRGB"
          >
            {/* A narrow edge ramp with a flat plateau: no broad, inflated crown. */}
            <feGaussianBlur
              in="SourceAlpha"
              stdDeviation=".45"
              result="height"
            />
            <feMorphology
              in="SourceAlpha"
              operator="erode"
              radius=".85"
              result="faceInterior"
            />
            <feComposite
              in="SourceAlpha"
              in2="faceInterior"
              operator="out"
              result="bevel"
            />
            <feComponentTransfer in="bevel" result="reflectionArea">
              {/* Keep only a small residual sheen on the flat central face. */}
              <feFuncA type="linear" slope=".92" intercept=".08" />
            </feComponentTransfer>
            {/* Fixed, slightly directional grain: material variation, not animated noise.
                Reuse it for subtle face tint and less uniform specular response. */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency=".48 .82"
              numOctaves="2"
              seed="17"
              result="grain"
            />
            <feColorMatrix
              in="grain"
              type="saturate"
              values="0"
              result="neutralGrain"
            />
            <feComponentTransfer in="neutralGrain" result="satin">
              <feFuncR type="linear" slope=".03" intercept=".97" />
              <feFuncG type="linear" slope=".03" intercept=".97" />
              <feFuncB type="linear" slope=".03" intercept=".97" />
              <feFuncA type="table" tableValues="1 1" />
            </feComponentTransfer>
            <feBlend
              in="SourceGraphic"
              in2="satin"
              mode="multiply"
              result="silver"
            />
            <feDiffuseLighting
              in="height"
              surfaceScale=".85"
              diffuseConstant="1"
              lightingColor="#d4dde4"
              result="diffuse"
            >
              <fePointLight
                x={REST_LIGHT.x}
                y={REST_LIGHT.y}
                z={LIGHT_HEIGHT}
              />
            </feDiffuseLighting>
            {/* Ambient silver remains visible on faces turned away from the light. */}
            <feComposite
              in="silver"
              in2="diffuse"
              operator="arithmetic"
              k1=".28"
              k2=".74"
              result="body"
            />
            <feSpecularLighting
              in="height"
              surfaceScale=".85"
              specularConstant="1.05"
              specularExponent="48"
              lightingColor="#f3f3e9"
              result="specular"
            >
              <fePointLight
                x={REST_LIGHT.x}
                y={REST_LIGHT.y}
                z={LIGHT_HEIGHT}
              />
            </feSpecularLighting>
            <feComponentTransfer in="neutralGrain" result="roughness">
              <feFuncR type="linear" slope=".4" intercept=".6" />
              <feFuncG type="linear" slope=".4" intercept=".6" />
              <feFuncB type="linear" slope=".4" intercept=".6" />
              <feFuncA type="table" tableValues="1 1" />
            </feComponentTransfer>
            <feComposite
              in="specular"
              in2="roughness"
              operator="arithmetic"
              k1="1"
              result="scatteredSpecular"
            />
            <feComposite
              in="scatteredSpecular"
              in2="reflectionArea"
              operator="in"
              result="edgeSpecular"
            />
            <feBlend in="body" in2="edgeSpecular" mode="screen" result="lit" />
            {/* Restore sharp vector silhouette after the height-map blurs. */}
            <feComposite in="lit" in2="SourceAlpha" operator="in" />
            <feDropShadow
              dx="0"
              dy=".35"
              stdDeviation=".3"
              floodColor="#53616a"
              floodOpacity=".1"
            />
          </filter>
        </defs>
        <text
          x="400"
          y="135"
          textAnchor="middle"
          fontSize="168"
          textLength="790"
          lengthAdjust="spacingAndGlyphs"
          fill="#b4bdc3"
          filter={`url(#${id})`}
        >
          AUXILIA
        </text>
      </svg>
    </span>
  );
}

export default function Brandmark() {
  return (
    <div className="brandmark">
      <div className="brandmark-face">
        <SilverWordmark />
        <div className="hairline" />
        <span className="sub">
          <small>by</small> LCC Group
        </span>
      </div>
    </div>
  );
}
