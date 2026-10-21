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
it("dims by 70% and cuts clear windows around the player and toolbar", () => {
  cinema.toggle();
  const overlay = document.querySelector("[data-oyt-cinema]")!;
  expect(overlay.querySelector('[fill-opacity="0.7"]')).not.toBeNull();
  const holes = overlay.querySelectorAll('mask rect[fill="black"]');
  expect(holes[0]?.getAttribute("x")).toBe("20");
  expect(holes[0]?.getAttribute("height")).toBe("360");
  expect(holes[1]?.getAttribute("y")).toBe("410");
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
    document.querySelector('mask rect[fill="black"]')?.getAttribute("width"),
  ).toBe("320");
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
