import type { EqualizerApproach } from "./types";

export const response: EqualizerApproach = {
  id: "response",
  label: "Curve headroom (recommended)",
  description:
    "Reduces overall gain by the estimated peak of the combined EQ curve. Preserves more volume than conservative headroom; not a peak limiter.",
  preampDb: (_, responsePeakDb) => -Math.max(0, responsePeakDb()),
};
