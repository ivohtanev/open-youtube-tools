import type { EqualizerApproach } from "./types";

export const conservative: EqualizerApproach = {
  id: "conservative",
  label: "Conservative headroom (original)",
  description:
    "Reduces overall gain by the sum of all positive band settings. Can make the sound much quieter; not a peak limiter.",
  preampDb: (gains) => -gains.reduce((sum, gain) => sum + Math.max(0, gain), 0),
};
