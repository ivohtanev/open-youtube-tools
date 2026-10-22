import type { EqualizerApproachId } from "./equalizer-approaches";

export const EQ_FREQUENCIES = [
  31.25, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
];
export interface EqualizerState {
  enabled: boolean;
  pending: boolean;
  gains: number[];
  approach: EqualizerApproachId;
  preampDb: number;
  error: string;
}
export interface EqualizerPort {
  snapshot(): EqualizerState;
  setEnabled(enabled: boolean): Promise<void>;
  setGain(index: number, gain: number): void;
  setApproach(approach: EqualizerApproachId): void;
  reset(): void;
  subscribe(listener: (state: EqualizerState) => void): () => void;
}
