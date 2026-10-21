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
  let top = 12;
  let left = 12;
  let guideMotionUntil = 0;
  let guideContent: HTMLElement | null = null;
  let header: HTMLElement | null = null;
  let restorePopover: (() => void) | undefined;
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
      border: 0 !important;
      padding: 0 !important;
      transform: none !important;
      object-fit: contain !important;
      background: #000 !important;
      opacity: 1 !important;
      mix-blend-mode: normal !important;
      z-index: 2147483644 !important;
      pointer-events: none !important;
    }
  `;
  doc.head.append(style);
  const videoRule = style.sheet!.cssRules[1] as CSSStyleRule;
  const snapshot = (): MiniPlayerSnapshot => ({
    active,
    top,
    left,
    paused: video?.paused ?? true,
    progress:
      video && Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(1, Math.max(0, video.currentTime / video.duration))
        : 0,
  });
  const emit = () => listeners.forEach((listener) => listener(snapshot()));
  const restore = () => {
    restorePopover?.();
    restorePopover = undefined;
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
      if (header) resize?.observe(header);
      if (guideContent) resize?.observe(guideContent);
    }
    const nextHeader = doc.querySelector<HTMLElement>(
      "#masthead-container, ytd-masthead",
    );
    if (nextHeader !== header) {
      if (header) resize?.unobserve(header);
      header = nextHeader;
      if (header) resize?.observe(header);
    }
    const headerRect = header?.getBoundingClientRect();
    const headerStyle = header ? win.getComputedStyle(header) : null;
    const headerBottom =
      headerRect &&
      headerRect.height > 0 &&
      headerRect.top < win.innerHeight &&
      headerStyle?.display !== "none" &&
      headerStyle?.visibility !== "hidden" &&
      headerStyle?.opacity !== "0"
        ? Math.max(0, headerRect.bottom)
        : 0;
    top = headerBottom + 12;
    // CSSOM updates do not rewrite YouTube's inline styles or trigger DOM observers.
    videoRule.style.setProperty("top", `${top}px`, "important");
    const nextGuideContent = doc.querySelector<HTMLElement>("#guide-content");
    if (nextGuideContent !== guideContent) {
      if (guideContent) resize?.unobserve(guideContent);
      guideContent = nextGuideContent;
      if (guideContent) resize?.observe(guideContent);
    }
    const guideRect = guideContent?.getBoundingClientRect();
    const guideStyle = guideContent ? win.getComputedStyle(guideContent) : null;
    // Follow the guide's visible right edge so the entire picture stays beside
    // the menu, while retaining top-layer stacking over watch-page content.
    left =
      guideRect &&
      guideRect.width > 0 &&
      guideRect.height > 0 &&
      guideRect.left <= 12 &&
      guideRect.top <= top &&
      guideRect.bottom > top &&
      guideStyle?.display !== "none" &&
      guideStyle?.visibility !== "hidden"
        ? Math.max(12, guideRect.right + 12)
        : 12;
    videoRule.style.setProperty("left", `${left}px`, "important");
    const rect = movie?.getBoundingClientRect();
    active = !!(
      enabled &&
      !navigating &&
      video &&
      rect &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom <= headerBottom &&
      rect.right > 0 &&
      rect.left < win.innerWidth &&
      !doc.fullscreenElement &&
      !doc.pictureInPictureElement
    );
    video?.toggleAttribute("data-oyt-mini-player", active);
    movie?.toggleAttribute("data-oyt-mini-player-active", active);
    if (
      active &&
      video &&
      !restorePopover &&
      typeof video.showPopover === "function"
    ) {
      // The top layer escapes native stacking contexts without reparenting the
      // video. Controls enter it after the picture, preserving their ordering.
      const target = video;
      const original = target.getAttribute("popover");
      target.setAttribute("popover", "manual");
      target.showPopover();
      restorePopover = () => {
        target.hidePopover();
        if (original === null) target.removeAttribute("popover");
        else target.setAttribute("popover", original);
      };
    } else if (!active) {
      restorePopover?.();
      restorePopover = undefined;
    }
    emit();
    if (active && win.performance.now() < guideMotionUntil) schedule();
  }
  function schedule() {
    if (!frame && !disposed) frame = win.requestAnimationFrame(update);
  }
  const guideTransitionFinished = (event: Event) => {
    if (event.target instanceof Element && event.target.closest("#guide"))
      schedule();
  };
  const startNavigation = () => {
    navigating = true;
    restore();
    emit();
  };
  const finishNavigation = () => {
    navigating = false;
    update();
  };
  const mutations = new MutationObserver((records) => {
    const guideChanged = records.some(
      (record) =>
        record.target instanceof Element &&
        record.target.matches("#guide, #guide-content"),
    );
    if (guideChanged) {
      const guide = doc.querySelector("#guide");
      const durations = guide
        ? win.getComputedStyle(guide).transitionDuration.split(",")
        : [];
      const duration = Math.max(
        200,
        ...durations.map(
          (value) =>
            parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000) || 0,
        ),
      );
      // Track transforms during the native drawer animation, not just its size.
      guideMotionUntil = win.performance.now() + duration + 50;
    }
    if (
      guideChanged ||
      records.some(
        (record) =>
          record.type === "childList" ||
          (record.target instanceof Element &&
            record.target.matches("#masthead-container, ytd-masthead")),
      )
    )
      schedule();
  });
  mutations.observe(doc.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class", "hidden", "opened", "persistent"],
  });
  doc.addEventListener("yt-navigate-start", startNavigation);
  doc.addEventListener("yt-navigate-finish", finishNavigation);
  doc.addEventListener("fullscreenchange", update);
  doc.addEventListener("transitionend", guideTransitionFinished, true);
  doc.addEventListener("transitioncancel", guideTransitionFinished, true);
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
      doc.removeEventListener("transitionend", guideTransitionFinished, true);
      doc.removeEventListener(
        "transitioncancel",
        guideTransitionFinished,
        true,
      );
      win.removeEventListener("scroll", schedule, true);
      win.removeEventListener("resize", schedule);
      win.removeEventListener("popstate", finishNavigation);
      listeners.clear();
      style.remove();
      video = null;
    },
  };
}
