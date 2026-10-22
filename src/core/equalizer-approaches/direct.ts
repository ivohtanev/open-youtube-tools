import type { EqualizerApproach } from "./types";

export const direct: EqualizerApproach = {
  id: "direct",
  label: "Direct boost",
  description:
    "Boosts bands without reducing overall gain. Loud material may clip or trigger downstream limiting. Lower playback volume if needed.",
  preampDb: () => 0,
};
