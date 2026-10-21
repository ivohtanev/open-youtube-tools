import { beforeEach, expect, it, vi } from "vitest";

const { addListener, download } = vi.hoisted(() => ({
  addListener: vi.fn(),
  download: vi.fn(),
}));
vi.mock("wxt/browser", () => ({
  browser: { runtime: { onMessage: { addListener } }, downloads: { download } },
}));
import background from "../../entrypoints/background";

const image = {
  type: "save-video-screenshot",
  url: "data:image/png;base64,YWJj",
  filename: "youtube-abc-1000ms.png",
};
let receive: (message: unknown, sender: { url: string }) => Promise<unknown>;
beforeEach(() => {
  download.mockReset();
  background.main();
  receive = addListener.mock.lastCall![0];
});
it("opens Save As with the captured PNG and suggested filename", async () => {
  expect(
    await receive(image, { url: "https://www.youtube.com/watch?v=abc" }),
  ).toEqual({ ok: true });
  expect(download).toHaveBeenCalledWith({
    url: image.url,
    filename: image.filename,
    saveAs: true,
  });
});
it("rejects unexpected origins, remote URLs and unsafe filenames", async () => {
  for (const [message, url] of [
    [image, "https://example.com/"],
    [
      { ...image, url: "https://example.com/image.png" },
      "https://www.youtube.com/watch",
    ],
    [{ ...image, filename: "../image.png" }, "https://www.youtube.com/watch"],
  ] as const) {
    expect(await receive(message, { url })).toHaveProperty("error");
  }
  expect(download).not.toHaveBeenCalled();
});
it("handles cancellation and reports other download failures", async () => {
  download.mockRejectedValueOnce(new Error("User canceled"));
  expect(
    await receive(image, { url: "https://www.youtube.com/watch" }),
  ).toEqual({ ok: true });
  download.mockRejectedValueOnce(new Error("Download failed"));
  expect(
    await receive(image, { url: "https://www.youtube.com/watch" }),
  ).toHaveProperty("error");
});
