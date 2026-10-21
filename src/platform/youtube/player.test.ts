import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
});
