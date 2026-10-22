import { findVideo } from "./player";
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
    startingContext = undefined;
    apply();
    emit();
  };
  const refresh = async () => {
    if (disposed) return;
    const target = findVideo(doc);
    if (target !== video) {
      off();
      video?.removeEventListener("emptied", emptied);
      graph?.context.removeEventListener("statechange", stateChanged);
      video = target;
      graph = target ? graphs.get(target) : undefined;
      video?.addEventListener("emptied", emptied);
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
      context = graph?.context ?? makeContext();
      startingContext = context;
      if (context.state !== "running") {
        error =
          "EQ is saved ON. Play the video or interact with the page if activation is waiting.";
        emit();
      }
      await context.resume();
      if (disposed || request !== generation || findVideo(doc) !== target) {
        if (graphs.get(target)?.context !== context)
          void context.close().catch(() => {});
        if (request === generation) off();
        return;
      }
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
      context.addEventListener("statechange", stateChanged);
      enabled = true;
      error = "";
      failedTarget = null;
      apply();
    } catch {
      if (context && graphs.get(target)?.context !== context)
        void context.close().catch(() => {});
      if (disposed || request !== generation) return;
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
  const retry = () => {
    if (disposed || !requestedEnabled) return;
    if (pending) {
      // A new gesture can release a resume() waiting on autoplay policy.
      void startingContext?.resume().catch(() => {});
      return;
    }
    failedTarget = null;
    waitingForMedia = false;
    void refresh();
  };
  const observer = new MutationObserver(onRefresh);
  observer.observe(doc.documentElement, { childList: true, subtree: true });
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
      apply();
      if (profile.snapshot().preset === "user") persist([...gains]);
      persistProfile(profile.snapshot());
      emit();
    },
    setPreset(value) {
      if (disposed || !profile.select(value)) return;
      gains = profile.gains();
      apply();
      persistProfile(profile.snapshot());
      emit();
    },
    setApproach(value) {
      if (disposed) return;
      approach = parseApproach(value);
      apply();
      persistApproach(approach);
      emit();
    },
    reset() {
      if (disposed || !profile.reset()) return;
      gains = profile.gains();
      apply();
      if (profile.snapshot().preset === "user") persist([...gains]);
      persistProfile(profile.snapshot());
      emit();
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
      graph?.context.removeEventListener("statechange", stateChanged);
      listeners.clear();
    },
  };
}
