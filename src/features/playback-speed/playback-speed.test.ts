import { afterEach, expect, it } from "vitest";
import { createPlayer } from "../../platform/youtube/player";
import { mountToolbar } from "../../toolbar/mount";
import { playbackSpeed } from "./index";

afterEach(() => document.body.replaceChildren());

it("supports speed changes, boundaries, reset, route visibility and teardown", () => {
  history.replaceState(null, "", "/watch?v=test");
  document.body.innerHTML =
    '<div id="movie_player"><video class="html5-main-video"></video></div>';
  const player = createPlayer(document);
  const container = document.createElement("div");
  document.body.append(container);
  const dispose = mountToolbar(container, player, [playbackSpeed]);
  const [slower, reset, faster] = Array.from(
    container.querySelectorAll("button"),
  );
  faster!.click();
  expect(player.snapshot().playbackRate).toBe(1.25);
  expect(reset!.textContent).toBe("1.25×");
  for (let i = 0; i < 10; i++) faster!.click();
  expect(player.snapshot().playbackRate).toBe(2);
  expect(faster!.disabled).toBe(true);
  for (let i = 0; i < 10; i++) slower!.click();
  expect(player.snapshot().playbackRate).toBe(0.25);
  expect(slower!.disabled).toBe(true);
  reset!.click();
  expect(player.snapshot().playbackRate).toBe(1);
  history.pushState(null, "", "/shorts/test");
  document.dispatchEvent(new Event("yt-navigate-finish"));
  expect(container.querySelector("section")!.hidden).toBe(true);
  expect(reset!.disabled).toBe(true);
  dispose();
  player.dispose();
  expect(container.childElementCount).toBe(0);
});
