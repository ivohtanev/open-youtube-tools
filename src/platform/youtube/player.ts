import type { PlayerPort, PlayerSnapshot } from "../../core/contracts";

// Keep all site-specific selectors and route assumptions in this adapter.
export function findVideo(doc: Document): HTMLVideoElement | null {
  if (doc.location.pathname !== "/watch") return null;
  return doc.querySelector<HTMLVideoElement>(
    "#movie_player video.html5-main-video",
  );
}

export function createPlayer(doc: Document): PlayerPort & { dispose(): void } {
  let video: HTMLVideoElement | null = null;
  const listeners = new Set<(state: PlayerSnapshot) => void>();
  const snapshot = (): PlayerSnapshot => ({
    available: video !== null,
    playbackRate: video?.playbackRate ?? 1,
  });
  const emit = () => listeners.forEach((listener) => listener(snapshot()));
  const refresh = () => {
    const next = findVideo(doc);
    if (next === video) return;
    video?.removeEventListener("ratechange", emit);
    video = next;
    video?.addEventListener("ratechange", emit);
    emit();
  };
  const observer = new MutationObserver(refresh);
  observer.observe(doc.documentElement, { childList: true, subtree: true });
  doc.addEventListener("yt-navigate-finish", refresh);
  doc.defaultView?.addEventListener("popstate", refresh);
  refresh();
  return {
    snapshot,
    setPlaybackRate(rate) {
      refresh();
      if (!Number.isFinite(rate) || rate < 0.25 || rate > 2) return;
      if (video) {
        video.playbackRate = rate;
        emit();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    dispose() {
      observer.disconnect();
      doc.removeEventListener("yt-navigate-finish", refresh);
      doc.defaultView?.removeEventListener("popstate", refresh);
      video?.removeEventListener("ratechange", emit);
      listeners.clear();
      video = null;
    },
  };
}
