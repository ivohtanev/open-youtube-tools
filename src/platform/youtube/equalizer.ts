import { createResponseMeter } from "./equalizer-response";
import {
  getApproach,
  parseApproach,
  type EqualizerApproachId,
} from "../../core/equalizer-approaches";
import { configureCompressor } from "../../core/equalizer-approaches/compressor";
import {
  createEqualizerProfile,
  type EqualizerProfile,
} from "../../core/equalizer-presets";

import {
  EQ_FREQUENCIES,
  type EqualizerState,
  type EqualizerPort,
} from "../../core/equalizer";

type Graph = {
  context: AudioContext;
  preamp: GainNode;
  filters: BiquadFilterNode[];
  compressor: DynamicsCompressorNode;
  compressed: boolean;
  responsePeakDb: (gains: readonly number[]) => number;
};
// Sources cannot be recreated for an already-owned element. Keep their audible
// graph alive through bypass, toolbar remounting and adapter disposal.
const graphs = new WeakMap<HTMLVideoElement, Graph>();

const playbackVideo =
  "#movie_player video.html5-main-video, #shorts-player video.html5-main-video";

interface EqualizerOptions {
  gains?: unknown;
  profile?: unknown;
  persistProfile?: (profile: EqualizerProfile) => void;
  approach?: unknown;
  enabled?: unknown;
  persistGains?: (gains: number[]) => void;
  persistApproach?: (approach: EqualizerApproachId) => void;
  persistEnabled?: (enabled: boolean) => void;
  makeContext?: () => AudioContext;
}

