import { afterEach, expect, it } from "vitest";
import { createPlayer } from "../../platform/youtube/player";
import { mountToolbar } from "../../toolbar/mount";
import { playbackSpeed, stepSpeed } from "./index";

afterEach(() => document.body.replaceChildren());

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
  expect(player.snapshot().playbackRate).toBe(1.05);
  faster.click();
  expect(player.snapshot().playbackRate).toBe(1.25);
  trigger.dispatchEvent(new WheelEvent("wheel", { deltaY: 1 }));
  slower.click();
  expect(player.snapshot().playbackRate).toBe(1);
  button("Expand playback speed controls").click();
  expect(
    container.querySelector(".reveal")!.classList.contains("expanded"),
  ).toBe(true);
  for (let i = 0; i < 10; i++) faster.click();
  expect(player.snapshot().playbackRate).toBe(2);
  expect(faster.disabled).toBe(true);
  for (let i = 0; i < 10; i++) slower.click();
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
