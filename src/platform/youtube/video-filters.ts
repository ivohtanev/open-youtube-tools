import {
  DEFAULT_VIDEO_FILTERS,
  parseVideoFilters,
  videoFilterCss,
  type VideoFilterSettings,
  type VideoFiltersPort,
  type VideoFiltersState,
} from "../../core/video-filters";
import { findVideo } from "./player";

interface VideoFiltersOptions {
  settings?: unknown;
  enabled?: unknown;
  persistSettings?: (settings: VideoFilterSettings) => void;
  persistEnabled?: (enabled: boolean) => void;
}

export function createVideoFilters(
  doc: Document,
  options: VideoFiltersOptions = {},
): VideoFiltersPort & { dispose(): void } {
  let settings = parseVideoFilters(options.settings);
  let enabled = options.enabled === true;
  let original = false;
  let video: HTMLVideoElement | null = null;
  let disposed = false;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const owned = new Map<
    string,
    { before: string; priority: string; applied: string }
  >();
  const listeners = new Set<(state: VideoFiltersState) => void>();
  const snapshot = (): VideoFiltersState => ({
    available: !!video,
    enabled,
    original,
    settings: { ...settings },
  });
  const emit = () => listeners.forEach((listener) => listener(snapshot()));
  const release = (property: string) => {
    const previous = owned.get(property);
    if (
      video &&
      previous &&
      video.style.getPropertyValue(property) === previous.applied &&
      video.style.getPropertyPriority(property) === "important"
    ) {
      if (previous.before)
        video.style.setProperty(property, previous.before, previous.priority);
      else video.style.removeProperty(property);
    }
    owned.delete(property);
  };
  const setStyle = (property: string, value: string) => {
    if (!video) return;
    if (!value) {
      release(property);
      return;
    }
    let previous = owned.get(property);
    // Respect another actor's latest value when it takes over our inline style.
    if (
      previous &&
      (video.style.getPropertyValue(property) !== previous.applied ||
        video.style.getPropertyPriority(property) !== "important")
    ) {
      owned.delete(property);
      previous = undefined;
    }
    if (!previous) {
      previous = {
        before: video.style.getPropertyValue(property),
        priority: video.style.getPropertyPriority(property),
        applied: value,
      };
      owned.set(property, previous);
    }
    video.style.setProperty(property, value, "important");
    previous.applied = video.style.getPropertyValue(property);
  };
  const apply = () => {
    const active = enabled && !original;
    setStyle("filter", active ? videoFilterCss(settings) : "");
    const zoom = settings.zoom / 100;
    // Keep the scaled picture within its original frame, including the mini player.
    setStyle(
      "clip-path",
      active && zoom !== 1 ? `inset(${(1 - 1 / zoom) * 50}%)` : "",
    );
    setStyle(
      "scale",
      active && (settings.mirror || zoom !== 1)
        ? `${settings.mirror ? -zoom : zoom} ${zoom}`
        : "",
    );
  };
  const refresh = () => {
    if (disposed) return;
    const next = findVideo(doc);
    if (next === video) return;
    for (const property of [...owned.keys()]) release(property);
    video = next;
    original = false;
    apply();
    emit();
  };
  const flush = () => {
    if (saveTimer === undefined) return;
    clearTimeout(saveTimer);
    saveTimer = undefined;
    options.persistSettings?.({ ...settings });
  };
  const changed = () => {
    original = false;
    apply();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 200);
    emit();
  };
  const observer = new MutationObserver(refresh);
  observer.observe(doc.documentElement, { childList: true, subtree: true });
  doc.addEventListener("yt-navigate-finish", refresh);
  doc.defaultView?.addEventListener("popstate", refresh);
  doc.defaultView?.addEventListener("pagehide", flush);
  refresh();
  return {
    snapshot,
    setEnabled(value) {
      if (disposed) return;
      enabled = value;
      original = false;
      options.persistEnabled?.(value);
      apply();
      emit();
    },
    setValue(control, value) {
      if (disposed || !Number.isFinite(value)) return;
      settings = parseVideoFilters({ ...settings, [control]: value });
      changed();
    },
    setMirror(value) {
      if (disposed) return;
      settings.mirror = value;
      changed();
    },
    setOriginal(value) {
      if (disposed || original === value) return;
      original = value && enabled;
      apply();
      emit();
    },
    reset() {
      if (disposed) return;
      settings = { ...DEFAULT_VIDEO_FILTERS };
      changed();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      if (disposed) return;
      flush();
      disposed = true;
      observer.disconnect();
      doc.removeEventListener("yt-navigate-finish", refresh);
      doc.defaultView?.removeEventListener("popstate", refresh);
      doc.defaultView?.removeEventListener("pagehide", flush);
      for (const property of [...owned.keys()]) release(property);
      listeners.clear();
      video = null;
    },
  };
}
