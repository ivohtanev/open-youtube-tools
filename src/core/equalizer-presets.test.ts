import { expect, it } from "vitest";
import { EQ_FREQUENCIES } from "./equalizer";
import { createEqualizerProfile, EQ_PRESETS } from "./equalizer-presets";

it("migrates legacy gains into User and validates persisted values", () => {
  const profile = createEqualizerProfile(undefined, [6, -3, NaN, 90, -90, "4"]);
  expect(profile.snapshot()).toEqual({
    preset: "user",
    userGains: [6, -3, 0, 12, -12, 0, 0, 0, 0, 0],
  });
  expect(
    createEqualizerProfile(
      { preset: "unknown", userGains: [2] },
      [6],
    ).gains()[0],
  ).toBe(2);
  expect(
    createEqualizerProfile(
      { preset: "music", userGains: "bad" },
      [6],
    ).snapshot().userGains[0],
  ).toBe(6);
});

it("preserves User through every preset, reload and locked edit/reset attempt", () => {
  const profile = createEqualizerProfile(undefined, [4, -2]);
  for (const preset of EQ_PRESETS.slice(1)) {
    profile.select(preset.id);
    expect(profile.gains()).toEqual(preset.gains);
    expect(profile.setGain(0, 12)).toBe(false);
    expect(profile.reset()).toBe(false);
    const restored = createEqualizerProfile(profile.snapshot());
    expect(restored.gains()).toEqual(preset.gains);
    restored.select("user");
    expect(restored.gains().slice(0, 2)).toEqual([4, -2]);
  }
  profile.select("user");
  profile.setGain(0, 5.5);
  expect(profile.gains().slice(0, 2)).toEqual([5.5, -2]);
  profile.reset();
  expect(profile.gains()).toEqual(Array(10).fill(0));
});

it("keeps preset definitions intact and snapshots detached", () => {
  const profile = createEqualizerProfile({ preset: "movie", userGains: [3] });
  profile.gains().fill(12);
  profile.snapshot().userGains.fill(-12);
  expect(profile.gains()).toEqual(EQ_PRESETS[3].gains);
  expect(profile.snapshot().userGains[0]).toBe(3);
  for (const preset of EQ_PRESETS.slice(1)) {
    expect(preset.gains).toHaveLength(EQ_FREQUENCIES.length);
    expect(
      preset.gains?.every(
        (gain) =>
          Number.isFinite(gain) && Math.abs(gain) <= 12 && gain % 0.5 === 0,
      ),
    ).toBe(true);
  }
});
