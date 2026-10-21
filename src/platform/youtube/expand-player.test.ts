import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createExpandPlayer, expandedSize } from "./expand-player";
import { expandPlayer } from "../../features/expand-player";

describe("expanded watch player", () => {
  let port: ReturnType<typeof createExpandPlayer>;
  let watch: HTMLElement;
  let video: HTMLVideoElement;
  beforeEach(() => {
    history.replaceState(null, "", "/watch?v=first");
    document.body.innerHTML =
      '<div id="masthead-container"></div><ytd-watch-flexy><div id="columns"><div id="primary"><div id="player"><div id="movie_player"><div class="html5-video-container"><video class="html5-main-video" style="width: 640px"></video></div><div class="ytp-chrome-bottom" style="width: 616px; left: 12px"></div></div></div></div><div id="secondary">Recommendations</div></div></ytd-watch-flexy>';
    watch = document.querySelector("ytd-watch-flexy")!;
    video = document.querySelector("video")!;
    Object.defineProperties(video, {
      videoWidth: { value: 1920, configurable: true },
      videoHeight: { value: 1080, configurable: true },
    });
    port = createExpandPlayer(document);
  });
  afterEach(() => {
    port.dispose();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });
  it("fits landscape, portrait and ultrawide pictures without cropping", () => {
    for (const ratio of [16 / 9, 9 / 16, 21 / 9, 1]) {
      const size = expandedSize(1280, 620, ratio);
      expect(size.width).toBeLessThanOrEqual(1280);
      expect(size.height).toBeLessThanOrEqual(620);
      expect(size.width / size.height).toBeCloseTo(ratio);
    }
    expect(expandedSize(1280, 900, 16 / 9)).toEqual({
      width: 1280,
      height: 720,
    });
    expect(expandedSize(1280, 0, 16 / 9)).toEqual({ width: 0, height: 0 });
  });
  it("toggles the scoped layout without replacing the video or modifying native styles", () => {
    const parent = video.parentElement;
    port.toggle();
    expect(watch.hasAttribute("data-oyt-expanded")).toBe(true);
    expect(video.parentElement).toBe(parent);
    expect(document.querySelectorAll("video")).toHaveLength(1);
    port.toggle();
    expect(watch.hasAttribute("data-oyt-expanded")).toBe(false);
    expect(video.getAttribute("style")).toBe("width: 640px");
  });
  it("reserves masthead and toolbar space and updates intrinsic aspect ratio", () => {
    vi.spyOn(
      document.querySelector("#masthead-container")!,
      "getBoundingClientRect",
    ).mockReturnValue({ height: 56 } as DOMRect);
    port.toggle();
    const sizing = (
      document.head.querySelector("style")!.sheet!.cssRules[0] as CSSStyleRule
    ).style;
    expect(
      parseFloat(sizing.getPropertyValue("--oyt-expanded-height")),
    ).toBeLessThanOrEqual(innerHeight - 100);
    Object.defineProperties(video, {
      videoWidth: { value: 1080 },
      videoHeight: { value: 1920 },
    });
    port.toggle();
    port.toggle();
    const height = parseFloat(sizing.getPropertyValue("--oyt-expanded-height"));
    expect(height).toBeCloseTo(innerHeight - 100);
  });
  it("releases layout on navigation and follows replacement videos", async () => {
    port.toggle();
    document.dispatchEvent(new Event("yt-navigate-start"));
    expect(watch.hasAttribute("data-oyt-expanded")).toBe(false);
    const next = video.cloneNode() as HTMLVideoElement;
    video.replaceWith(next);
    document.dispatchEvent(new Event("yt-navigate-finish"));
    port.toggle();
    expect(watch.hasAttribute("data-oyt-expanded")).toBe(true);
    history.replaceState(null, "", "/");
    document.dispatchEvent(new Event("yt-navigate-finish"));
    expect(watch.hasAttribute("data-oyt-expanded")).toBe(false);
  });
  it("notifies native resize handlers after applying and restoring expanded layout", () => {
    const layouts: boolean[] = [];
    const onResize = () =>
      layouts.push(watch.hasAttribute("data-oyt-expanded"));
    window.addEventListener("resize", onResize);
    port.toggle();
    port.reset();
    window.removeEventListener("resize", onResize);
    expect(layouts).toEqual([true, false]);
  });
  it("updates the fitted height on intrinsic video resize without another click", async () => {
    vi.useFakeTimers();
    port.toggle();
    Object.defineProperties(video, {
      videoWidth: { value: 4000 },
      videoHeight: { value: 1000 },
    });
    video.dispatchEvent(new Event("resize"));
    await vi.advanceTimersByTimeAsync(40);
    const sizing = (
      document.head.querySelector("style")!.sheet!.cssRules[0] as CSSStyleRule
    ).style;
    expect(
      parseFloat(sizing.getPropertyValue("--oyt-expanded-height")),
    ).toBeCloseTo(innerWidth / 4);
    vi.useRealTimers();
  });
  it("suspends for fullscreen and restores after leaving", () => {
    port.toggle();
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: video.parentElement,
    });
    document.dispatchEvent(new Event("yt-navigate-finish"));
    expect(watch.hasAttribute("data-oyt-expanded")).toBe(false);
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    document.dispatchEvent(new Event("yt-navigate-finish"));
    expect(watch.hasAttribute("data-oyt-expanded")).toBe(true);
  });
  it("exposes an accessible toggle and restores layout when the tool is hidden", () => {
    const container = document.createElement("div");
    const unmount = expandPlayer(port).mount(container, {} as never);
    const button = container.querySelector("button")!;
    expect(button.getAttribute("aria-pressed")).toBe("false");
    button.click();
    expect(button.getAttribute("aria-label")).toBe("Shrink video");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    unmount();
    expect(watch.hasAttribute("data-oyt-expanded")).toBe(false);
    expect(container.childElementCount).toBe(0);
  });
  it("removes its stylesheet and restores the native layout on disposal", () => {
    const count = document.head.querySelectorAll("style").length;
    port.toggle();
    port.dispose();
    expect(watch.hasAttribute("data-oyt-expanded")).toBe(false);
    expect(document.head.querySelectorAll("style")).toHaveLength(count - 1);
  });
  it("does not re-render subscribers when unrelated DOM mutations refresh discovery", async () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const unsubscribe = port.subscribe(listener);
    const container = document.createElement("div");
    const unmount = expandPlayer(port).mount(container, {} as never);
    document.body.append(container);
    port.toggle();
    const calls = listener.mock.calls.length;
    document.body.append(document.createElement("span"));
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(100);
    expect(listener).toHaveBeenCalledTimes(calls);
    unmount();
    unsubscribe();
    vi.useRealTimers();
  });
});
