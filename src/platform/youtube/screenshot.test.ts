import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { captureScreenshot } from "./screenshot";

let video: HTMLVideoElement;
let draw: ReturnType<typeof vi.fn>;
beforeEach(() => {
  history.replaceState(null, "", "/watch?v=abc_123");
  document.body.innerHTML =
    '<div id="movie_player"><video class="html5-main-video"></video></div>';
  video = document.querySelector("video")!;
  Object.defineProperties(video, {
    videoWidth: { configurable: true, value: 1920 },
    videoHeight: { value: 1080 },
    readyState: { configurable: true, value: 2 },
  });
  video.currentTime = 12.345;
  draw = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: draw,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(
    function (this: HTMLCanvasElement) {
      expect(this.width).toBe(1920);
      expect(this.height).toBe(1080);
      return "data:image/png;base64,YWJj";
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});
it("captures the current video frame at native resolution with a portable filename", () => {
  expect(captureScreenshot(document)).toEqual({
    url: "data:image/png;base64,YWJj",
    filename: "youtube-abc_123-12345ms.png",
  });
  expect(draw).toHaveBeenCalledWith(video, 0, 0);
  expect(video.currentTime).toBe(12.345);
  expect(video.paused).toBe(true);
});
it("rejects unavailable frames and unsupported routes", () => {
  Object.defineProperty(video, "readyState", { value: 1 });
  expect(() => captureScreenshot(document)).toThrow("not ready");
  history.replaceState(null, "", "/shorts/abc");
  expect(() => captureScreenshot(document)).toThrow("not ready");
  expect(draw).not.toHaveBeenCalled();
});
it("explains canvas security failures without exporting a blank image", () => {
  draw.mockImplementation(() => {
    throw new DOMException("Tainted canvas", "SecurityError");
  });
  expect(() => captureScreenshot(document)).toThrow("protected");
  expect(HTMLCanvasElement.prototype.toDataURL).not.toHaveBeenCalled();
});
