import { defineBackground } from "wxt/utils/define-background";
import { browser } from "wxt/browser";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message?.type !== "save-video-screenshot") return;
    if (
      !sender.url?.startsWith("https://www.youtube.com/") ||
      typeof message.url !== "string" ||
      !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(message.url) ||
      typeof message.filename !== "string" ||
      !/^youtube-[a-zA-Z0-9_-]+-\d+ms\.png$/.test(message.filename)
    )
      return { error: "Invalid screenshot request." };
    try {
      await browser.downloads.download({
        url: message.url,
        filename: message.filename,
        saveAs: true,
      });
      return { ok: true };
    } catch (error) {
      // Closing the native Save As dialog is a normal cancellation.
      if (error instanceof Error && /cancel/i.test(error.message))
        return { ok: true };
      return {
        error: "Could not open the screenshot save dialog. Please try again.",
      };
    }
  });
});
