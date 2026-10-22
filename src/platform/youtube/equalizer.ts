import { findVideo } from "./player";
import { createResponseMeter } from "./equalizer-response";
import {
  getApproach,
  parseApproach,
  type EqualizerApproachId,
} from "../../core/equalizer-approaches";
import { configureCompressor } from "../../core/equalizer-approaches/compressor";

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
// graph alive in bypass even when the toolbar is hidden or remounted.
const graphs = new WeakMap<HTMLVideoElement, Graph>();

export function createEqualizer(
  doc: Document,
  saved: unknown = [],
  persist: (gains: number[]) => void = () => {},
  makeContext: () => AudioContext = () => new AudioContext(),
  savedApproach: unknown = undefined,
  persistApproach: (approach: EqualizerApproachId) => void = () => {},
): EqualizerPort & { dispose(): void } {
  const gains = EQ_FREQUENCIES.map((_, i) =>
    Array.isArray(saved) &&
    typeof saved[i] === "number" &&
    Number.isFinite(saved[i])
      ? Math.max(-12, Math.min(12, saved[i]))
      : 0,
  );
  let enabled = false;
  let approach = parseApproach(savedApproach);
  let preampDb = 0;
  let pending = false;
  let error = "";
  let video: HTMLVideoElement | null = null;
  let graph: Graph | undefined;
  let generation = 0;
  let disposed = false;
  const listeners = new Set<(state: EqualizerState) => void>();
  const snapshot = () => ({
    enabled,
    pending,
    gains: [...gains],
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
    apply();
    emit();
  };
  const refresh = () => {
    if (video && findVideo(doc) !== video) {
      off();
      video.removeEventListener("emptied", off);
      graph?.context.removeEventListener("statechange", stateChanged);
      video = null;
      graph = undefined;
    }
  };
  const stateChanged = () => {
    if (graph?.context.state !== "running" && enabled) {
      error =
        "Audio processing stopped. Turn EQ on again; reload the page if sound is missing.";
      off();
    }
  };
  const observer = new MutationObserver(refresh);
  observer.observe(doc.documentElement, { childList: true, subtree: true });
  doc.addEventListener("yt-navigate-finish", refresh);
  doc.defaultView?.addEventListener("popstate", refresh);
  return {
    snapshot,
    async setEnabled(value) {
      if (disposed) return;
      if (!value) {
        off();
        return;
      }
      if (pending || enabled) return;
      refresh();
      const target = findVideo(doc);
      if (!target) {
        error = "No video available.";
        emit();
        return;
      }
      const request = ++generation;
      pending = true;
      error = "";
      emit();
      let context: AudioContext | undefined;
      try {
        graph = graphs.get(target);
        context = graph?.context ?? makeContext();
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
        video = target;
        video.addEventListener("emptied", off);
        context.addEventListener("statechange", stateChanged);
        enabled = true;
        apply();
      } catch {
        if (context && graphs.get(target)?.context !== context)
          void context.close().catch(() => {});
        if (disposed || request !== generation) return;
        enabled = false;
        apply();
        error = "Could not start EQ. Reload the page if sound is missing.";
      } finally {
        if (!disposed && request === generation) {
          pending = false;
          emit();
        }
      }
    },
    setGain(index, gain) {
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= gains.length ||
        !Number.isFinite(gain)
      )
        return;
      gains[index] = Math.max(-12, Math.min(12, gain));
      apply();
      persist([...gains]);
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
      gains.fill(0);
      apply();
      persist([...gains]);
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
      doc.removeEventListener("yt-navigate-finish", refresh);
      doc.defaultView?.removeEventListener("popstate", refresh);
      video?.removeEventListener("emptied", off);
      graph?.context.removeEventListener("statechange", stateChanged);
      listeners.clear();
    },
  };
}
