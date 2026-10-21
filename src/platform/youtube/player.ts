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
  let clearNotice: (() => void) | undefined;
  // YouTube exposes no public bezel API. Reuse its existing speed text and
  // presentation layer without synthesizing shortcuts or changing speed twice.
  const showSpeedNotice = (rate: number) => {
    clearNotice?.();
    const movie = video?.closest("#movie_player");
    const text = movie?.querySelector<HTMLElement>(".ytp-bezel-text");
    const layer = text?.parentElement?.parentElement;
    const bezel = layer?.querySelector<HTMLElement>(".ytp-bezel");
    if (!text || !layer || !bezel) return;
    const previousText = text.textContent;
    const previousBezelDisplay = bezel.style.display;
    const textHidden = layer.classList.contains("ytp-bezel-text-hide");
    const label = `${rate}x`;
    text.textContent = label;
    // The last native icon may be pause, volume, etc.; show only the speed text.
    bezel.style.display = "none";
    layer.classList.remove("ytp-bezel-text-hide");
    layer.style.display = "";
    const timer = setTimeout(() => clearNotice?.(), 650);
    clearNotice = () => {
      clearTimeout(timer);
      // A native action may have taken ownership of the same notification.
      if (text.textContent === label && bezel.style.display === "none") {
        text.textContent = previousText;
        layer.style.display = "none";
        layer.classList.toggle("ytp-bezel-text-hide", textHidden);
      }
      if (bezel.style.display === "none")
        bezel.style.display = previousBezelDisplay;
      clearNotice = undefined;
    };
  };
  const dismissNotice = () => clearNotice?.();
  const listeners = new Set<(state: PlayerSnapshot) => void>();
  const snapshot = (): PlayerSnapshot => ({
    available: video !== null,
    playbackRate: video?.playbackRate ?? 1,
  });
  const emit = () => listeners.forEach((listener) => listener(snapshot()));
  const refresh = () => {
    const next = findVideo(doc);
    if (next === video) return;
    dismissNotice();
    video?.removeEventListener("ratechange", emit);
    video?.removeEventListener("play", dismissNotice);
    video?.removeEventListener("pause", dismissNotice);
    video = next;
    video?.addEventListener("ratechange", emit);
    video?.addEventListener("play", dismissNotice);
    video?.addEventListener("pause", dismissNotice);
    emit();
  };
  const observer = new MutationObserver(refresh);
  observer.observe(doc.documentElement, { childList: true, subtree: true });
  doc.addEventListener("yt-navigate-finish", refresh);
  doc.addEventListener("keydown", dismissNotice, true);
  doc.addEventListener("pointerdown", dismissNotice, true);
  doc.defaultView?.addEventListener("popstate", refresh);
  refresh();
  return {
    snapshot,
    setPlaybackRate(rate) {
      refresh();
      if (!Number.isFinite(rate) || rate < 0.25 || rate > 2) return;
      if (video && video.playbackRate !== rate) {
        video.playbackRate = rate;
        showSpeedNotice(video.playbackRate);
        emit();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    dispose() {
      dismissNotice();
      observer.disconnect();
      doc.removeEventListener("yt-navigate-finish", refresh);
      doc.removeEventListener("keydown", dismissNotice, true);
      doc.removeEventListener("pointerdown", dismissNotice, true);
      doc.defaultView?.removeEventListener("popstate", refresh);
      video?.removeEventListener("ratechange", emit);
      video?.removeEventListener("play", dismissNotice);
      video?.removeEventListener("pause", dismissNotice);
      listeners.clear();
      video = null;
    },
  };
}
