import type { ExpandPlayerPort } from "../../core/contracts";
import { findVideo } from "./player";

/** Fit the original picture within the viewport, reserving header and toolbar space. */
export function expandedSize(width: number, height: number, ratio: number) {
  const w = Math.max(0, Math.min(width, height * ratio));
  return { width: w, height: w / ratio };
}

export function createExpandPlayer(
  doc: Document,
): ExpandPlayerPort & { dispose(): void } {
  const win = doc.defaultView!;
  let expanded = false;
  let navigating = false;
  let disposed = false;
  let frame = 0;
  let watch: HTMLElement | null = null;
  let video: HTMLVideoElement | null = null;
  let observedHeader: HTMLElement | null = null;
  let previousState = "";
  const listeners = new Set<
    (state: { available: boolean; expanded: boolean }) => void
  >();
  const style = doc.createElement("style");
  style.textContent = `
    ytd-watch-flexy[data-oyt-expanded] {
      --ytd-watch-flexy-max-player-width: 100% !important;
      --ytd-watch-flexy-fixed-side-menu-width: 0px !important;
    }
    ytd-watch-flexy[data-oyt-expanded] #columns {
      display: flex !important; flex-direction: column !important;
      width: 100% !important; max-width: none !important;
      margin: 0 !important; padding: 0 !important;
    }
    ytd-watch-flexy[data-oyt-expanded] #columns::after { display: none !important; }
    ytd-watch-flexy[data-oyt-expanded] :is(#primary, #primary-inner) {
      width: 100% !important; max-width: none !important;
      min-width: 0 !important; margin: 0 !important; padding: 0 !important;
      flex: none !important;
    }
    ytd-watch-flexy[data-oyt-expanded] :is(#secondary, #secondary-inner, #fixed-side-menu, .ytSideRailViewModelHost) {
      position: static !important; width: 100% !important; max-width: none !important;
      min-width: 0 !important; height: auto !important; max-height: none !important;
      margin: 0 !important; transform: none !important; order: 2 !important;
      grid-column: 1 / -1 !important; grid-row: auto !important;
    }
    ytd-watch-flexy[data-oyt-expanded] :is(#player, #player-container-outer, #player-container-inner, #full-bleed-container) {
      width: 100% !important; max-width: none !important; min-width: 0 !important;
      height: var(--oyt-expanded-height) !important; min-height: 0 !important;
      max-height: none !important; padding: 0 !important; margin: 0 !important;
    }
    ytd-watch-flexy[data-oyt-expanded] :is(#player-container, ytd-player, ytd-player > #container) {
      width: 100% !important; height: 100% !important;
      max-width: none !important; min-width: 0 !important;
    }
    ytd-watch-flexy[data-oyt-expanded]:not([theater]) #full-bleed-container { height: 0 !important; }
    ytd-watch-flexy[data-oyt-expanded] #movie_player {
      width: var(--oyt-expanded-width) !important; height: var(--oyt-expanded-height) !important;
      max-width: 100% !important; min-width: 0 !important; min-height: 0 !important;
      margin: 0 auto !important;
    }
    ytd-watch-flexy[data-oyt-expanded] #movie_player video:not([data-oyt-mini-player]) {
      width: 100% !important; height: 100% !important; left: 0 !important; top: 0 !important;
      object-fit: contain !important;
    }
  `;
  doc.head.append(style);
  const sizing = (style.sheet!.cssRules[0] as CSSStyleRule).style;
  const snapshot = () => ({
    available:
      !disposed &&
      !navigating &&
      !!video &&
      !!watch &&
      !doc.fullscreenElement &&
      !doc.pictureInPictureElement,
    expanded,
  });
  const emit = () => {
    const state = snapshot();
    const key = `${state.available}:${state.expanded}`;
    if (key === previousState) return;
    previousState = key;
    listeners.forEach((listener) => listener(state));
  };
  const clear = () => watch?.removeAttribute("data-oyt-expanded");
  const resize =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
  function update() {
    win.cancelAnimationFrame(frame);
    frame = 0;
    if (disposed) return;
    const next = findVideo(doc);
    const nextWatch = next?.closest<HTMLElement>("ytd-watch-flexy") ?? null;
    if (watch !== nextWatch) {
      clear();
      watch = nextWatch;
    }
    if (next !== video) {
      video?.removeEventListener("loadedmetadata", schedule);
      video?.removeEventListener("resize", schedule);
      video?.removeEventListener("enterpictureinpicture", schedule);
      video?.removeEventListener("leavepictureinpicture", schedule);
      video = next;
      video?.addEventListener("loadedmetadata", schedule);
      video?.addEventListener("resize", schedule);
      video?.addEventListener("enterpictureinpicture", schedule);
      video?.addEventListener("leavepictureinpicture", schedule);
    }
    if (!video || !watch) expanded = false;
    const active =
      expanded &&
      !navigating &&
      !doc.fullscreenElement &&
      !doc.pictureInPictureElement;
    watch?.toggleAttribute("data-oyt-expanded", active);
    if (active && video && watch) {
      const header = doc.querySelector<HTMLElement>(
        "#masthead-container, ytd-masthead",
      );
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      const viewportWidth = Math.min(
        doc.documentElement.clientWidth || win.innerWidth,
        watch.getBoundingClientRect().width || win.innerWidth,
      );
      const viewportHeight = win.visualViewport?.height ?? win.innerHeight;
      const ratio =
        video.videoWidth > 0 && video.videoHeight > 0
          ? video.videoWidth / video.videoHeight
          : 16 / 9;
      const size = expandedSize(
        viewportWidth,
        Math.max(0, viewportHeight - headerHeight - 44),
        ratio,
      );
      sizing.setProperty("--oyt-expanded-width", `${size.width}px`);
      sizing.setProperty("--oyt-expanded-height", `${size.height}px`);
      if (observedHeader !== header) {
        if (observedHeader) resize?.unobserve(observedHeader);
        observedHeader = header;
        if (header) resize?.observe(header);
      }
    }
    emit();
  }
  function schedule() {
    if (!frame && !disposed) frame = win.requestAnimationFrame(update);
  }
  const startNavigation = () => {
    navigating = true;
    expanded = false;
    clear();
    emit();
  };
  const finishNavigation = () => {
    navigating = false;
    update();
  };
  const popstate = () => {
    expanded = false;
    navigating = false;
    update();
  };
  const observer = new MutationObserver(schedule);
  observer.observe(doc.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["theater"],
  });
  doc.addEventListener("yt-navigate-start", startNavigation);
  doc.addEventListener("yt-navigate-finish", finishNavigation);
  doc.addEventListener("fullscreenchange", schedule);
  win.addEventListener("resize", schedule);
  win.visualViewport?.addEventListener("resize", schedule);
  win.addEventListener("popstate", popstate);
  update();
  return {
    toggle() {
      update();
      if (
        !video ||
        !watch ||
        doc.fullscreenElement ||
        doc.pictureInPictureElement
      )
        return;
      expanded = !expanded;
      update();
    },
    reset() {
      expanded = false;
      update();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      expanded = false;
      clear();
      disposed = true;
      win.cancelAnimationFrame(frame);
      observer.disconnect();
      resize?.disconnect();
      video?.removeEventListener("loadedmetadata", schedule);
      video?.removeEventListener("resize", schedule);
      video?.removeEventListener("enterpictureinpicture", schedule);
      video?.removeEventListener("leavepictureinpicture", schedule);
      doc.removeEventListener("yt-navigate-start", startNavigation);
      doc.removeEventListener("yt-navigate-finish", finishNavigation);
      doc.removeEventListener("fullscreenchange", schedule);
      win.removeEventListener("resize", schedule);
      win.visualViewport?.removeEventListener("resize", schedule);
      win.removeEventListener("popstate", popstate);
      listeners.clear();
      style.remove();
    },
  };
}
