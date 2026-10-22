import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createVideoFilters } from "./video-filters";
import {
  DEFAULT_VIDEO_FILTERS,
  parseVideoFilters,
} from "../../core/video-filters";

let filters: ReturnType<typeof createVideoFilters>;
let video: HTMLVideoElement;
beforeEach(() => {
  history.replaceState(null, "", "/watch?v=test");
  document.body.innerHTML =
    '<div id="movie_player"><video class="html5-main-video"></video></div>';
  video = document.querySelector("video")!;
});
afterEach(() => {
  filters?.dispose();
  vi.useRealTimers();
  document.body.replaceChildren();
});

it("validates saved settings, clamps finite values and rejects non-numeric input", () => {
  expect(
    parseVideoFilters({
      brightness: Infinity,
      contrast: -20,
      saturation: "150",
      zoom: 1000,
      mirror: "true",
    }),
  ).toEqual({
    brightness: 100,
    contrast: 50,
    saturation: 100,
    zoom: 150,
    mirror: false,
  });
  expect(parseVideoFilters(null)).toEqual(DEFAULT_VIDEO_FILTERS);
});

it("starts off, composes basic filters and bypasses without losing settings", () => {
  filters = createVideoFilters(document);
  filters.setValue("brightness", 115);
  filters.setValue("contrast", 110);
  filters.setValue("saturation", 125);
  expect(video.style.filter).toBe("");
  filters.setEnabled(true);
  expect(video.style.filter).toBe(
    "brightness(115%) contrast(110%) saturate(125%)",
  );
  filters.setEnabled(false);
  expect(video.style.filter).toBe("");
  filters.setEnabled(true);
  filters.reset();
  expect(video.style.filter).toBe("");
  expect(filters.snapshot().enabled).toBe(true);
});

it("restores styles and priorities but preserves another actor's later changes", () => {
  video.style.setProperty("filter", "contrast(80%)", "important");
  video.style.setProperty("scale", "0.9");
  video.style.setProperty("clip-path", "inset(2%)");
  filters = createVideoFilters(document, {
    enabled: true,
    settings: { brightness: 120, zoom: 125, mirror: true },
  });
  expect(video.style.scale).toBe("-1.25 1.25");
  expect(video.style.clipPath).toContain("inset(");
  filters.setEnabled(false);
  expect(video.style.scale).toBe("0.9");
  expect(video.style.clipPath).toBe("inset(2%)");
  expect(video.style.filter).toBe("contrast(80%)");
  expect(video.style.getPropertyPriority("filter")).toBe("important");
  filters.setEnabled(true);
  video.style.setProperty("filter", "brightness(90%)");
  filters.dispose();
  expect(video.style.filter).toBe("brightness(90%)");
  expect(video.style.scale).toBe("0.9");
});

it("releases replacements and off-route videos, then reapplies saved settings", async () => {
  filters = createVideoFilters(document, {
    enabled: true,
    settings: { brightness: 110 },
  });
  const replacement = video.cloneNode() as HTMLVideoElement;
  replacement.removeAttribute("style");
  video.replaceWith(replacement);
  await Promise.resolve();
  expect(video.style.filter).toBe("");
  expect(replacement.style.filter).toBe("brightness(110%)");
  history.pushState(null, "", "/watch?v=next");
  document.dispatchEvent(new Event("yt-navigate-finish"));
  expect(replacement.style.filter).toBe("brightness(110%)");
  history.pushState(null, "", "/shorts/test");
  window.dispatchEvent(new Event("popstate"));
  expect(replacement.style.filter).toBe("");
  expect(filters.snapshot().available).toBe(false);
  history.pushState(null, "", "/watch?v=next");
  document.dispatchEvent(new Event("yt-navigate-finish"));
  expect(replacement.style.filter).toBe("brightness(110%)");
});

it("debounces settings and flushes on pagehide/disposal", () => {
  vi.useFakeTimers();
  const persistSettings = vi.fn();
  const persistEnabled = vi.fn();
  filters = createVideoFilters(document, { persistSettings, persistEnabled });
  filters.setEnabled(true);
  filters.setValue("brightness", 110);
  filters.setValue("brightness", 111);
  expect(persistSettings).not.toHaveBeenCalled();
  vi.advanceTimersByTime(200);
  expect(persistSettings).toHaveBeenCalledTimes(1);
  expect(persistSettings.mock.calls[0]![0].brightness).toBe(111);
  filters.setMirror(true);
  window.dispatchEvent(new Event("pagehide"));
  expect(persistSettings).toHaveBeenCalledTimes(2);
  filters.setValue("zoom", 120);
  filters.dispose();
  expect(persistSettings).toHaveBeenCalledTimes(3);
  expect(persistEnabled).toHaveBeenCalledWith(true);
  filters.setValue("brightness", 130);
  vi.advanceTimersByTime(500);
  expect(persistSettings).toHaveBeenCalledTimes(3);
  filters = createVideoFilters(document, {
    enabled: true,
    settings: persistSettings.mock.calls[2]![0],
  });
  expect(video.style.filter).toBe("brightness(111%)");
  expect(video.style.scale).toBe("-1.2 1.2");
});
