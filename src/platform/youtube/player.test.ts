import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayer } from "./player";

describe("YouTube player lifecycle", () => {
  let player: ReturnType<typeof createPlayer>;
  beforeEach(() => {
    history.replaceState(null, "", "/watch?v=example");
    document.body.innerHTML =
      '<div id="movie_player"><video class="html5-main-video"></video></div>';
    player = createPlayer(document);
  });
  afterEach(() => {
    player.dispose();
    vi.useRealTimers();
    document.body.replaceChildren();
  });
  it("updates the active video and rejects unsupported values", () => {
    player.setPlaybackRate(1.5);
    expect(document.querySelector("video")?.playbackRate).toBe(1.5);
    for (const rate of [0, 3, NaN, Infinity]) player.setPlaybackRate(rate);
    expect(player.snapshot().playbackRate).toBe(1.5);
  });
  it("reflects native changes and switches listeners when a video is replaced", async () => {
    const states: number[] = [];
    player.subscribe((state) => states.push(state.playbackRate));
    const old = document.querySelector("video")!;
    old.playbackRate = 1.75;
    old.dispatchEvent(new Event("ratechange"));
    expect(states.at(-1)).toBe(1.75);
    const next = document.createElement("video");
    next.className = "html5-main-video";
    old.replaceWith(next);
    await Promise.resolve();
    player.setPlaybackRate(1.25);
    expect(next.playbackRate).toBe(1.25);
    expect(old.playbackRate).toBe(1.75);
    const count = states.length;
    old.dispatchEvent(new Event("ratechange"));
    expect(states).toHaveLength(count);
  });
  it("ignores previews off watch pages and recovers on return", () => {
    history.pushState(null, "", "/");
    document.dispatchEvent(new Event("yt-navigate-finish"));
    expect(player.snapshot().available).toBe(false);
    history.pushState(null, "", "/watch?v=second");
    window.dispatchEvent(new Event("popstate"));
    expect(player.snapshot().available).toBe(true);
  });
  it("cleans up subscriptions and observers", async () => {
    let calls = 0;
    player.subscribe(() => calls++);
    player.dispose();
    document.querySelector("video")!.dispatchEvent(new Event("ratechange"));
    document.body.replaceChildren();
    await Promise.resolve();
    expect(calls).toBe(1);
  });
  it("reuses native speed text, replaces rapid notices, and yields to native actions", () => {
    vi.useFakeTimers();
    document
      .querySelector("#movie_player")!
      .insertAdjacentHTML(
        "beforeend",
        '<div class="ytp-bezel-text-hide" style="display:none"><div class="ytp-bezel-text-wrapper"><div class="ytp-bezel-text">old</div></div><div class="ytp-bezel"><div class="ytp-bezel-icon">pause</div></div></div>',
      );
    const text = document.querySelector<HTMLElement>(".ytp-bezel-text")!;
    const layer = text.parentElement!.parentElement!;
    const bezel = document.querySelector<HTMLElement>(".ytp-bezel")!;
    player.setPlaybackRate(1.02);
    expect(text.textContent).toBe("1.02x");
    expect(layer.style.display).toBe("");
    expect(bezel.style.display).toBe("none");
    vi.advanceTimersByTime(400);
    player.setPlaybackRate(1.04);
    vi.advanceTimersByTime(400);
    expect(text.textContent).toBe("1.04x");
    expect(layer.style.display).toBe("");
    vi.advanceTimersByTime(250);
    expect(layer.style.display).toBe("none");
    expect(bezel.style.display).toBe("");
    expect(text.textContent).toBe("old");
    player.setPlaybackRate(1);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
    expect(layer.style.display).toBe("none");
    player.setPlaybackRate(1.02);
    text.textContent = "native action";
    vi.advanceTimersByTime(650);
    expect(text.textContent).toBe("native action");
    expect(layer.style.display).toBe("");
    player.setPlaybackRate(1);
    player.dispose();
    expect(layer.style.display).toBe("none");
    vi.runOnlyPendingTimers();
    expect(layer.style.display).toBe("none");
    expect(vi.getTimerCount()).toBe(0);
  });
});
