import { EQ_FREQUENCIES } from "./equalizer";

export type EqualizerPresetId = "user" | "music" | "podcast" | "movie";
export interface EqualizerProfile {
  preset: EqualizerPresetId;
  userGains: number[];
}

// Band order follows EQ_FREQUENCIES. Values are dB; tune these curves here.
// These are gentle starting points, independent of audio routing or website.
export const EQ_PRESETS = [
  { id: "user", label: "User", gains: null },
  { id: "music", label: "Music", gains: [2, 2, 1, 0, -1, 0, 1, 1.5, 2, 1] },
  {
    id: "podcast",
    label: "Podcast",
    gains: [-6, -4, -2, -1, 0, 1.5, 3, 2, 0, -2],
  },
  { id: "movie", label: "Movie", gains: [3, 2.5, 1.5, 0, -1, 0, 1.5, 2, 1, 0] },
] as const;

function parseGains(value: unknown) {
  return EQ_FREQUENCIES.map((_, i) =>
    Array.isArray(value) &&
    typeof value[i] === "number" &&
    Number.isFinite(value[i])
      ? Math.max(-12, Math.min(12, value[i]))
      : 0,
  );
}

/** Portable profile state. The host owns storage and applies the resulting gains. */
export function createEqualizerProfile(saved?: unknown, legacyGains?: unknown) {
  const record =
    saved && typeof saved === "object"
      ? (saved as Record<string, unknown>)
      : undefined;
  let preset: EqualizerPresetId =
    EQ_PRESETS.find((item) => item.id === record?.preset)?.id ?? "user";
  const userGains = parseGains(
    Array.isArray(record?.userGains) ? record.userGains : legacyGains,
  );
  return {
    snapshot(): EqualizerProfile {
      return { preset, userGains: [...userGains] };
    },
    gains() {
      const definition = EQ_PRESETS.find((item) => item.id === preset)!;
      return definition.gains ? [...definition.gains] : [...userGains];
    },
    select(value: EqualizerPresetId) {
      if (!EQ_PRESETS.some((item) => item.id === value) || value === preset)
        return false;
      preset = value;
      return true;
    },
    setGain(index: number, gain: number) {
      if (
        preset !== "user" ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= userGains.length ||
        !Number.isFinite(gain)
      )
        return false;
      userGains[index] = Math.max(-12, Math.min(12, gain));
      return true;
    },
    reset() {
      if (preset !== "user") return false;
      userGains.fill(0);
      return true;
    },
  };
}
