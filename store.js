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

    let ready = false;
    let revealed = document.documentElement.classList.contains('lg-loaded');
    let started = false;
    let visible = true;

    function send(message) {
      if (frame.contentWindow) frame.contentWindow.postMessage(message, window.location.origin);
    }

    function start() {
      if (started || !ready || !revealed) return;
      started = true;
      frame.classList.add('is-ready');
      poster.classList.add('is-hidden');
      send('duo:start');
      if (!visible) send('duo:pause');
    }

    document.addEventListener('lg:reveal', () => {
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
    initHero();
    renderBag();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
