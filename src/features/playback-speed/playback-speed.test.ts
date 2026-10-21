import { afterEach, expect, it, vi } from "vitest";
import { createPlayer } from "../../platform/youtube/player";
import { mountToolbar } from "../../toolbar/mount";
import { playbackSpeed, stepSpeed } from "./index";

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

it("snaps off-grid speeds in the requested direction", () => {
  expect(stepSpeed(1.05, 1)).toBe(1.25);
  expect(stepSpeed(1.05, -1)).toBe(1);
  expect(stepSpeed(1.25, 1)).toBe(1.5);
  expect(stepSpeed(1.25, -1)).toBe(1);
  expect(stepSpeed(2, 1)).toBe(2);
  expect(stepSpeed(0.25, -1)).toBe(0.25);
});

it("supports scroll, disclosure, boundaries, reset, route visibility and teardown", () => {
  history.replaceState(null, "", "/watch?v=test");
  document.body.innerHTML =
    '<div id="movie_player"><video class="html5-main-video"></video></div>';
  const player = createPlayer(document);
  const container = document.createElement("div");
  document.body.append(container);
  const dispose = mountToolbar(container, player, [playbackSpeed]);
  const button = (label: string) =>
    container.querySelector<HTMLButtonElement>(
      `button[aria-label="${label}"]`,
    )!;
  const trigger = button("Change Speed with Scroll");
  const slower = button("Decrease playback speed");
  const faster = button("Increase playback speed");
  const reset = button("Reset playback speed to 1×");
  const wheel = new WheelEvent("wheel", { deltaY: -100, cancelable: true });
  trigger.dispatchEvent(wheel);
  expect(wheel.defaultPrevented).toBe(true);
  expect(player.snapshot().playbackRate).toBe(1.02);
  faster.click();
  expect(player.snapshot().playbackRate).toBe(1.25);
  trigger.dispatchEvent(new WheelEvent("wheel", { deltaY: 1 }));
  slower.click();
  expect(player.snapshot().playbackRate).toBe(1);
  button("Expand playback speed controls").click();
  expect(
    container.querySelector(".reveal")!.classList.contains("expanded"),
  ).toBe(true);
  for (let i = 0; i < 100; i++) faster.click();
  expect(player.snapshot().playbackRate).toBe(2);
  expect(faster.disabled).toBe(true);
  for (let i = 0; i < 100; i++) slower.click();
  expect(player.snapshot().playbackRate).toBe(0.25);
  expect(slower.disabled).toBe(true);
  reset.click();
  expect(reset.textContent).toBe("1.00×");
  trigger.click();
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  history.pushState(null, "", "/shorts/test");
  document.dispatchEvent(new Event("yt-navigate-finish"));
  expect(container.querySelector("section")!.hidden).toBe(true);
  expect(reset.disabled).toBe(true);
  dispose();
  player.dispose();
  expect(container.childElementCount).toBe(0);
});

it("opens panels only on activation, and dismisses nested settings", () => {
  history.replaceState(null, "", "/watch?v=test");
  document.body.innerHTML =
    '<div id="movie_player"><video class="html5-main-video"></video></div>';
  const player = createPlayer(document);
  const dispose = mountToolbar(document.body, player, [playbackSpeed]);
  const trigger = document.querySelector<HTMLButtonElement>(
    '[aria-label="Change Speed with Scroll"]',
  )!;
  trigger.dispatchEvent(new Event("pointerenter"));
  trigger.focus();
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  trigger.click();
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  trigger.click();
  const settings = document.querySelector<HTMLButtonElement>(
    '[aria-label="Toolbar options"]',
  )!;
  settings.click();
  const position = document.querySelector<HTMLButtonElement>(
    '[aria-label="Position"]',
  )!;
  position.click();
  expect(position.getAttribute("aria-expanded")).toBe("true");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(position.getAttribute("aria-expanded")).toBe("false");
  expect(settings.getAttribute("aria-expanded")).toBe("true");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(settings.getAttribute("aria-expanded")).toBe("false");
  dispose();
  player.dispose();
});

it("restores disabled functions and mounts/unmounts them through checkboxes", () => {
  history.replaceState(null, "", "/watch?v=test");
  document.body.innerHTML =
    '<div id="movie_player"><video class="html5-main-video"></video></div>';
  const player = createPlayer(document);
  const saved: string[][] = [];
  const dispose = mountToolbar(document.body, player, [playbackSpeed], {
    hiddenTools: ["playback-speed"],
    onHiddenToolsChange: (ids) => saved.push(ids),
  });
  const speed = () =>
    document.querySelector<HTMLButtonElement>(
      '[aria-label="Change Speed with Scroll"]',
    );
  const checkbox = document.querySelector<HTMLInputElement>(
    'input[type="checkbox"]',
  )!;
  expect(speed()).toBeNull();
  expect(checkbox.checked).toBe(false);
  checkbox.click();
  expect(speed()).not.toBeNull();
  const old = speed()!;
  old.click();
  checkbox.click();
  expect(speed()).toBeNull();
  old.click();
  expect(old.getAttribute("aria-expanded")).toBe("false");
  checkbox.click();
  speed()!.dispatchEvent(new WheelEvent("wheel", { deltaY: -1 }));
  expect(player.snapshot().playbackRate).toBe(1.02);
  expect(saved).toEqual([[], ["playback-speed"], []]);
  dispose();
  player.dispose();
});

