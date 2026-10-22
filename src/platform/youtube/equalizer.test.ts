import { afterEach, expect, it, vi } from "vitest";
import { createEqualizer } from "./equalizer";
import { equalizer } from "../../features/equalizer";
import { createPlayer } from "./player";
import {
  DEFAULT_EQ_APPROACH,
  EQ_APPROACHES,
} from "../../core/equalizer-approaches";

afterEach(() => document.body.replaceChildren());

function fixture(saved: unknown = [], savedApproach?: unknown) {
  history.replaceState(null, "", "/watch?v=test");
  document.body.innerHTML =
    '<div id="movie_player"><video class="html5-main-video"></video></div>';
  const param = () => ({ value: 0, setTargetAtTime: vi.fn() });
  const node = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: param(),
    frequency: param(),
    Q: param(),
    type: "",
    getFrequencyResponse(frequencies: Float32Array, magnitudes: Float32Array) {
      magnitudes.fill(1);
      frequencies.forEach((frequency, i) => {
        if (frequency === this.frequency.value)
          magnitudes[i] = 10 ** (this.gain.value / 20);
      });
    },
  });
  const filters: ReturnType<typeof node>[] = [];
  const preamp = node();
  const compressor = {
    ...node(),
    threshold: param(),
    knee: param(),
    ratio: param(),
    attack: param(),
    release: param(),
  };
  const context = {
    state: "running",
    currentTime: 0,
    sampleRate: 48000,
    destination: {},
    resume: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    createGain: vi.fn(() => preamp),
    createDynamicsCompressor: vi.fn(() => compressor),
    createBiquadFilter: vi.fn(() => {
      const filter = node();
      filters.push(filter);
      return filter;
    }),
    createMediaElementSource: vi.fn(() => node()),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const makeContext = vi.fn(() => context as unknown as AudioContext);
  const persist = vi.fn();
  const persistApproach = vi.fn();
  const audio = createEqualizer(
    document,
    saved,
    persist,
    makeContext,
    savedApproach,
    persistApproach,
  );
  return {
    audio,
    context,
    filters,
    preamp,
    compressor,
    makeContext,
    persist,
    persistApproach,
  };
}

it("starts off, smooths gains with combined headroom, and reuses the source after bypass", async () => {
  const { audio, context, filters, preamp, makeContext } = fixture(
    [6, 6],
    "conservative",
  );
  expect(makeContext).not.toHaveBeenCalled();
  expect(audio.snapshot().enabled).toBe(false);
  await audio.setEnabled(true);
  expect(filters).toHaveLength(20);
  expect(filters[0]!.type).toBe("peaking");
  expect(filters[0]!.frequency.value).toBe(31.25);
  expect(filters[9]!.frequency.value).toBe(16000);
  expect(preamp.gain.setTargetAtTime).toHaveBeenLastCalledWith(
    10 ** (-12 / 20),
    0,
    0.02,
  );
  await audio.setEnabled(false);
  expect(preamp.gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.02);
  for (const filter of filters.slice(0, 10))
    expect(filter.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.02);
  await audio.setEnabled(true);
  expect(context.createMediaElementSource).toHaveBeenCalledTimes(1);
  audio.dispose();
  expect(context.close).not.toHaveBeenCalled();
});

it("cancels startup before taking ownership if disabled during resume", async () => {
  const { audio, context } = fixture();
  let resume!: () => void;
  context.resume.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        resume = resolve;
      }),
  );
  const starting = audio.setEnabled(true);
  await audio.setEnabled(false);
  resume();
  await starting;
  expect(context.createMediaElementSource).not.toHaveBeenCalled();
  expect(context.close).toHaveBeenCalledOnce();
  expect(audio.snapshot()).toMatchObject({ enabled: false, pending: false });
  audio.dispose();
});

it("defaults to combined-response compensation, persists switches and preserves bands on reset", async () => {
  const { audio, preamp, persistApproach, context } = fixture(
    [6, 6],
    "unknown",
  );
  expect(audio.snapshot().approach).toBe(DEFAULT_EQ_APPROACH);
  await audio.setEnabled(true);
  // The synthetic filter responses have distinct peaks. Their maximum is 6 dB,
  // whereas the original conservative strategy would attenuate by 12 dB.
  expect(audio.snapshot().preampDb).toBeCloseTo(-6);
  expect(preamp.gain.setTargetAtTime.mock.lastCall![0]).toBeCloseTo(
    10 ** (-6 / 20),
  );
  audio.setApproach("direct");
  expect(preamp.gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.02);
  expect(persistApproach).toHaveBeenLastCalledWith("direct");
  expect(audio.snapshot().gains.slice(0, 2)).toEqual([6, 6]);
  audio.reset();
  expect(audio.snapshot()).toMatchObject({
    approach: "direct",
    enabled: true,
    preampDb: 0,
  });
  expect(context.createMediaElementSource).toHaveBeenCalledOnce();
  audio.dispose();
});