export function createEqualizer(
  doc: Document,
  options: EqualizerOptions = {},
): EqualizerPort & { dispose(): void } {
  const {
    gains: saved = [],
    approach: savedApproach,
    persistGains: persist = () => {},
    persistApproach = () => {},
    persistEnabled = () => {},
    persistProfile = () => {},
    makeContext = () => new AudioContext(),
  } = options;
  const profile = createEqualizerProfile(options.profile, saved);
  let gains = profile.gains();
  let enabled = false;
  let requestedEnabled = options.enabled === true;
  let approach = parseApproach(savedApproach);
  let preampDb = 0;
  let pending = false;
  let error = "";
  let video: HTMLVideoElement | null = null;
  let graph: Graph | undefined;
  let generation = 0;
  let disposed = false;
  let startingContext: AudioContext | undefined;
  let sharedContext: AudioContext | undefined;
  let failedTarget: HTMLVideoElement | null = null;
  let waitingForMedia = false;
  const listeners = new Set<(state: EqualizerState) => void>();
  const snapshot = () => ({
    enabled,
    requestedEnabled,
    pending,
    gains: [...gains],
    preset: profile.snapshot().preset,
    approach,
    preampDb,
    error,
  });
  const emit = () => listeners.forEach((listener) => listener(snapshot()));
  const apply = () => {
    if (!graph) return;
    const { context, preamp, filters } = graph;
    preampDb = enabled
      ? getApproach(approach).preampDb(gains, () =>
          graph!.responsePeakDb(gains),
        )
      : 0;
    const compressed = enabled && approach === "compressor";
    if (compressed !== graph.compressed) {
      const tail = filters[filters.length - 1]!;
      tail.disconnect();
      graph.compressor.disconnect();
      if (compressed) {
        tail.connect(graph.compressor);
        graph.compressor.connect(context.destination);
      } else {
        tail.connect(context.destination);
      }
      graph.compressed = compressed;
    }
    preamp.gain.setTargetAtTime(
      10 ** (preampDb / 20),
      context.currentTime,
      0.02,
    );
    filters.forEach((filter, i) =>
      filter.gain.setTargetAtTime(
        enabled ? (gains[i] ?? 0) : 0,
        context.currentTime,
        0.02,
      ),
    );
  };
  const off = () => {
    generation++;
    pending = false;
    enabled = false;
    const context = startingContext;
    startingContext = undefined;
    if (context && context !== sharedContext && context !== graph?.context)
      void context.close().catch(() => {});
    apply();
    emit();
  };
  const refresh = async (playing?: HTMLVideoElement) => {
    if (disposed) return;
    // YouTube can move a playing element before showing the miniplayer.
    const target =
      playing ??
      (video && (video.isConnected || (!video.paused && !video.ended))
        ? video
        : doc.querySelector<HTMLVideoElement>(playbackVideo));
    if (target !== video) {
      off();
      video?.removeEventListener("emptied", emptied);
      video?.removeEventListener("pause", onRefresh);
      video?.removeEventListener("ended", onRefresh);
      graph?.context.removeEventListener("statechange", stateChanged);
      video = target;
      graph = target ? graphs.get(target) : undefined;
      video?.addEventListener("emptied", emptied);
      video?.addEventListener("pause", onRefresh);
      video?.addEventListener("ended", onRefresh);
      graph?.context.addEventListener("statechange", stateChanged);
      failedTarget = null;
      waitingForMedia = false;
    }
    if (
      requestedEnabled &&
      target &&
      target !== failedTarget &&
      !waitingForMedia
    )
      await activate(target);
  };
  const emptied = () => {
    // Keep the preference and owned source; restart when the new media is ready.
    waitingForMedia = true;
    off();
    failedTarget = null;
  };
  const stateChanged = () => {
    if (graph?.context.state !== "running" && enabled) {
      error =
        "EQ is saved ON but audio processing stopped. Play the video or interact with the page to retry.";
      off();
    }
  };
  const activate = async (target: HTMLVideoElement) => {
    if (pending || enabled) return;
    const request = ++generation;
    pending = true;
    error = "";
    emit();
    let context: AudioContext | undefined;
    try {
      graph = graphs.get(target);
      context = graph?.context ?? sharedContext ?? makeContext();
      startingContext = context;
      if (context.state !== "running") {
        error =
          "EQ is saved ON. Play the video or interact with the page if activation is waiting.";
        emit();
      }
      await context.resume();
      if (disposed || request !== generation) return;
      if (context.state !== "running")
        throw new Error("Audio context did not start.");
      if (!graph) {
        const preamp = context.createGain();
        const filters = EQ_FREQUENCIES.map((frequency) => {
          const filter = context!.createBiquadFilter();
          filter.type = "peaking";
          filter.frequency.value = Math.min(
            frequency,
            (context!.sampleRate / 2) * 0.95,
          );
          filter.Q.value = 1.4;
          return filter;
        });
        // Build the downstream path before taking ownership of the element.
        let tail: AudioNode = preamp;
        for (const filter of filters) {
          tail.connect(filter);
          tail = filter;
        }
        tail.connect(context.destination);
        const compressor = context.createDynamicsCompressor();
        configureCompressor(compressor);
        const responsePeakDb = createResponseMeter(context, filters);
        const source = context.createMediaElementSource(target);
        source.connect(preamp);
        graph = {
          context,
          preamp,
          filters,
          compressor,
          compressed: false,
          responsePeakDb,
        };
        graphs.set(target, graph);
      }
      sharedContext = context;
      context.addEventListener("statechange", stateChanged);
      enabled = true;
      error = "";
      failedTarget = null;
      apply();
    } catch {
      if (disposed || request !== generation) return;
      if (context && context !== sharedContext && context !== graph?.context)
        void context.close().catch(() => {});
      enabled = false;
      failedTarget = target;
      apply();
      error = "Could not start EQ. Reload the page if sound is missing.";
    } finally {
      if (!disposed && request === generation) {
        pending = false;
        startingContext = undefined;
        emit();
      }
    }
  };
  const onRefresh = () => {
    void refresh();
  };
  const retry = (event: Event) => {
    if (disposed || !requestedEnabled) return;
    const playing =
      event.type === "play" &&
      event.target instanceof HTMLVideoElement &&
      event.target.matches(playbackVideo)
        ? event.target
        : undefined;
    if (playing && playing !== video) {
      void refresh(playing);
      return;
    }
    if (pending) {
      // A new gesture can release a resume() waiting on autoplay policy.
      void startingContext?.resume().catch(() => {});
      return;
    }
    failedTarget = null;
    waitingForMedia = false;
    void refresh();
  };
  const changed = () => {
    if (!requestedEnabled) {
      requestedEnabled = true;
      persistEnabled(true);
    }
    apply();
    emit();
    if (!enabled && !pending) {
      failedTarget = null;
      waitingForMedia = false;
      void refresh();
    }
  };
  const observer = new MutationObserver(() => {
    if (requestedEnabled && !video?.isConnected) onRefresh();
  });
  observer.observe(doc.documentElement, {
    childList: true,
    subtree: true,
  });
  doc.addEventListener("yt-navigate-finish", onRefresh);
  doc.defaultView?.addEventListener("popstate", onRefresh);
  doc.addEventListener("play", retry, true);
  doc.addEventListener("loadedmetadata", retry, true);
  doc.addEventListener("pointerdown", retry, true);
  doc.addEventListener("keydown", retry, true);
  queueMicrotask(onRefresh);
  return {
    snapshot,
    async setEnabled(value) {
      if (disposed) return;
      requestedEnabled = value;
      persistEnabled(value);
      error = "";
      failedTarget = null;
      waitingForMedia = false;
      if (!value) off();
      else {
        emit();
        await refresh();
      }
    },
    setGain(index, gain) {
      if (disposed || !profile.setGain(index, gain)) return;
      gains = profile.gains();
      if (profile.snapshot().preset === "user") persist([...gains]);
      persistProfile(profile.snapshot());
      changed();
    },
    setPreset(value) {
      if (disposed || !profile.select(value)) return;
      gains = profile.gains();
      persistProfile(profile.snapshot());
      changed();
    },
    setApproach(value) {
      if (disposed) return;
      approach = parseApproach(value);
      persistApproach(approach);
      changed();
    },
    reset() {
      if (disposed || !profile.reset()) return;
      gains = profile.gains();
      if (profile.snapshot().preset === "user") persist([...gains]);
      persistProfile(profile.snapshot());
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
      off();
      disposed = true;
      observer.disconnect();
      doc.removeEventListener("yt-navigate-finish", onRefresh);
      doc.defaultView?.removeEventListener("popstate", onRefresh);
      doc.removeEventListener("play", retry, true);
      doc.removeEventListener("loadedmetadata", retry, true);
      doc.removeEventListener("pointerdown", retry, true);
      doc.removeEventListener("keydown", retry, true);
      video?.removeEventListener("emptied", emptied);
      video?.removeEventListener("pause", onRefresh);
      video?.removeEventListener("ended", onRefresh);
      graph?.context.removeEventListener("statechange", stateChanged);
      listeners.clear();
    },
  };
}
