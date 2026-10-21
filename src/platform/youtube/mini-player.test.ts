import { afterEach, expect, it, vi } from "vitest";
import { createMiniPlayer } from "./mini-player";
import { createPlayer } from "./player";
import { mountMiniPlayer } from "../../features/mini-player";
import { mountToolbar } from "../../toolbar/mount";
import { playbackSpeed } from "../../features/playback-speed";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

function setup(enabled = true) {
  history.replaceState(null, "", "/watch?v=first");
  document.body.innerHTML =
    '<div id="movie_player"><div class="html5-video-container"><video class="html5-main-video" style="width: 900px; height: 500px"></video></div></div>';
  const movie = document.querySelector<HTMLElement>("#movie_player")!;
  const video = document.querySelector("video")!;
  let bottom = 500;
  vi.spyOn(movie, "getBoundingClientRect").mockImplementation(() => ({
    x: 20,
    y: bottom - 500,
    top: bottom - 500,
    bottom,
    left: 20,
    right: 920,
    width: 900,
    height: 500,
    toJSON() {},
  }));
  const player = createMiniPlayer(document, enabled);
  const host = document.createElement("div");
  document.body.append(host);
  const container = document.createElement("div");
  host.attachShadow({ mode: "open" }).append(container);
  const unmount = mountMiniPlayer(container, player);
  return {
    player,
    movie,
    video,
    container,
    move(value: number) {
      bottom = value;
      player.setEnabled(enabled);
    },
    dispose() {
      unmount();
      player.dispose();
      host.remove();
    },
  };
}

it("floats only after the whole player scrolls above the viewport and restores the same video", () => {
  const f = setup();
  const originalStyle = f.video.getAttribute("style");
  const parent = f.video.parentElement;
  const overlay = f.container.querySelector<HTMLElement>("section")!;
  f.video.currentTime = 42;
  f.video.playbackRate = 1.5;
  expect(overlay.hidden).toBe(true);
  f.move(1);
  expect(overlay.hidden).toBe(true);
  f.move(0);
  expect(overlay.hidden).toBe(false);
  expect(f.video.hasAttribute("data-oyt-mini-player")).toBe(true);
  expect(f.movie.hasAttribute("data-oyt-mini-player-active")).toBe(true);
  expect(document.querySelectorAll("video")).toHaveLength(1);
  expect(f.video.parentElement).toBe(parent);
  expect(f.video.currentTime).toBe(42);
  expect(f.video.playbackRate).toBe(1.5);
  f.move(1);
  expect(overlay.hidden).toBe(true);
  expect(f.video.hasAttribute("data-oyt-mini-player")).toBe(false);
  expect(f.movie.hasAttribute("data-oyt-mini-player-active")).toBe(false);
  expect(f.video.getAttribute("style")).toBe(originalStyle);
  f.move(-200);
  f.player.setEnabled(false);
  expect(overlay.hidden).toBe(true);
  f.dispose();
  expect(document.querySelector("style")).toBeNull();
});

it("plays/pauses the current video, tracks native events and clamps finite progress", () => {
  const f = setup();
  let paused = true;
  Object.defineProperty(f.video, "paused", { get: () => paused });
  Object.defineProperty(f.video, "duration", {
    configurable: true,
    value: 100,
  });
  const play = vi.spyOn(f.video, "play").mockImplementation(async () => {
    paused = false;
    f.video.dispatchEvent(new Event("play"));
  });
  const pause = vi.spyOn(f.video, "pause").mockImplementation(() => {
    paused = true;
    f.video.dispatchEvent(new Event("pause"));
  });
  f.move(-10);
  const button = f.container.querySelector("button")!;
  button.click();
  expect(play).toHaveBeenCalledOnce();
  expect(button.getAttribute("aria-label")).toBe("Pause");
  button.click();
  expect(pause).toHaveBeenCalledOnce();
  expect(button.getAttribute("aria-label")).toBe("Play");
  f.video.currentTime = 35;
  f.video.dispatchEvent(new Event("timeupdate"));
  const progress = f.container.querySelector('[role="progressbar"]')!;
  expect(progress.getAttribute("aria-valuenow")).toBe("35");
  expect(
    f.container.querySelector<HTMLElement>(".mini-player-progress > div")!.style
      .transform,
  ).toBe("scaleX(0.35)");
  Object.defineProperty(f.video, "duration", { value: Infinity });
  f.video.dispatchEvent(new Event("durationchange"));
  expect(progress.getAttribute("aria-valuenow")).toBe("0");
  f.dispose();
  f.video.dispatchEvent(new Event("play"));
  expect(f.container.childElementCount).toBe(0);
});