it("routes through the compressor only in its active mode and restores dry bypass", async () => {
  const { audio, context, filters, compressor } = fixture([6], "compressor");
  await audio.setEnabled(true);
  const tail = filters[9]!;
  expect(tail.connect).toHaveBeenLastCalledWith(compressor);
  expect(compressor.connect).toHaveBeenLastCalledWith(context.destination);
  expect(compressor.threshold.value).toBe(-3);
  expect(compressor.ratio.value).toBe(20);
  expect(audio.snapshot().preampDb).toBe(0);
  await audio.setEnabled(false);
  expect(compressor.disconnect).toHaveBeenCalledTimes(2);
  expect(tail.connect).toHaveBeenLastCalledWith(context.destination);
  await audio.setEnabled(true);
  expect(tail.connect).toHaveBeenLastCalledWith(compressor);
  audio.setApproach("response");
  expect(tail.connect).toHaveBeenLastCalledWith(context.destination);
  expect(context.createMediaElementSource).toHaveBeenCalledOnce();
  audio.dispose();
});

it("changes and saves the approach while OFF without creating an audio context", () => {
  const { audio, makeContext, persistApproach } = fixture([], "direct");
  expect(audio.snapshot().approach).toBe("direct");
  audio.setApproach("compressor");
  expect(audio.snapshot()).toMatchObject({
    approach: "compressor",
    enabled: false,
    preampDb: 0,
  });
  expect(persistApproach).toHaveBeenLastCalledWith("compressor");
  expect(makeContext).not.toHaveBeenCalled();
  audio.dispose();
});

it("reports source ownership failures without displaying ON", async () => {
  const { audio, context } = fixture();
  context.createMediaElementSource.mockImplementation(() => {
    throw new Error("Already owned");
  });
  await audio.setEnabled(true);
  expect(audio.snapshot()).toMatchObject({ enabled: false, pending: false });
  expect(audio.snapshot().error).toContain("Could not start EQ");
  expect(context.close).toHaveBeenCalledOnce();
  audio.dispose();
});

it("bypasses the old element and requires manual activation after replacement", async () => {
  const { audio, preamp, context } = fixture([8]);
  await audio.setEnabled(true);
  document.querySelector("video")!.replaceWith(document.createElement("video"));
  document.dispatchEvent(new Event("yt-navigate-finish"));
  expect(audio.snapshot().enabled).toBe(false);
  expect(preamp.gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.02);
  expect(context.createMediaElementSource).toHaveBeenCalledOnce();
  audio.dispose();
});

it("clamps saved and edited values and resets every band", () => {
  const { audio, persist } = fixture([NaN, 90, -90, "6"]);
  expect(audio.snapshot().gains.slice(0, 4)).toEqual([0, 12, -12, 0]);
  audio.setGain(0, 80);
  audio.setGain(1, NaN);
  audio.setGain(-1, 2);
  expect(audio.snapshot().gains.slice(0, 2)).toEqual([12, 12]);
  audio.reset();
  expect(persist).toHaveBeenLastCalledWith(Array(10).fill(0));
  audio.dispose();
});

it("opens on click, edits sliders, lights only when ON, and bypasses on unmount", async () => {
  const { audio } = fixture();
  const player = createPlayer(document);
  const container = document.createElement("div");
  document.body.append(container);
  const dispose = equalizer(audio).mount(container, player);
  const trigger = container.querySelector<HTMLButtonElement>(
    '[aria-label="Equalizer"]',
  )!;
  const toggle = container.querySelector<HTMLButtonElement>(
    '[aria-label="Enable equalizer"]',
  )!;
  trigger.click();
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  expect(trigger.dataset.modified).toBe("false");
  const approaches = container.querySelector<HTMLSelectElement>(
    'select[aria-label="EQ approach"]',
  )!;
  expect(approaches.options).toHaveLength(EQ_APPROACHES.length);
  expect(approaches.value).toBe(DEFAULT_EQ_APPROACH);
  approaches.value = "direct";
  approaches.dispatchEvent(new Event("change"));
  expect(audio.snapshot().approach).toBe("direct");
  expect(container.textContent).toContain("Loud material may clip");
  expect(audio.snapshot().enabled).toBe(false);
  const sliders = container.querySelectorAll<HTMLInputElement>(
    'input[type="range"]',
  );
  expect(sliders).toHaveLength(10);
  sliders[0]!.value = "5.5";
  sliders[0]!.dispatchEvent(new Event("input"));
  expect(audio.snapshot().gains[0]).toBe(5.5);
  expect(trigger.dataset.modified).toBe("false");
  toggle.click();
  await Promise.resolve();
  expect(toggle.textContent).toBe("ON");
  expect(trigger.dataset.modified).toBe("true");
  toggle.click();
  expect(toggle.textContent).toBe("OFF");
  expect(trigger.dataset.modified).toBe("false");
  await audio.setEnabled(true);
  dispose();
  expect(audio.snapshot().enabled).toBe(false);
  player.dispose();
  audio.dispose();
});
