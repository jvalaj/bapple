/**
 * Banana Store - bag, nav and the floating hero phone
 * Bag contents live in localStorage so they survive a reload; nothing is sent anywhere.
 */
(function() {
  'use strict';

  const BAG_KEY = 'banana-store-bag';
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  function loadBag() {
    try {
      const saved = JSON.parse(localStorage.getItem(BAG_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch (e) {
      return [];
    }
  }

  function saveBag(bag) {
    try {
      localStorage.setItem(BAG_KEY, JSON.stringify(bag));
    } catch (e) {
      // Private mode or blocked storage: the bag still works for this visit.
    }
  }

  let bag = loadBag();

  function renderBag() {
    const count = bag.length;
    const countEl = document.querySelector('[data-bag-count]');
    countEl.textContent = count;
    countEl.hidden = count === 0;
    document.querySelector('.bs-globalnav [data-bag-open]')
      .setAttribute('aria-label', `Bag, ${count} item${count === 1 ? '' : 's'}`);

    const list = document.querySelector('[data-bag-list]');
    list.replaceChildren(...bag.map((item, index) => {
      const li = document.createElement('li');
      li.className = 'bs-bag-item';
      const name = document.createElement('span');
      name.textContent = item.name;
      const price = document.createElement('span');
      price.textContent = money.format(item.price);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'bs-bag-remove';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        bag.splice(index, 1);
        saveBag(bag);
        renderBag();
      });
      li.append(name, price, remove);
      return li;
    }));

    const total = bag.reduce((sum, item) => sum + item.price, 0);
    document.querySelector('[data-bag-empty]').hidden = count > 0;
    const totalEl = document.querySelector('[data-bag-total]');
    totalEl.hidden = count === 0;
    totalEl.textContent = `Total ${money.format(total)}`;
    document.querySelector('[data-checkout]').disabled = count === 0;
  }

  function initBag() {
    document.addEventListener('click', (event) => {
      const add = event.target.closest('[data-add]');
      if (add) {
        const item = { name: add.dataset.name, price: Number(add.dataset.price) };
        bag.push(item);
        saveBag(bag);
        renderBag();
        LiquidGlass.toast.show({ message: `${item.name} added to your bag.`, type: 'success' });
        return;
      }
      if (event.target.closest('[data-bag-open]')) {
        event.preventDefault();
        LiquidGlass.modal.open('bag-modal');
      }
    });

    document.querySelector('[data-checkout]').addEventListener('click', () => {
      LiquidGlass.modal.close('bag-modal');
      LiquidGlass.toast.show({ message: 'Checkout isn’t available. Nothing here is for sale.', type: 'info', duration: 4000 });
    });

    document.querySelector('[data-search]').addEventListener('click', () => {
      LiquidGlass.toast.show({ message: 'Search isn’t available in this demo.', type: 'info' });
    });
  }

  function initNav() {
    const toggle = document.querySelector('[data-menu-toggle]');
    const links = document.getElementById('bs-globalnav-links');

    function setOpen(open) {
      links.classList.toggle('bs-globalnav-links-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('bs-menu-open', open);
    }

    toggle.addEventListener('click', () => setOpen(!links.classList.contains('bs-globalnav-links-open')));
    links.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
  }

  // The hero phone is a WebGL iframe that flies in when the preloader lifts. The still poster only
  // shows if the 3D phone wasn't ready by then; it floats in and hands over once the phone arrives.
  // The iframe only renders while it's on screen.
  function initHero() {
    const frame = document.querySelector('[data-hero-duo]');
    const poster = document.querySelector('[data-hero-poster]');
    if (!frame) return;

    const POSTER_FADE = 600; // matches bs-fade-out in style.css
    let ready = false;
    let revealed = document.documentElement.classList.contains('bs-intro-phone');
    let started = false;
    let visible = true;

    function send(message) {
      if (frame.contentWindow) frame.contentWindow.postMessage(message, window.location.origin);
    }

    function start() {
      if (started || !ready || !revealed) return;
      started = true;
      // Arrived after the still went up (very slow connection): fade the still out first,
      // so the live phone's fly-in never crosses a second phone
      const late = !poster.classList.contains('is-skipped');
      poster.classList.add('is-hidden');
      setTimeout(() => {
        frame.classList.add('is-ready');
        send('duo:start');
        if (!visible) send('duo:pause');
      }, late ? POSTER_FADE : 0);
    }

    // Waits for its turn in the intro (after the title is written), not just for the preloader
    document.addEventListener('bs:intro-phone', () => {
      revealed = true;
      // Ready in time: the poster never shows, the live phone does the entrance
      if (ready) poster.classList.add('is-skipped');
      start();
    });

    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
      if (event.data === 'duo:ready') {
        ready = true;
        start();
      }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (started) send(visible ? 'duo:play' : 'duo:pause');
      }).observe(frame);
    }

    initHeroSwipe(send);
  }

  // On touch screens the 3D frame doesn't take touches at all (it's way bigger than the phone, so it was
  // eating every scroll). The stage only claims sideways swipes, which spin the phone, and lets up/down
  // swipes scroll the page like normal.
  function initHeroSwipe(send) {
    const stage = document.querySelector('.bs-hero-stage');
    if (!stage || !window.matchMedia('(pointer: coarse)').matches) return;
    document.documentElement.classList.add('bs-touch');

    const TURN_PER_WIDTH = Math.PI; // a swipe across the whole stage turns the phone half way round
    let lastX = 0;
    let lastTime = 0;
    let speed = 0;
    let dragging = false;

    stage.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'touch') return;
      dragging = true;
      lastX = event.clientX;
      lastTime = event.timeStamp;
      speed = 0;
    });

    stage.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const delta = ((event.clientX - lastX) / stage.clientWidth) * TURN_PER_WIDTH;
      const seconds = Math.max((event.timeStamp - lastTime) / 1000, 1 / 120);
      speed = speed * 0.5 + (delta / seconds) * 0.5; // smoothed so one jittery frame doesn't decide the flick
      lastX = event.clientX;
      lastTime = event.timeStamp;
      send(`duo:spin:${delta.toFixed(4)}:0`);
    });

    function release(event) {
      if (!dragging) return;
      dragging = false;
      // A swipe that stopped before lifting the finger shouldn't fling
      const fling = event.timeStamp - lastTime < 80 ? speed : 0;
      send(`duo:spin:0:${fling.toFixed(4)}`);
    }
    stage.addEventListener('pointerup', release);
    // The browser took over for a vertical scroll
    stage.addEventListener('pointercancel', release);
  }

  // The landing intro, one thing at a time. The nav slides down as the preloader lifts (CSS), then
  // "Introducing" types itself out, then "iPhone Duo" flips in letter by letter out of a blur, and once
  // the name is written the phone flies in, then the buttons. Each step is a class on <html> plus a
  // matching event, so the CSS, the hero phone (initHero) and the liquid glass can all follow along.
  function initIntro() {
    const root = document.documentElement;
    const eyebrow = document.querySelector('.bs-hero-eyebrow');
    const title = document.querySelector('.bs-hero-title');

    const TYPE_START = 500; // ms after the preloader, so the nav has mostly landed
    const TYPE_SPEED = 55; // ms per typed letter
    const LETTER_STAGGER = 60; // matches the transition-delay on .bs-letter in style.css
    const PHONE_AFTER_TITLE = 450; // the last letter is still sharpening when the phone sets off
    const REST_AFTER_PHONE = 900;

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    function step(name) {
      root.classList.add(`bs-${name}`);
      document.dispatchEvent(new Event(`bs:${name}`));
    }
    function whenRevealed(run) {
      if (root.classList.contains('lg-loaded')) run();
      else document.addEventListener('lg:reveal', run, { once: true });
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !eyebrow || !title) {
      whenRevealed(() => {
        step('intro-phone');
        step('intro-rest');
      });
      return;
    }

    // Split text into one span per letter. Screen readers get the whole word from aria-label.
    function split(el, className) {
      const text = el.textContent.trim();
      el.setAttribute('aria-label', text);
      el.replaceChildren(...[...text].map((char, i) => {
        const span = document.createElement('span');
        span.className = className;
        span.setAttribute('aria-hidden', 'true');
        span.style.setProperty('--i', i);
        span.textContent = char === ' ' ? '\u00a0' : char; // inline-block would swallow a plain space
        return span;
      }));
      return [...el.children];
    }

    const chars = split(eyebrow, 'bs-char');
    const letters = split(title, 'bs-letter');
    const caret = document.createElement('span');
    caret.className = 'bs-caret';
    caret.setAttribute('aria-hidden', 'true');
    root.classList.add('bs-intro');

    whenRevealed(async () => {
      await wait(TYPE_START);
      eyebrow.prepend(caret);
      for (const char of chars) {
        char.classList.add('is-typed');
        char.after(caret);
        await wait(TYPE_SPEED);
      }
      await wait(250);
      caret.classList.add('is-done');
      title.classList.add('is-in');
      await wait((letters.length - 1) * LETTER_STAGGER + PHONE_AFTER_TITLE);
      step('intro-phone');
      await wait(REST_AFTER_PHONE);
      step('intro-rest');
      await wait(600);
      caret.remove();
    });
  }

  // Apple-style entrances: everything below the hero rises in as it scrolls into view, one after another.
  // Shelves of cards come in as a row, staggered left to right. Waits for the preloader so nothing
  // animates behind it.
  function initReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

    const STAGGER = 90; // ms between items that come in together
    const MAX_STEPS = 6; // so a long row doesn't keep the last card waiting forever

    const singles = document.querySelectorAll('.bs-store-title, .bs-store-help p, .bs-row-title, .bs-bento > li, .bs-quicklinks h2, .bs-footer-inner > *');
    const rows = document.querySelectorAll('.bs-shelf > ul, .bs-quicklinks ul');
    singles.forEach((el) => el.classList.add('bs-reveal'));
    rows.forEach((row) => [...row.children].forEach((item) => item.classList.add('bs-reveal')));

    const observer = new IntersectionObserver((entries) => {
      // Things that scroll in at the same moment go one by one, top to bottom
      entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
        .forEach((entry, order) => {
          const el = entry.target;
          observer.unobserve(el);
          const items = el.classList.contains('bs-reveal') ? [el] : [...el.children];
          items.forEach((item, i) => {
            item.style.setProperty('--bs-reveal-delay', `${Math.min(order + i, MAX_STEPS) * STAGGER}ms`);
            item.classList.add('is-revealed');
          });
        });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

    const start = () => {
      singles.forEach((el) => observer.observe(el));
      rows.forEach((row) => observer.observe(row));
    };
    if (document.documentElement.classList.contains('lg-loaded')) start();
    else document.addEventListener('lg:reveal', start, { once: true });
  }

  // Footer groups are accordions on phones and always-open columns on wider screens, like Apple's.
  function initFooter() {
    const wide = window.matchMedia('(min-width: 834px)');
    const groups = document.querySelectorAll('.bs-footer-columns details');
    const sync = () => groups.forEach((group) => { group.open = wide.matches; });
    sync();
    wide.addEventListener('change', sync);
  }

  // The nav glass switches to its clear, white-icon look while it sits over the dark hero.
  function initNavTone() {
    const nav = document.querySelector('.bs-globalnav');
    const hero = document.querySelector('.bs-hero');
    if (!nav || !hero) return;

    let queued = false;
    function update() {
      queued = false;
      nav.classList.toggle('is-over-hero', hero.getBoundingClientRect().bottom > nav.offsetHeight / 2);
    }

    window.addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function init() {
    initFooter();
    initNavTone();
    initNav();
    initBag();
    initIntro();
    initHero();
    initReveal();
    renderBag();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
