// Floating iPhone Duo for the store's landing screen.
// The entrance is Fastlane's intro, timing for timing: the phone flies in from the left while it spins round
// to face you, unfolds as it lands, then settles into a gentle bob. It waits for the parent page's preloader
// to lift ("duo:start") so the whole flight is on screen. It flies in at showcase size, and once open it turns
// slowly round its vertical centre line, showing the back and coming round again. You can drag it to look around.
import "./modulepreload-polyfill-B5Qt9EMX.js";
import { M as MathUtils, V as Vector3 } from "./three-Jlrdm0C4.js";
import { l as loadModel, a as loadTextures, c as createStage, b as createDuo } from "./stage-BOfTG7bR.js";

const MAX_STEP = 1 / 20;
const MAX_PIXEL_RATIO = 2;
const PORTRAIT_RATIO = 0.75;

// Fastlane's intro constants
const FLY_IN = 1.1; // seconds to fly in and spin round
const OPEN = 1.4; // seconds to unfold
const OPEN_AT = FLY_IN * 0.6; // the unfold starts before the phone lands
const START_SPIN = Math.PI * 0.98;
const START_TILT = 0.3;
// Fastlane pulls the camera from 40 to 44 and levels it from a 1.53 pitch, and trims a 0.04 yaw.
// Applied as ratios and offsets so the phone ends at this page's own framing.
const START_DISTANCE = 40 / 44;
const START_PITCH = 1.53 - Math.PI / 2;
const START_YAW = 0.04;

// Final framing; 1.5x further back because the iframe is 1.5x the stage (see .bs-hero-duo)
const LANDSCAPE = { distance: 49.5, pitch: 1.5, yaw: 0 };
const PORTRAIT = { distance: 64.5, pitch: 1.5, yaw: 0 };
const VIEWPOINT_FALLOFF = 1.5;

// Showcase: the phone fills the stage fit from the start, then turns slowly round the vertical axis
const SHOWCASE_SCALE = 1;
const TURN_SPEED = (Math.PI * 2) / 20; // one full turn every 20 seconds

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutCubic = (t) => 1 - (1 - t) ** 3;

async function main() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const host = document.getElementById("stage");
  const obstacle = document.getElementById("obstacle");
  const [model, textures] = await Promise.all([loadModel(), loadTextures()]);
  const stage = createStage(host, obstacle);
  stage.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  stage.renderer.setSize(host.clientWidth, host.clientHeight);
  stage.setOrbitEnabled(false);

  const duo = createDuo(model, textures, stage.renderer.capabilities.getMaxAnisotropy(), stage.scene.environment);
  stage.content.add(duo.root);
  duo.root.scale.setScalar(SHOWCASE_SCALE);
  duo.setFocus(null);

  let portrait = null;
  let opened = false;
  function frame() {
    const next = host.clientHeight > host.clientWidth * PORTRAIT_RATIO;
    if (next === portrait) return;
    portrait = next;
    duo.setRoll(portrait ? "clockwise" : null, "inner");
    if (opened) stage.applyView(portrait ? PORTRAIT : LANDSCAPE);
  }
  frame();
  new ResizeObserver(frame).observe(host);

  // Where the phone starts: just past the left edge of the frame, as Fastlane does
  function offscreenX(distance) {
    const camera = stage.camera;
    return distance * Math.tan(MathUtils.degToRad(camera.fov) / 2) * camera.aspect + 7;
  }

  const eye = new Vector3();
  let t = 0;
  let turn = 0;
  let last = performance.now();

  function pose(time) {
    const view = portrait ? PORTRAIT : LANDSCAPE;
    const fly = reduced ? 1 : MathUtils.clamp(time / FLY_IN, 0, 1);
    const flyEased = easeOutCubic(fly);
    const unfold = reduced ? 1 : MathUtils.clamp((time - OPEN_AT) / OPEN, 0, 1);
    const unfoldEased = easeInOutCubic(unfold);
    const away = 1 - flyEased;
    const settle = reduced ? 0 : MathUtils.smoothstep(time - (OPEN_AT + OPEN), 0, 1.2);

    duo.setOpenness(unfoldEased);
    duo.setBlend(MathUtils.smoothstep(unfold, 0.22, 0.82));

    if (!opened) {
      const distance = view.distance * MathUtils.lerp(START_DISTANCE, 1, unfoldEased);
      stage.applyView({
        distance,
        pitch: view.pitch + MathUtils.lerp(START_PITCH, 0, unfoldEased),
        yaw: view.yaw + MathUtils.lerp(START_YAW, 0, easeInOutCubic(fly)),
      });
      if (unfold >= 1) {
        opened = true;
        stage.setOrbitEnabled(true);
      }
    }

    const x = -offscreenX(view.distance * START_DISTANCE) * away;
    const y = Math.sin(time * 2.1) * 0.35 * (away * 0.7 + 0.3) * (1 - unfold) + Math.sin(time * 1.15) * 0.24 * settle;
    stage.setOffset([x, y]);

    const spin = easeInOutCubic(fly);
    const roll = portrait ? Math.PI / 2 : 0;
    stage.setPose([
      0,
      MathUtils.lerp(START_SPIN, 0, spin) + turn,
      roll + START_TILT * (1 - spin) + Math.sin(time * 1.7) * 0.03 * away + Math.sin(time * 0.8) * 0.014 * settle,
    ]);
  }

  function render(now) {
    const step = Math.min((now - last) / 1000, MAX_STEP);
    last = now;
    t += step;
    // The turntable eases in with the settle, so it picks up speed instead of lurching
    if (!reduced) turn = (turn + TURN_SPEED * step * MathUtils.smoothstep(t - (OPEN_AT + OPEN), 0, 1.2)) % (Math.PI * 2);
    pose(t);
    eye.copy(stage.eyeInContent());
    const length = eye.length();
    duo.setViewpoint(eye, length > 0 ? MathUtils.clamp(eye.z / length, 0, 1) ** VIEWPOINT_FALLOFF : 1);
    duo.render(stage.renderer);
    stage.render();
  }

  pose(0);
  await stage.renderer.compileAsync(stage.scene, stage.camera);

  let started = false;
  function start() {
    if (started) return;
    started = true;
    t = 0;
    last = performance.now();
    host.classList.add("is-ready");
    stage.renderer.setAnimationLoop(render);
  }

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data === "duo:start") start();
    else if (!started) return;
    else if (event.data === "duo:pause") stage.renderer.setAnimationLoop(null);
    else if (event.data === "duo:play") {
      last = performance.now();
      stage.renderer.setAnimationLoop(render);
    }
  });

  // Opened on its own (not inside the store page): nobody will send "duo:start"
  if (window.parent === window) start();
  else window.parent.postMessage("duo:ready", window.location.origin);
}

main().catch((error) => {
  console.error(error);
  window.parent.postMessage("duo:failed", window.location.origin);
});
