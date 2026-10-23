import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCinema } from "./cinema";

let cinema: ReturnType<typeof createCinema>;
let tick: FrameRequestCallback;
let toolbar: HTMLElement;
let video: HTMLVideoElement;
beforeEach(() => {
  history.replaceState(null, "", "/watch?v=test");
  document.body.innerHTML =
    '<div id="movie_player"><video class="html5-main-video"></video></div><section class="oyt-toolbar"></section>';
  toolbar = document.querySelector("section")!;
  video = document.querySelector("video")!;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    tick = callback;
    return 1;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  vi.spyOn(
    document.querySelector("#movie_player")!,
    "getBoundingClientRect",
  ).mockReturnValue({ left: 20, top: 50, width: 640, height: 360 } as DOMRect);
  vi.spyOn(toolbar, "getBoundingClientRect").mockReturnValue({
    left: 20,
    top: 410,
    width: 240,
    height: 44,
  } as DOMRect);
  cinema = createCinema(document, toolbar);
});
afterEach(() => {
  cinema.dispose();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});
it("dims by 87% and cuts clear windows around the player and toolbar", () => {
  cinema.toggle();
  const overlay = document.querySelector("[data-oyt-cinema]")!;
  expect(overlay.querySelector('[fill-opacity="0.87"]')).not.toBeNull();
  const holes = overlay.querySelectorAll("[data-hole] > path");
  expect(holes[0]?.getAttribute("d")).toContain("M 20 50 H 660");
  expect(holes[0]?.getAttribute("d")).toContain("V 410");
  expect(holes[1]?.getAttribute("d")).toContain("M 20 410");
  expect(overlay.getAttribute("style")).toContain("pointer-events: none");
  cinema.toggle();
  expect(
    document.querySelector("[data-oyt-cinema]")?.hasAttribute("data-active"),
  ).toBe(false);
  cinema.dispose();
  expect(document.querySelector("[data-oyt-cinema]")).toBeNull();
});
it("marks the toolbar for CSS dimming and safely handles toggles during fade-out", () => {
  vi.useFakeTimers();
  try {
    cinema.toggle();
    expect(toolbar.dataset.cinema).toBe("true");
    cinema.toggle();
    expect(toolbar.dataset.cinema).toBeUndefined();
    cinema.toggle();
    vi.advanceTimersByTime(200);
    expect(cinema.active).toBe(true);
    expect(
      document.querySelector("[data-oyt-cinema]")?.hasAttribute("data-active"),
    ).toBe(true);
    cinema.toggle();
    vi.advanceTimersByTime(180);
    expect(document.querySelector("[data-oyt-cinema]")).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});
it("updates corner geometry while active and preserves square toolbar corners", () => {
  toolbar.style.borderBottomLeftRadius = "22px";
  toolbar.style.borderBottomRightRadius = "22px";
  cinema.toggle();
  const hole = document.querySelector('[data-hole="toolbar"]')!;
  expect(hole.innerHTML).toContain("M 20 410 H 260");
  expect(hole.innerHTML).toContain("A 22 22");
  toolbar.style.borderBottomLeftRadius = "0px";
  toolbar.style.borderBottomRightRadius = "0px";
  toolbar.style.borderTopLeftRadius = "18px";
  toolbar.style.borderTopRightRadius = "18px";
  tick(0);
  expect(hole.innerHTML).toContain("M 38 410 H 242");
  expect(hole.innerHTML).toContain("A 18 18");
  expect(hole.innerHTML).not.toContain("A 22 22");
});
it("follows percentage radius changes and rounded player containers", () => {
  const player = video.parentElement!;
  const container = document.createElement("div");
  player.before(container);
  container.append(player);
  container.style.overflow = "hidden";
  container.style.borderTopLeftRadius = "10% 20%";
  const bounds = vi.spyOn(container, "getBoundingClientRect");
  bounds.mockReturnValue({
    left: 20,
    top: 50,
    width: 640,
    height: 360,
  } as DOMRect);
  cinema.toggle();
  const hole = document.querySelector('[data-hole="player"]')!;
  expect(hole.querySelector("clipPath path")?.getAttribute("d")).toContain(
    "A 64 72",
  );
  bounds.mockReturnValue({
    left: 20,
    top: 50,
    width: 320,
    height: 180,
  } as DOMRect);
  tick(0);
  expect(hole.querySelector("clipPath path")?.getAttribute("d")).toContain(
    "A 32 36",
  );
});
it("tracks fullscreen and mini player geometry without moving the video", () => {
  const parent = video.parentElement;
  cinema.toggle();
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    value: parent,
  });
  video.setAttribute("data-oyt-mini-player", "");
  vi.spyOn(video, "getBoundingClientRect").mockReturnValue({
    left: 12,
    top: 12,
    width: 320,
    height: 180,
  } as DOMRect);
  tick(0);
  expect(document.querySelector("[data-oyt-cinema]")?.parentElement).toBe(
    parent,
  );
  expect(
    document.querySelector("[data-hole] > path")?.getAttribute("d"),
  ).toContain("H 332");
  expect(video.parentElement).toBe(parent);
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    value: null,
  });
});
it.each([
  "yt-navigate-start",
  "yt-navigate-finish",
  "Escape",
  "removed video",
  "dispose",
])("cleans up on %s", (action) => {
  cinema.toggle();
  if (action === "Escape")
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  else if (action === "removed video") {
    video.remove();
    tick(0);
  } else if (action === "dispose") cinema.dispose();
  else document.dispatchEvent(new Event(action));
  expect(cinema.active).toBe(false);
  expect(toolbar.dataset.cinema).toBeUndefined();
  expect(document.querySelector("[data-oyt-cinema]")).toBeNull();
});
