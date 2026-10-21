import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createExpandPlayer } from "./expand-player";
import { expandPlayer } from "../../features/expand-player";
import { createPlayer } from "./player";
import { mountToolbar } from "../../toolbar/mount";

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
  it("uses the whole viewport height below the masthead without reserving toolbar space", () => {
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
    ).toBeCloseTo(innerHeight - 56);
    Object.defineProperties(video, {
      videoWidth: { value: 1080 },
      videoHeight: { value: 1920 },
    });
    port.toggle();
    port.toggle();
    const height = parseFloat(sizing.getPropertyValue("--oyt-expanded-height"));
    expect(height).toBeCloseTo(innerHeight - 56);
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
  it("retains the full stage height for ultrawide media", async () => {
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
    ).toBeCloseTo(innerHeight);
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
  it.each([false, true])(
    "hands expansion back to native mode when theater was %s",
    async (initialTheater) => {
      vi.useFakeTimers();
      watch.toggleAttribute("theater", initialTheater);
      port.toggle();
      // A native mutation queued before entering expand must not cancel it.
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(40);
      expect(watch.hasAttribute("data-oyt-expanded")).toBe(true);
      const states: boolean[] = [];
      const unsubscribe = port.subscribe((state) =>
        states.push(state.expanded),
      );
      watch.toggleAttribute("theater", !initialTheater);
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(40);
      expect(watch.hasAttribute("data-oyt-expanded")).toBe(false);
      expect(watch.hasAttribute("theater")).toBe(!initialTheater);
      expect(states.at(-1)).toBe(false);
      port.toggle();
      expect(watch.hasAttribute("data-oyt-expanded")).toBe(true);
      unsubscribe();
      vi.useRealTimers();
    },
  );
  it("leaves expand active when T does not change the native mode", async () => {
    vi.useFakeTimers();
    port.toggle();
    const input = document.createElement("input");
    document.body.append(input);
    const key = new KeyboardEvent("keydown", {
      key: "t",
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(key);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(40);
    expect(key.defaultPrevented).toBe(false);
    expect(watch.hasAttribute("data-oyt-expanded")).toBe(true);
    vi.useRealTimers();
  });
  it("lets native T handling switch modes while the expand button holds shadow focus", async () => {
    vi.useFakeTimers();
    const host = document.createElement("div");
    const container = document.createElement("div");
    host.attachShadow({ mode: "open" }).append(container);
    document.body.append(host);
    const player = createPlayer(document);
    const unmount = mountToolbar(container, player, [expandPlayer(port)]);
    const trigger = container.querySelector<HTMLButtonElement>(
      '[aria-label="Expand video"]',
    )!;
    const nativeKeydown = (event: KeyboardEvent) => {
      if (event.key === "t") watch.toggleAttribute("theater");
    };
    const nativeKeyup = vi.fn();
    document.addEventListener("keydown", nativeKeydown);
    document.addEventListener("keyup", nativeKeyup);
    try {
      trigger.click();
      trigger.focus();
      expect(host.shadowRoot!.activeElement).toBe(trigger);
      trigger.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "t",
          bubbles: true,
          composed: true,
        }),
      );
      trigger.dispatchEvent(
        new KeyboardEvent("keyup", { key: "t", bubbles: true, composed: true }),
      );
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(40);
      expect(watch.hasAttribute("theater")).toBe(true);
      expect(watch.hasAttribute("data-oyt-expanded")).toBe(false);
      expect(trigger.getAttribute("aria-pressed")).toBe("false");
      expect(nativeKeyup).toHaveBeenCalledOnce();
    } finally {
      document.removeEventListener("keydown", nativeKeydown);
      document.removeEventListener("keyup", nativeKeyup);
      unmount();
      player.dispose();
      vi.useRealTimers();
    }
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
