# 🍌 Banana Store

A meme of the Apple online Store, launching the **iPhone Duo**. The landing screen floats a real 3D foldable over an RGB backdrop, with liquid glass buttons under it. Plain HTML, CSS and JS, no build step.

Not affiliated with Apple. Nothing is for sale. It's a banana.

## Run it

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000 (or your computer's local IP on your phone).

## What's where

- `index.html`, `style.css`: the store page. Mobile-first and portrait-first, using Apple's system font (SF Pro on Apple devices, Inter elsewhere).
- `store.js`: the bag (saved in localStorage), phone menu, footer accordions, and pausing the 3D hero when it's off screen.
- `main.js`: modal, toasts and the preloader.
- `liquid-glass.js`: real SVG refraction on `.lg-glass` elements in Chromium, with a frosted fallback on Safari, every iPhone browser and Firefox.
- `duo/`: production build of the 3D foldable. `duo/hero.html` is the floating, transparent version used on the landing screen; `duo/index.html` is the full interactive viewer ("Explore in 3D").
- `assets/`: the RGB backdrop and stills of the phone used as card images and as the hero poster.

## Credits

- Liquid glass refraction technique and RGB background: [nikdelvin/liquid-glass](https://github.com/nikdelvin/liquid-glass) (MIT)
- 3D foldable: [akashtdev/iphone-duo-animation](https://github.com/akashtdev/iphone-duo-animation) (MIT, license in `duo/LICENSE`). The floating hero entry (`hero.html` / `src/hero.ts`) was added on top of it.

Made by Jvalaj.
