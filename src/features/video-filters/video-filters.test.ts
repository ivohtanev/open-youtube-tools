import { afterEach, beforeEach, expect, it } from "vitest";
import { videoFilters } from "./index";
import { createVideoFilters } from "../../platform/youtube/video-filters";
import { createPlayer } from "../../platform/youtube/player";

let filters: ReturnType<typeof createVideoFilters>;
let player: ReturnType<typeof createPlayer>;
let unmount: () => void;
const button = (label: string) =>
  document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
beforeEach(() => {
  history.replaceState(null, "", "/watch?v=test");
  document.body.innerHTML =
    '<div id="movie_player"><video class="html5-main-video"></video></div>';
  player = createPlayer(document);
  filters = createVideoFilters(document);
  unmount = videoFilters(filters).mount(document.body, player);
});
afterEach(() => {
  unmount();
  filters.dispose();
  player.dispose();
  document.body.replaceChildren();
});
it("supports horizontal sliders, bounded wheel steps, zoom modifiers, mirror and reset", () => {
  const input = document.querySelector<HTMLInputElement>(
    '[aria-label="Brightness"]',
  )!;
  expect(input.getAttribute("aria-orientation")).toBe("horizontal");
  button("Enable video filters").click();
  const wheel = new WheelEvent("wheel", { deltaY: -100, cancelable: true });
  input.dispatchEvent(wheel);
  expect(wheel.defaultPrevented).toBe(true);
  expect(filters.snapshot().settings.brightness).toBe(101);
  const zoom = new WheelEvent("wheel", {
    deltaY: -100,
    ctrlKey: true,
    cancelable: true,
  });
  input.dispatchEvent(zoom);
  expect(zoom.defaultPrevented).toBe(false);
  expect(input.value).toBe("101");
  filters.setValue("brightness", 150);
  input.dispatchEvent(new WheelEvent("wheel", { deltaY: -1 }));
  expect(input.value).toBe("150");
  input.dispatchEvent(new MouseEvent("dblclick"));
  expect(input.value).toBe("100");
  input.value = "120";
  input.dispatchEvent(new Event("input"));
  expect(filters.snapshot().settings.brightness).toBe(120);
  button("Mirror horizontally").click();
  expect(filters.snapshot().settings.mirror).toBe(true);
  button("Reset all video filters").click();
  expect(filters.snapshot().settings.brightness).toBe(100);
  expect(filters.snapshot().settings.mirror).toBe(false);
});
it("keeps adjustments active on dismissal and unmount", () => {
  filters.setEnabled(true);
  filters.setValue("brightness", 120);
  button("Video filters").click();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(
    document.querySelector<HTMLElement>(".video-filters-panel")!.hidden,
  ).toBe(true);
  expect(document.querySelector("video")!.style.filter).toBe(
    "brightness(120%)",
  );
  unmount();
  expect(filters.snapshot().enabled).toBe(true);
  expect(document.querySelector("video")!.style.filter).toBe(
    "brightness(120%)",
  );
  expect(document.querySelector(".video-filters-panel")).toBeNull();
});
