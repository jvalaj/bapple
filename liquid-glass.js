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
 * that style.css puts on `.lg-refract`, so the glass is always visible. Glass marked
 * `data-mirror` also gets the bend there: see "Mirror" below.
 */
(function () {
  'use strict';

  const supportsRefraction = (() => {
    if (/[?&]lg=frosted/.test(location.search)) return false; // handy for checking the fallback in Chrome
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


  /* ---------- Mirror: the bend for WebKit and Firefox ----------
   * Those engines can't use an SVG filter in backdrop-filter, but the hero's backdrop is a known picture:
   * the wallpaper under its dimming gradient. Glass marked `data-mirror` gets a canvas that redraws that
   * picture behind itself with the same edge bend and colour split as the Chromium filter. The canvas
   * fades out toward the middle, so live content (text, the 3D phone) still shows through the frost there. */
  const MAX_DPR = 3;

  function rgba(text) {
    const n = text.match(/[\d.]+/g).map(Number);
    return `rgba(${n[0]}, ${n[1]}, ${n[2]}, ${n.length > 3 ? n[3] : 1})`;
  }

  // Colour stops of a CSS linear-gradient, as computed: "linear-gradient(rgba(..), rgba(..) 12%, ...)"
  function gradientStops(css) {
    const stops = [...css.matchAll(/(rgba?\([^)]*\))(?:\s+([\d.]+)%)?/g)].map((m) => ({ color: rgba(m[1]), at: m[2] }));
    return stops.map((stop, i) => ({ color: stop.color, at: stop.at !== undefined ? stop.at / 100 : i / Math.max(stops.length - 1, 1) }));
  }

  // Signed distance from a point inside a rounded rect to its edge (positive inside)
  function insetDistance(x, y, width, height, radius) {
    const qx = Math.abs(x - width / 2) - (width / 2 - radius);
    const qy = Math.abs(y - height / 2) - (height / 2 - radius);
    const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
    return -outside;
  }

  function startMirror() {
    const hero = document.querySelector('.bs-hero');
    const glasses = [...document.querySelectorAll('.lg-glass[data-mirror]')];
    if (!hero || !glasses.length) return;

    const mirrors = glasses.map((glass) => {
      const canvas = document.createElement('canvas');
      canvas.className = 'lg-mirror';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.hidden = true;
      (glass.querySelector(':scope > .lg-refract') || glass.firstChild).after(canvas);
      return { glass, canvas, ctx: canvas.getContext('2d'), key: '', map: null };
    });

    let backdrop = null;
    let image = null;
    let imageUrl = '';

    // The hero as painted behind its content: wallpaper on a layer raised by --bs-hero-bg-lift, cover-fit, then the dimming gradient
    function paintBackdrop() {
      const rect = hero.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, rect.width, rect.height);

      const lift = parseFloat(getComputedStyle(hero).getPropertyValue('--bs-hero-bg-lift')) || 0;
      const areaHeight = rect.height + lift;
      const scale = Math.max(rect.width / image.naturalWidth, areaHeight / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      ctx.drawImage(image, (rect.width - width) / 2, -lift + (areaHeight - height) / 2, width, height);

      const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
      gradientStops(getComputedStyle(hero, '::before').backgroundImage).forEach((stop) => gradient.addColorStop(stop.at, stop.color));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      backdrop = { ctx, dpr, left: rect.left + window.scrollX, top: rect.top + window.scrollY, width: rect.width, height: rect.height };
      mirrors.forEach((mirror) => { mirror.key = ''; });
    }

    // Per-pixel bend for one glass size: a unit offset toward the middle that grows near the edge, plus the canvas alpha
    function bendMap(mirror, width, height, dpr) {
      const data = mirror.glass.dataset;
      const radius = Math.min(parseFloat(getComputedStyle(mirror.glass).borderTopLeftRadius) || 0, width / 2, height / 2);
      const depth = parseFloat(data.depth || Math.min(10, Math.min(width, height) / 5));
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      const dx = new Float32Array(pixelWidth * pixelHeight);
      const dy = new Float32Array(pixelWidth * pixelHeight);
      const alpha = new Uint8ClampedArray(pixelWidth * pixelHeight);
      for (let y = 0; y < pixelHeight; y++) {
        for (let x = 0; x < pixelWidth; x++) {
          const px = (x + 0.5) / dpr;
          const py = (y + 0.5) / dpr;
          const edge = Math.max(0, 1 - insetDistance(px, py, width, height, radius) / depth);
          const bend = edge * edge;
          const i = y * pixelWidth + x;
          dx[i] = ((width / 2 - px) / (width / 2)) * bend;
          dy[i] = ((height / 2 - py) / (height / 2)) * bend;
          alpha[i] = Math.min(1, edge * 1.6) * 255;
        }
      }
      return {
        width: pixelWidth,
        height: pixelHeight,
        dx, dy, alpha,
        // Same strengths as the Chromium filter: a displacement scale of s moves pixels by up to s/2
        reach: [
          (parseFloat(data.strength || 100) + parseFloat(data.aberration || 2) * 2) / 2,
          (parseFloat(data.strength || 100) + parseFloat(data.aberration || 2)) / 2,
          parseFloat(data.strength || 100) / 2,
        ],
        out: mirror.ctx.createImageData(Math.max(pixelWidth, 1), Math.max(pixelHeight, 1)),
      };
    }

    function render(mirror) {
      const { glass, canvas, ctx } = mirror;
      const width = glass.offsetWidth;
      const height = glass.offsetHeight;
      const rect = glass.getBoundingClientRect();
      // offsetWidth ignores transforms, so centre the untransformed box on the painted one
      const left = rect.left + rect.width / 2 - width / 2 + window.scrollX - backdrop.left;
      const top = rect.top + rect.height / 2 - height / 2 + window.scrollY - backdrop.top;
      const over = width > 0 && top < backdrop.height && top + height > 0;
      canvas.hidden = !over;
      glass.classList.toggle('lg-mirror-on', over);
      if (!over) return;

      const { dpr } = backdrop;
      const key = [width, height, Math.round(left * dpr), Math.round(top * dpr)].join();
      if (key === mirror.key) return;
      mirror.key = key;
      if (!mirror.map || mirror.map.width !== Math.round(width * dpr) || mirror.map.height !== Math.round(height * dpr)) {
        mirror.map = bendMap(mirror, width, height, dpr);
        canvas.width = mirror.map.width;
        canvas.height = mirror.map.height;
      }

      const map = mirror.map;
      const pad = Math.ceil(map.reach[0] * dpr) + 1;
      const sourceWidth = map.width + pad * 2;
      const sourceHeight = map.height + pad * 2;
      const sourceLeft = Math.round(left * dpr) - pad;
      const sourceTop = Math.round(top * dpr) - pad;
      const source = backdrop.ctx.getImageData(sourceLeft, sourceTop, sourceWidth, sourceHeight).data;
      // Past the hero's edges getImageData gives transparent black, which would rim the glass in black.
      // Clamp samples to the part that's really there, so the edge pixels stretch out instead.
      const pageWidth = backdrop.ctx.canvas.width;
      const pageHeight = backdrop.ctx.canvas.height;
      const minX = Math.max(0, -sourceLeft);
      const maxX = Math.min(sourceWidth, pageWidth - sourceLeft) - 1;
      const minY = Math.max(0, -sourceTop);
      const maxY = Math.min(sourceHeight, pageHeight - sourceTop) - 1;
      const out = map.out.data;
      const reach = map.reach.map((r) => r * dpr);

      for (let y = 0, i = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++, i++) {
          const o = i * 4;
          const a = map.alpha[i];
          if (a === 0) { out[o + 3] = 0; continue; }
          for (let c = 0; c < 3; c++) {
            const sx = Math.min(maxX, Math.max(minX, Math.round(x + pad + map.dx[i] * reach[c])));
            const sy = Math.min(maxY, Math.max(minY, Math.round(y + pad + map.dy[i] * reach[c])));
            out[o + c] = source[(sy * sourceWidth + sx) * 4 + c];
          }
          out[o + 3] = a;
        }
      }
      ctx.putImageData(map.out, 0, 0);
    }

    let queued = false;
    function renderAll() {
      queued = false;
      if (backdrop) mirrors.forEach(render);
    }
    function queue() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(renderAll);
    }

    function refresh() {
      const match = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(hero, '::after').backgroundImage);
      if (!match) return;
      if (match[1] === imageUrl && image) {
        paintBackdrop();
        queue();
        return;
      }
      imageUrl = match[1];
      const next = new Image();
      next.onload = () => {
        if (next.src !== new URL(imageUrl, location.href).href) return;
        image = next;
        paintBackdrop();
        queue();
      };
      next.src = imageUrl;
    }

    let resizeTimer = 0;
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(refresh, 150);
    });
    // The nav slides down when the preloader lifts and the hero buttons rise in later in the intro
    // (store.js); follow each move until it settles
    document.addEventListener('transitionend', queue);
    function followFor(ms) {
      const until = performance.now() + ms;
      (function follow() {
        renderAll();
        if (performance.now() < until) requestAnimationFrame(follow);
      })();
    }
    document.addEventListener('lg:reveal', () => followFor(1500));
    document.addEventListener('bs:intro-rest', () => followFor(1500));
    refresh();
  }

  function boot() {
    init();
    if (!supportsRefraction) startMirror();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.LiquidGlassEngine = { init, refresh: (el) => draw(el), supportsRefraction };
})();