it("keeps video and controls 12px below the measured header and follows header changes", () => {
  const f = setup();
  const header = document.createElement("ytd-masthead");
  document.body.prepend(header);
  let height = 56;
  vi.spyOn(header, "getBoundingClientRect").mockImplementation(() => ({
    top: 0,
    bottom: height,
    height,
    width: 1000,
    left: 0,
    right: 1000,
    x: 0,
    y: 0,
    toJSON() {},
  }));
  f.move(57);
  const overlay = f.container.querySelector<HTMLElement>("section")!;
  expect(overlay.hidden).toBe(true);
  f.move(56);
  expect(overlay.hidden).toBe(false);
  expect(overlay.style.top).toBe("68px");
  const rules = [
    ...document.querySelector("style")!.sheet!.cssRules,
  ] as CSSStyleRule[];
  const videoRule = rules.find((rule) => rule.selectorText.includes("video["))!;
  expect(videoRule.style.getPropertyValue("top")).toBe("68px");
  height = 80;
  f.player.setEnabled(true);
  expect(overlay.style.top).toBe("92px");
  expect(videoRule.style.getPropertyValue("top")).toBe("92px");
  header.hidden = true;
  f.move(-10);
  expect(overlay.style.top).toBe("12px");
  header.remove();
  f.player.setEnabled(true);
  expect(overlay.style.top).toBe("12px");
  f.dispose();
});

it("leaves native wrapper clipping and opacity untouched while floating", () => {
  const f = setup();
  const wrapper = f.video.parentElement!;
  wrapper.style.opacity = "0.4";
  wrapper.style.overflow = "hidden";
  const originalStyle = wrapper.getAttribute("style");
  f.move(-10);
  expect(wrapper.getAttribute("style")).toBe(originalStyle);
  expect(getComputedStyle(wrapper).opacity).toBe("0.4");
  expect(getComputedStyle(wrapper).overflow).toBe("hidden");
  f.move(1);
  expect(document.querySelector("[data-oyt-mini-player-layer]")).toBeNull();
  expect(wrapper.getAttribute("style")).toBe(originalStyle);
  expect(getComputedStyle(wrapper).opacity).toBe("0.4");
  f.move(-10);
  f.dispose();
  expect(document.querySelector("[data-oyt-mini-player-layer]")).toBeNull();
  expect(wrapper.getAttribute("style")).toBe(originalStyle);
});

it("promotes the same video before its controls and releases both top-layer presentations", () => {
  const shown: HTMLElement[] = [];
  const hidden: HTMLElement[] = [];
  const previousShow = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "showPopover",
  );
  const previousHide = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "hidePopover",
  );
  Object.defineProperty(HTMLElement.prototype, "showPopover", {
    configurable: true,
    value(this: HTMLElement) {
      shown.push(this);
    },
  });
  Object.defineProperty(HTMLElement.prototype, "hidePopover", {
    configurable: true,
    value(this: HTMLElement) {
      hidden.push(this);
    },
  });
  const f = setup();
  const overlay = f.container.querySelector<HTMLElement>("section")!;
  try {
    f.video.setAttribute("popover", "auto");
    const parent = f.video.parentElement;
    f.move(-10);
    expect(shown).toEqual([f.video, overlay]);
    expect(f.video.getAttribute("popover")).toBe("manual");
    expect(f.video.parentElement).toBe(parent);
    f.player.setEnabled(true);
    expect(shown).toHaveLength(2);
    f.player.setEnabled(false);
    expect(hidden).toEqual([f.video, overlay]);
    expect(f.video.getAttribute("popover")).toBe("auto");
    f.video.removeAttribute("popover");
    f.player.setEnabled(true);
    f.dispose();
    expect(hidden).toHaveLength(4);
    expect(f.video.hasAttribute("popover")).toBe(false);
  } finally {
    f.dispose();
    if (previousShow)
      Object.defineProperty(HTMLElement.prototype, "showPopover", previousShow);
    else Reflect.deleteProperty(HTMLElement.prototype, "showPopover");
    if (previousHide)
      Object.defineProperty(HTMLElement.prototype, "hidePopover", previousHide);
    else Reflect.deleteProperty(HTMLElement.prototype, "hidePopover");
  }
});

