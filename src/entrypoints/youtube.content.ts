import { defineContentScript } from "wxt/utils/define-content-script";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { createPlayer } from "../platform/youtube/player";
import { playbackSpeed } from "../features/playback-speed";
import { mountToolbar } from "../toolbar/mount";
import "../toolbar/style.css";

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  runAt: "document_idle",
  cssInjectionMode: "ui",
  async main(ctx) {
    const player = createPlayer(document);
    ctx.onInvalidated(() => player.dispose());
    const ui = await createShadowRootUi(ctx, {
      name: "open-youtube-tools",
      position: "inline",
      anchor: "body",
      onMount: (container) => mountToolbar(container, player, [playbackSpeed]),
      onRemove: (dispose) => dispose?.(),
    });
    if (!ctx.isInvalid) ui.mount();
  },
});
