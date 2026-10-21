import { findVideo } from "./player";

export function captureScreenshot(doc: Document) {
  const video = findVideo(doc);
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight)
    throw new Error(
      "The video frame is not ready. Try again after playback starts.",
    );
  const canvas = doc.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Screenshot capture is unavailable.");
  try {
    context.drawImage(video, 0, 0);
    const url = canvas.toDataURL("image/png");
    if (!url.startsWith("data:image/png;base64,"))
      throw new Error("Empty image");
    const id =
      new URL(doc.URL).searchParams.get("v")?.replace(/[^a-zA-Z0-9_-]/g, "") ||
      "video";
    const time = Math.floor(video.currentTime * 1000);
    return { url, filename: `youtube-${id}-${time}ms.png` };
  } catch {
    throw new Error(
      "This video cannot be captured. It may be protected or restrict screenshots.",
    );
  }
}