it("restores on navigation, follows replacements, and leaves other routes untouched", () => {
  const f = setup();
  f.move(-50);
  document.dispatchEvent(new Event("yt-navigate-start"));
  expect(f.video.hasAttribute("data-oyt-mini-player")).toBe(false);
  const replacement = f.video.cloneNode() as HTMLVideoElement;
  f.video.replaceWith(replacement);
  history.replaceState(null, "", "/watch?v=second");
  document.dispatchEvent(new Event("yt-navigate-finish"));
  expect(replacement.hasAttribute("data-oyt-mini-player")).toBe(true);
  expect(f.video.hasAttribute("data-oyt-mini-player")).toBe(false);
  history.replaceState(null, "", "/shorts/test");
  document.dispatchEvent(new Event("yt-navigate-finish"));
  expect(replacement.hasAttribute("data-oyt-mini-player")).toBe(false);
  f.dispose();
});

it("suspends floating in fullscreen and picture in picture, then cleans up while active", () => {
  const f = setup();
  f.move(-50);
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    value: f.movie,
  });
  document.dispatchEvent(new Event("fullscreenchange"));
  expect(f.video.hasAttribute("data-oyt-mini-player")).toBe(false);
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    value: null,
  });
  document.dispatchEvent(new Event("fullscreenchange"));
  expect(f.video.hasAttribute("data-oyt-mini-player")).toBe(true);
  Object.defineProperty(document, "pictureInPictureElement", {
    configurable: true,
    value: f.video,
  });
  f.video.dispatchEvent(new Event("enterpictureinpicture"));
  expect(f.video.hasAttribute("data-oyt-mini-player")).toBe(false);
  Object.defineProperty(document, "pictureInPictureElement", {
    configurable: true,
    value: null,
  });
  f.video.dispatchEvent(new Event("leavepictureinpicture"));
  expect(f.video.hasAttribute("data-oyt-mini-player")).toBe(true);
  f.dispose();
  expect(f.video.hasAttribute("data-oyt-mini-player")).toBe(false);
  window.dispatchEvent(new Event("scroll"));
  expect(f.movie.hasAttribute("data-oyt-mini-player-active")).toBe(false);
});

it.each([true, false])(
  "exposes an iconless Player Playback setting (saved enabled: %s)",
  (enabled) => {
    const f = setup(enabled);
    const mainPlayer = createPlayer(document);
    const changes: boolean[] = [];
    const unmount = mountToolbar(f.container, mainPlayer, [playbackSpeed], {
      miniPlayerEnabled: enabled,
      onMiniPlayerEnabledChange(value) {
        changes.push(value);
        f.player.setEnabled(value);
      },
    });
    f.move(-50);
    const trigger = f.container.querySelector<HTMLButtonElement>(
      '[aria-label="Player Playback"]',
    )!;
    trigger.click();
    const panel = f.container.querySelector(
      "#" + trigger.getAttribute("aria-controls"),
    )!;
    const checkbox = panel.querySelector("input")!;
    expect(checkbox.checked).toBe(enabled);
    expect(panel.querySelector("svg")).toBeNull();
    expect(f.container.querySelectorAll(".tool-slot")).toHaveLength(1);
    checkbox.click();
    expect(changes).toEqual([!enabled]);
    expect(f.video.hasAttribute("data-oyt-mini-player")).toBe(!enabled);
    unmount();
    mainPlayer.dispose();
    f.dispose();
  },
);

it("coalesces scrolling, reacts to DOM replacement without navigation, and cancels pending work", async () => {
  const callbacks = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callbacks.set(++id, callback);
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((key) => {
    callbacks.delete(key);
  });
  const f = setup();
  f.move(-40);
  window.dispatchEvent(new Event("scroll"));
  window.dispatchEvent(new Event("scroll"));
  expect(callbacks.size).toBe(1);
  const replacement = f.video.cloneNode() as HTMLVideoElement;
  replacement.removeAttribute("data-oyt-mini-player");
  f.video.replaceWith(replacement);
  await Promise.resolve();
  const callback = [...callbacks.values()][0]!;
  callbacks.clear();
  callback(0);
  expect(replacement.hasAttribute("data-oyt-mini-player")).toBe(true);
  expect(f.video.hasAttribute("data-oyt-mini-player")).toBe(false);
  window.dispatchEvent(new Event("scroll"));
  f.dispose();
  expect(callbacks.size).toBe(0);
});
