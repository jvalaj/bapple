/**
 * Liquid Glass - refraction engine
 *
 * Every `.lg-glass` element gets an SVG displacement filter generated for its exact
 * size and corner radius, applied through `backdrop-filter`. The map bends the
 * backdrop toward the edges and splits R/G/B for chromatic aberration.
 *
 * Technique ported from nikdelvin/liquid-glass (MIT): https://github.com/nikdelvin/liquid-glass
 *
 * Only Chromium renders SVG filters inside `backdrop-filter`. Safari, every iOS browser
 * (Chrome on iPhone is WebKit underneath) and Firefox keep the frosted blur fallback
 * that style.css puts on `.lg-refract`, so the glass is always visible.
 */
(function () {
  'use strict';

  const supportsRefraction = (() => {
    const ua = navigator.userAgent;
    // WebKit can parse url() here but paints nothing, which is what left the glass blank on iPhone.
    const webkitOnly = /CriOS|FxiOS|EdgiOS/.test(ua) || (/AppleWebKit/.test(ua) && !/Chrome\/|Chromium\//.test(ua));
    if (webkitOnly) return false;
    const probe = document.createElement('div');
    probe.style.cssText = 'backdrop-filter: url(#lg-probe)';
    return /url\(/.test(probe.style.backdropFilter || '');
  })();

  document.documentElement.classList.add(supportsRefraction ? 'lg-refraction' : 'lg-frosted');

  function displacementMap(width, height, radius, depth) {
    const yInset = Math.ceil((radius / height) * 15);
    const xInset = Math.ceil((radius / width) * 15);
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg height="${height}" width="${width}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <style>.mix { mix-blend-mode: screen; }</style>
        <defs>
          <linearGradient id="Y" x1="0" x2="0" y1="${yInset}%" y2="${100 - yInset}%">
            <stop offset="0%" stop-color="#0F0" /><stop offset="100%" stop-color="#000" />
          </linearGradient>
          <linearGradient id="X" x1="${xInset}%" x2="${100 - xInset}%" y1="0" y2="0">
            <stop offset="0%" stop-color="#F00" /><stop offset="100%" stop-color="#000" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" height="${height}" width="${width}" fill="#808080" />
        <g filter="blur(2px)">
          <rect x="0" y="0" height="${height}" width="${width}" fill="#000080" />
          <rect x="0" y="0" height="${height}" width="${width}" fill="url(#Y)" class="mix" />
          <rect x="0" y="0" height="${height}" width="${width}" fill="url(#X)" class="mix" />
          <rect x="${depth}" y="${depth}" height="${height - 2 * depth}" width="${width - 2 * depth}"
                fill="#808080" rx="${radius}" ry="${radius}" filter="blur(${depth}px)" />
        </g>
      </svg>`
    );
  }

  // Displace the backdrop by `scale`, then keep only one colour channel of the result.
  function channel(scale, matrix, result) {
    return `<feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G" />
            <feColorMatrix type="matrix" values="${matrix}" result="${result}" />`;
  }

  const RED = '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0';
  const GREEN = '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0';
  const BLUE = '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0';

  function displacementFilter({ width, height, radius, depth, strength, aberration }) {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg height="${height}" width="${width}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="displace" color-interpolation-filters="sRGB">
            <feImage x="0" y="0" height="${height}" width="${width}" href="${displacementMap(width, height, radius, depth)}" result="map" />
            ${channel(strength + aberration * 2, RED, 'r')}
            ${channel(strength + aberration, GREEN, 'g')}
            ${channel(strength, BLUE, 'b')}
            <feBlend in="r" in2="g" mode="screen" />
            <feBlend in2="b" mode="screen" />
          </filter>
        </defs>
      </svg>`
    ) + '#displace';
  }

  function draw(glass) {
    const layer = glass.querySelector(':scope > .lg-refract');
    // offsetWidth ignores transforms, so floating and hover scaling never force a redraw.
    const width = glass.offsetWidth;
    const height = glass.offsetHeight;
    if (!layer || !width || !height) return;

    const data = glass.dataset;
    const radius = Math.min(parseFloat(getComputedStyle(glass).borderTopLeftRadius) || 0, width / 2, height / 2);
    // Small elements get a shallower edge so the bend doesn't swallow the whole surface.
    const depth = parseFloat(data.depth || Math.min(10, Math.min(width, height) / 5));
    const strength = parseFloat(data.strength || 100);
    const aberration = parseFloat(data.aberration || 2);
    const blur = parseFloat(data.blur || 0);
    const isButton = glass.classList.contains('lg-button');
    const brightness = isButton ? 1.3 : 1.1;
    const saturate = isButton ? 1.2 : 1.5;

    const url = displacementFilter({ width, height, radius, depth, strength, aberration });
    layer.style.backdropFilter =
      `blur(${blur / 2}px) url("${url}") blur(${blur}px) brightness(${brightness}) saturate(${saturate})`;
  }

  const observer = supportsRefraction
    ? new ResizeObserver((entries) => entries.forEach((entry) => draw(entry.target)))
    : null;

  function attach(glass) {
    if (glass.querySelector(':scope > .lg-refract')) return;
    const layer = document.createElement('span');
    layer.className = 'lg-refract';
    layer.setAttribute('aria-hidden', 'true');
    glass.prepend(layer);
    if (observer) observer.observe(glass);
  }

  function init(root) {
    (root || document).querySelectorAll('.lg-glass').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  window.LiquidGlassEngine = { init, refresh: (el) => draw(el), supportsRefraction };
})();