it("uses 0.02 wheel steps in both directions and keeps zoom and boundaries", () => {
  history.replaceState(null, "", "/watch?v=test");
  document.body.innerHTML =
    '<div id="movie_player"><video class="html5-main-video"></video></div>';
  const player = createPlayer(document);
  const dispose = mountToolbar(document.body, player, [playbackSpeed]);
  const trigger = document.querySelector<HTMLButtonElement>(
    '[aria-label="Change Speed with Scroll"]',
  )!;
  const wheel = (deltaY: number, ctrlKey = false) =>
    trigger.dispatchEvent(
      new WheelEvent("wheel", { deltaY, ctrlKey, cancelable: true }),
    );
  wheel(-1);
  expect(player.snapshot().playbackRate).toBe(1.02);
  wheel(1);
  expect(player.snapshot().playbackRate).toBe(1);
  wheel(-1, true);
  wheel(0);
  expect(player.snapshot().playbackRate).toBe(1);
  for (let i = 0; i < 100; i++) wheel(-1);
  expect(player.snapshot().playbackRate).toBe(2);
  for (let i = 0; i < 100; i++) wheel(1);
  expect(player.snapshot().playbackRate).toBe(0.25);
  dispose();
  player.dispose();
});

it("keeps the native notice visible for every wheel tick despite native hide timers and a forwards-filled text fade", async () => {
  vi.useFakeTimers();
  history.replaceState(null, "", "/watch?v=test");
  document.body.innerHTML =
    '<div id="movie_player"><video class="html5-main-video"></video><div style="display:none"><div class="ytp-bezel-text-wrapper"><div class="ytp-bezel-text"></div></div><div class="ytp-bezel"></div></div></div>';
  const player = createPlayer(document);
  const dispose = mountToolbar(document.body, player, [playbackSpeed]);
  const trigger = document.querySelector<HTMLButtonElement>(
    '[aria-label="Change Speed with Scroll"]',
  )!;
  const text = document.querySelector<HTMLElement>(".ytp-bezel-text")!;
  const wrapper = text.parentElement!;
  wrapper.style.animation = "native-fade 1s forwards";
  wrapper.style.opacity = "0";
  const layer = wrapper.parentElement!;
  const tick = () =>
    trigger.dispatchEvent(
      new WheelEvent("wheel", { deltaY: -1, cancelable: true }),
    );
  try {
    setTimeout(() => {
      layer.style.display = "none";
      layer.classList.add("ytp-bezel-text-hide");
    }, 500);
    for (let i = 1; i <= 6; i++) {
      tick();
      expect(player.snapshot().playbackRate).toBe(1 + i * 0.02);
      expect(text.textContent).toBe(player.snapshot().playbackRate + "x");
      await vi.advanceTimersByTimeAsync(400);
      expect(layer.style.display).toBe("block");
      expect(wrapper.style.animation).toBe("none");
      expect(wrapper.style.opacity).toBe("1");
      expect(layer.classList.contains("ytp-bezel-text-hide")).toBe(false);
    }
    await vi.advanceTimersByTimeAsync(249);
    expect(layer.style.display).toBe("block");
    await vi.advanceTimersByTimeAsync(1);
    expect(layer.style.display).toBe("none");
    expect(wrapper.style.animation).toBe("native-fade 1s forwards");
    expect(wrapper.style.opacity).toBe("0");
    player.setPlaybackRate(2);
    await vi.advanceTimersByTimeAsync(400);
    tick();
    await vi.advanceTimersByTimeAsync(400);
    expect(player.snapshot().playbackRate).toBe(2);
    expect(text.textContent).toBe("2x");
    expect(layer.style.display).toBe("block");
    await vi.advanceTimersByTimeAsync(250);
    expect(layer.style.display).toBe("none");
    layer.style.display = "none";
    await Promise.resolve();
    expect(layer.style.display).toBe("none");
  } finally {
    dispose();
    player.dispose();
  }
});

it.each([false, true])(
  "keeps the panel open when the focused limit button disables (shadow root: %s)",
  async (shadow) => {
    vi.useFakeTimers();
    history.replaceState(null, "", "/watch?v=test");
    document.body.innerHTML =
      '<div id="movie_player"><video class="html5-main-video"></video></div>';
    const host = document.createElement("div");
    document.body.append(host);
    const root = shadow ? host.attachShadow({ mode: "open" }) : host;
    const container = document.createElement("div");
    root.append(container);
    const player = createPlayer(document);
    const dispose = mountToolbar(container, player, [playbackSpeed]);
    const button = (label: string) =>
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="' + label + '"]',
      )!;
    const trigger = button("Change Speed with Scroll");
    const reset = button("Reset playback speed to 1×");
    const panel = container.querySelector<HTMLElement>(".tool .popover")!;
    try {
      trigger.click();
      button("Expand playback speed controls").click();
      for (const [rate, label, limit] of [
        [1.75, "Increase playback speed", 2],
        [0.5, "Decrease playback speed", 0.25],
      ] as const) {
        player.setPlaybackRate(rate);
        const control = button(label);
        control.focus();
        control.click();
        expect(player.snapshot().playbackRate).toBe(limit);
        expect(control.disabled).toBe(true);
        expect(
          shadow ? (root as ShadowRoot).activeElement : document.activeElement,
        ).toBe(reset);
        await vi.advanceTimersByTimeAsync(250);
        expect(panel.hidden).toBe(false);
        expect(trigger.getAttribute("aria-expanded")).toBe("true");
      }
      reset.click();
      expect(player.snapshot().playbackRate).toBe(1);
      expect(panel.hidden).toBe(false);
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      expect(panel.hidden).toBe(true);
    } finally {
      dispose();
      player.dispose();
    }
  },
);
