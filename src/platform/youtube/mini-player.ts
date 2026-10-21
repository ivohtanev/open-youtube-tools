import type { MiniPlayerPort, MiniPlayerSnapshot } from "../../core/contracts";
import { findVideo } from "./player";

/** Float the existing video in place so YouTube retains ownership and one decoder. */
export function createMiniPlayer(
  doc: Document,
  initialEnabled = true,
): MiniPlayerPort & { dispose(): void } {
  const win = doc.defaultView!;
  let enabled = initialEnabled;
  let disposed = false;
  let navigating = false;
  let frame = 0;
  let video: HTMLVideoElement | null = null;
  let movie: HTMLElement | null = null;
  let active = false;
  const listeners = new Set<(state: MiniPlayerSnapshot) => void>();
  const style = doc.createElement("style");
  // Important rules override YouTube's inline sizing without changing its values.
  style.textContent = `
    #movie_player[data-oyt-mini-player-active] {
      z-index: 2147483644 !important;
    }
    #movie_player video[data-oyt-mini-player] {
      position: fixed !important;
      top: 12px !important;
      left: 12px !important;
      right: auto !important;
      bottom: auto !important;
      width: 25vw !important;
      height: 14.0625vw !important;
      min-width: 0 !important;
      min-height: 0 !important;
      max-width: none !important;
      max-height: none !important;
      margin: 0 !important;
      transform: none !important;
      object-fit: contain !important;
      background: #000 !important;
      z-index: 2147483644 !important;
      pointer-events: none !important;
    }
  `;
  doc.head.append(style);
  const snapshot = (): MiniPlayerSnapshot => ({
    active,
    paused: video?.paused ?? true,
    progress:
      video && Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(1, Math.max(0, video.currentTime / video.duration))
        : 0,
  });
  const emit = () => listeners.forEach((listener) => listener(snapshot()));
  const restore = () => {
    video?.removeAttribute("data-oyt-mini-player");
    movie?.removeAttribute("data-oyt-mini-player-active");
    active = false;
  };
  const mediaEvents = [
    "play",
    "pause",
    "ended",
    "timeupdate",
    "durationchange",
    "loadedmetadata",
    "emptied",
  ];
  const resize =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
  function update() {
    win.cancelAnimationFrame(frame);
    frame = 0;
    if (disposed) return;
    const next = findVideo(doc);
    const nextMovie = next?.closest<HTMLElement>("#movie_player") ?? null;
    if (next !== video || nextMovie !== movie) {
      restore();
      mediaEvents.forEach((name) => video?.removeEventListener(name, emit));
      video?.removeEventListener("enterpictureinpicture", update);
      video?.removeEventListener("leavepictureinpicture", update);
      video = next;
      movie = nextMovie;
      mediaEvents.forEach((name) => video?.addEventListener(name, emit));
      video?.addEventListener("enterpictureinpicture", update);
      video?.addEventListener("leavepictureinpicture", update);
      resize?.disconnect();
      if (movie) resize?.observe(movie);
    }
    const rect = movie?.getBoundingClientRect();
    active = !!(
      enabled &&
      !navigating &&
      video &&
      rect &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom <= 0 &&
      rect.right > 0 &&
      rect.left < win.innerWidth &&
      !doc.fullscreenElement &&
      !doc.pictureInPictureElement
    );
    video?.toggleAttribute("data-oyt-mini-player", active);
    movie?.toggleAttribute("data-oyt-mini-player-active", active);
    emit();
  }
  function schedule() {
    if (!frame && !disposed) frame = win.requestAnimationFrame(update);
  }
  const startNavigation = () => {
    navigating = true;
    restore();
    emit();
  };
  const finishNavigation = () => {
    navigating = false;
    update();
  };
  const mutations = new MutationObserver(schedule);
  mutations.observe(doc.documentElement, { childList: true, subtree: true });
  doc.addEventListener("yt-navigate-start", startNavigation);
  doc.addEventListener("yt-navigate-finish", finishNavigation);
  doc.addEventListener("fullscreenchange", update);
  win.addEventListener("scroll", schedule, true);
  win.addEventListener("resize", schedule);
  win.addEventListener("popstate", finishNavigation);
  update();
  return {
    setEnabled(value) {
      enabled = value;
      update();
    },
    togglePlayback() {
      update();
      if (!active || !video) return;
      if (video.paused) void video.play().catch(console.warn);
      else video.pause();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      disposed = true;
      win.cancelAnimationFrame(frame);
      mutations.disconnect();
      resize?.disconnect();
      restore();
      emit();
      mediaEvents.forEach((name) => video?.removeEventListener(name, emit));
      video?.removeEventListener("enterpictureinpicture", update);
      video?.removeEventListener("leavepictureinpicture", update);
      doc.removeEventListener("yt-navigate-start", startNavigation);
      doc.removeEventListener("yt-navigate-finish", finishNavigation);
      doc.removeEventListener("fullscreenchange", update);
      win.removeEventListener("scroll", schedule, true);
      win.removeEventListener("resize", schedule);
      win.removeEventListener("popstate", finishNavigation);
      listeners.clear();
      style.remove();
      video = null;
    },
  };
}
