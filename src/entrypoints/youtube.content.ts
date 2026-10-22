import { defineContentScript } from "wxt/utils/define-content-script";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { browser } from "wxt/browser";
import { positionToolbar } from "../platform/youtube/toolbar-layout";
import { createPlayer } from "../platform/youtube/player";
import { playbackSpeed } from "../features/playback-speed";
import { equalizer } from "../features/equalizer";
import { createEqualizer } from "../platform/youtube/equalizer";
import { expandPlayer } from "../features/expand-player";
import { cinema } from "../features/cinema";
import { screenshot } from "../features/screenshot";
import { createCinema } from "../platform/youtube/cinema";
import { captureScreenshot } from "../platform/youtube/screenshot";
import { createExpandPlayer } from "../platform/youtube/expand-player";
import { createMiniPlayer } from "../platform/youtube/mini-player";
import { mountMiniPlayer } from "../features/mini-player";
import { mountToolbar } from "../toolbar/mount";
import "../toolbar/style.css";

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  runAt: "document_idle",
  cssInjectionMode: "ui",
  async main(ctx) {
    const player = createPlayer(document);
    const expandedPlayer = createExpandPlayer(document);
    ctx.onInvalidated(() => expandedPlayer.dispose());
    ctx.onInvalidated(() => player.dispose());
    const saved = await browser.storage.local
      .get([
        "toolbarPosition",
        "hiddenTools",
        "miniPlayerEnabled",
        "equalizerGains",
      ])
      .catch(() => ({}) as Record<string, unknown>);
    if (ctx.isInvalid) return;
    const audio = createEqualizer(
      document,
      saved.equalizerGains,
      (equalizerGains) => {
        void browser.storage.local.set({ equalizerGains }).catch(console.warn);
      },
    );
    ctx.onInvalidated(() => audio.dispose());
    const miniPlayer = createMiniPlayer(
      document,
      saved.miniPlayerEnabled !== false,
    );
    ctx.onInvalidated(() => miniPlayer.dispose());
    // A separate body host stays outside the toolbar's fullscreen/docking moves.
    const miniUi = await createShadowRootUi(ctx, {
      name: "open-youtube-mini-player",
      position: "inline",
      anchor: "body",
      onMount: (container) => mountMiniPlayer(container, miniPlayer),
      onRemove: (dispose) => dispose?.(),
    });
    if (ctx.isInvalid) return;
    miniUi.mount();
    const ui = await createShadowRootUi(ctx, {
      name: "open-youtube-tools",
      position: "inline",
      anchor: "body",
      onMount: (container) =>
        mountToolbar(
          container,
          player,
          [
            playbackSpeed,
            equalizer(audio),
            expandPlayer(expandedPlayer),
            cinema((toolbar, onChange) =>
              createCinema(document, toolbar, onChange),
            ),
            screenshot(async () => {
              const image = captureScreenshot(document);
              const result = await browser.runtime.sendMessage({
                type: "save-video-screenshot",
                ...image,
              });
              if (!result?.ok)
                throw new Error(
                  result?.error ??
                    "Could not save screenshot. Please try again.",
                );
            }),
          ],
          {
            miniPlayerEnabled: saved.miniPlayerEnabled !== false,
            onMiniPlayerEnabledChange: (miniPlayerEnabled) => {
              miniPlayer.setEnabled(miniPlayerEnabled);
              void browser.storage.local
                .set({ miniPlayerEnabled })
                .catch(console.warn);
            },
            createLayout: (toolbar) =>
              positionToolbar(
                toolbar,
                (container.getRootNode() as ShadowRoot).host as HTMLElement,
                saved.toolbarPosition === "bottom" ? "bottom" : "player",
              ),
            position: saved.toolbarPosition === "bottom" ? "bottom" : "player",
            hiddenTools: Array.isArray(saved.hiddenTools)
              ? saved.hiddenTools.filter(
                  (id): id is string => typeof id === "string",
                )
              : [],
            onHiddenToolsChange: (hiddenTools) => {
              void browser.storage.local
                .set({ hiddenTools })
                .catch(console.warn);
            },
            onPositionChange: (toolbarPosition) => {
              void browser.storage.local
                .set({ toolbarPosition })
                .catch(console.warn);
            },
          },
        ),
      onRemove: (dispose) => dispose?.(),
    });
    if (!ctx.isInvalid) ui.mount();
  },
});
