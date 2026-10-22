import { afterEach, expect, it, vi } from "vitest";
import { createEqualizer } from "./equalizer";
import { equalizer } from "../../features/equalizer";
import { createPlayer } from "./player";
import {
  DEFAULT_EQ_APPROACH,
  EQ_APPROACHES,
} from "../../core/equalizer-approaches";
import { EQ_PRESETS } from "../../core/equalizer-presets";

afterEach(() => document.body.replaceChildren());

it("applies presets to the existing graph without changing routing, approach or saved User", async () => {
  const {
    audio,
    context,
    filters,
    persist,
    persistProfile,
    persistEnabled,
    persistApproach,
  } = fixture([5.5, -2], "response");
  await audio.setEnabled(true);
  audio.setPreset("music");
  expect(audio.snapshot()).toMatchObject({
    enabled: true,
    requestedEnabled: true,
    approach: "response",
    preset: "music",
    gains: EQ_PRESETS[1].gains,
  });
  EQ_PRESETS[1].gains.forEach((gain, index) => {
    expect(filters[index]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(
      gain,
      0,
      0.02,
    );
  });
  expect(persistProfile.mock.lastCall![0]).toMatchObject({
    preset: "music",
    userGains: [5.5, -2, 0, 0, 0, 0, 0, 0, 0, 0],
  });
  audio.setGain(0, 12);
  audio.reset();
  expect(persistProfile).toHaveBeenCalledTimes(3);
  expect(persist).not.toHaveBeenCalled();
  expect(audio.snapshot().gains).toEqual(EQ_PRESETS[1].gains);
  audio.setPreset("user");
  expect(audio.snapshot().gains.slice(0, 2)).toEqual([5.5, -2]);
  audio.setGain(0, 4);
  expect(persist).toHaveBeenLastCalledWith([4, -2, 0, 0, 0, 0, 0, 0, 0, 0]);
  expect(persistProfile.mock.lastCall![0].userGains[0]).toBe(4);
  expect(context.createMediaElementSource).toHaveBeenCalledOnce();
  expect(persistEnabled).toHaveBeenCalledExactlyOnceWith(true);
  expect(persistApproach).not.toHaveBeenCalled();
  audio.dispose();
});

it("restores selected presets while OFF and ON and preserves them across video replacement", async () => {
  for (const enabled of [false, true]) {
    const { audio, context, makeContext, persistProfile } = fixture(
      [9],
      "compressor",
      enabled,
      { preset: "podcast", userGains: [3] },
    );
    expect(audio.snapshot().gains).toEqual(EQ_PRESETS[2].gains);
    if (enabled) {
      await vi.waitFor(() => expect(audio.snapshot().enabled).toBe(true));
      const replacement = document.createElement("video");
      replacement.className = "html5-main-video";
      document.querySelector("video")!.replaceWith(replacement);
      document.dispatchEvent(new Event("yt-navigate-finish"));
      await vi.waitFor(() => expect(audio.snapshot().enabled).toBe(true));
      expect(context.createMediaElementSource).toHaveBeenCalledTimes(2);
    } else {
      audio.setPreset("movie");
      expect(makeContext).not.toHaveBeenCalled();
    }
    audio.setPreset("user");
    expect(audio.snapshot().gains[0]).toBe(3);
    const calls = persistProfile.mock.calls.length;
    audio.dispose();
    audio.setPreset("music");
    audio.setGain(0, 12);
    audio.reset();
    expect(persistProfile).toHaveBeenCalledTimes(calls);
  }
});

it("edits every preset in Shadow DOM, fine-tunes with wheel, and restores only the selected curve", () => {
  const { audio, makeContext, persistProfile } = fixture([4]);
  const player = createPlayer(document);
  const host = document.createElement("div");
  document.body.append(host);
  const root = host.attachShadow({ mode: "open" });
  const container = document.createElement("div");
  root.append(container);
  let dispose = equalizer(audio).mount(container, player);
  const button = (text: string) =>
    Array.from(container.querySelectorAll("button")).find(
      (item) => item.textContent === text,
    )!;
  const slider = () =>
    container.querySelector<HTMLInputElement>('input[type="range"]')!;
  const restore = () =>
    container.querySelector<HTMLButtonElement>(".eq-restore")!;
  for (const label of ["Music", "Podcast", "Movie"]) {
    button(label).click();
    expect(button(label).getAttribute("aria-pressed")).toBe("true");
    expect(slider().disabled).toBe(false);
    expect(restore().disabled).toBe(true);
    slider().value = "5.5";
    slider().dispatchEvent(new Event("input"));
    expect(audio.snapshot().gains[0]).toBe(5.5);
    expect(button(label).dataset.customized).toBe("true");
    expect(restore().disabled).toBe(false);
  }
  const wheel = (deltaY: number, extra = {}) => {
    const event = new WheelEvent("wheel", {
      deltaY,
      bubbles: true,
      cancelable: true,
      ...extra,
    });
    slider().dispatchEvent(event);
    return event;
  };
  expect(wheel(-100).defaultPrevented).toBe(true);
  expect(audio.snapshot().gains[0]).toBe(5.7);
  wheel(1);
  expect(audio.snapshot().gains[0]).toBe(5.5);
  expect(wheel(0).defaultPrevented).toBe(false);
  expect(wheel(-1, { ctrlKey: true }).defaultPrevented).toBe(false);
  expect(audio.snapshot().gains[0]).toBe(5.5);
  audio.setGain(0, 11.9);
  wheel(-1);
  expect(audio.snapshot().gains[0]).toBe(12);
  audio.setGain(0, -11.9);
  wheel(100);
  expect(audio.snapshot().gains[0]).toBe(-12);
  expect(persistProfile.mock.lastCall![0].presetGains.movie[0]).toBe(-12);
  dispose();
  dispose = equalizer(audio).mount(container, player);
  expect(button("Movie").getAttribute("aria-pressed")).toBe("true");
  expect(slider().value).toBe("-12");
  restore().click();
  expect(audio.snapshot().gains).toEqual(EQ_PRESETS[3].gains);
  button("Music").click();
  expect(slider().value).toBe("5.5");
  button("User").click();
  expect(slider().value).toBe("4");
  restore().click();
  expect(audio.snapshot().gains).toEqual(Array(10).fill(0));
  expect(container.querySelector(".eq-preset-overlay")).toBeNull();
  expect(container.textContent).toContain("Made with AI");
  expect(container.textContent).not.toContain("Experimental");
  expect(makeContext).not.toHaveBeenCalled();
  dispose();
  player.dispose();
  audio.dispose();
});

function fixture(
  saved: unknown = [],
  savedApproach?: unknown,
  savedEnabled?: unknown,
  savedProfile?: unknown,
) {
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
  const persistEnabled = vi.fn();
  const persistProfile = vi.fn();
  const audio = createEqualizer(document, {
    gains: saved,
    approach: savedApproach,
    enabled: savedEnabled,
    persistGains: persist,
    makeContext,
    persistApproach,
    persistEnabled,
    profile: savedProfile,
    persistProfile,
  });
  return {
    audio,
    context,
    filters,
    preamp,
    compressor,
    makeContext,
    persist,
    persistApproach,
    persistEnabled,
    persistProfile,
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

it("defaults to compression, supports combined-response compensation and preserves approach on reset", async () => {
  const { audio, preamp, persistApproach, context } = fixture(
    [6, 6],
    "unknown",
  );
  expect(audio.snapshot().approach).toBe(DEFAULT_EQ_APPROACH);
  expect(audio.snapshot().approach).toBe("compressor");
  audio.setApproach("response");
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

it("bypasses the old element and automatically activates its replacement", async () => {
  const { audio, preamp, context } = fixture([8]);
  await audio.setEnabled(true);
  const replacement = document.createElement("video");
  replacement.className = "html5-main-video";
  document.querySelector("video")!.replaceWith(replacement);
  document.dispatchEvent(new Event("yt-navigate-finish"));
  expect(audio.snapshot().enabled).toBe(false);
  expect(preamp.gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.02);
  expect(context.createMediaElementSource).toHaveBeenCalledOnce();
  await vi.waitFor(() => expect(audio.snapshot().enabled).toBe(true));
  expect(context.createMediaElementSource).toHaveBeenCalledTimes(2);
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

it("restores saved ON and settings without writing OFF during disposal or reload", async () => {
  const { audio, context, makeContext, persistEnabled } = fixture(
    [6, -3],
    "direct",
    true,
  );
  expect(audio.snapshot()).toMatchObject({
    requestedEnabled: true,
    enabled: false,
  });
  await vi.waitFor(() => expect(audio.snapshot().enabled).toBe(true));
  expect(audio.snapshot().gains.slice(0, 2)).toEqual([6, -3]);
  expect(audio.snapshot().approach).toBe("direct");
  audio.dispose();
  expect(persistEnabled).not.toHaveBeenCalled();
  const restored = createEqualizer(document, {
    gains: [6, -3],
    approach: "direct",
    enabled: true,
    makeContext,
  });
  await vi.waitFor(() => expect(restored.snapshot().enabled).toBe(true));
  expect(context.createMediaElementSource).toHaveBeenCalledOnce();
  await restored.setEnabled(false);
  restored.dispose();
});

it("persists explicit ON/OFF and keeps OFF when a later video appears", async () => {
  const { audio, persistEnabled, context } = fixture();
  await audio.setEnabled(true);
  expect(persistEnabled).toHaveBeenLastCalledWith(true);
  await audio.setEnabled(false);
  expect(persistEnabled).toHaveBeenLastCalledWith(false);
  const replacement = document.createElement("video");
  replacement.className = "html5-main-video";
  document.querySelector("video")!.replaceWith(replacement);
  document.dispatchEvent(new Event("yt-navigate-finish"));
  await Promise.resolve();
  expect(audio.snapshot()).toMatchObject({
    requestedEnabled: false,
    enabled: false,
  });
  expect(context.createMediaElementSource).toHaveBeenCalledOnce();
  audio.dispose();
  expect(persistEnabled.mock.calls.map(([value]) => value)).toEqual([
    true,
    false,
  ]);
});

it("waits for a video and reapplies saved ON after a source reset", async () => {
  const { audio, context, persistEnabled } = fixture([4], "compressor", true);
  const video = document.querySelector("video")!;
  video.remove();
  await Promise.resolve();
  expect(audio.snapshot()).toMatchObject({
    requestedEnabled: true,
    enabled: false,
  });
  document.querySelector("#movie_player")!.append(video);
  await vi.waitFor(() => expect(audio.snapshot().enabled).toBe(true));
  video.dispatchEvent(new Event("emptied"));
  await Promise.resolve();
  expect(audio.snapshot()).toMatchObject({
    requestedEnabled: true,
    enabled: false,
  });
  video.dispatchEvent(new Event("loadedmetadata"));
  await vi.waitFor(() => expect(audio.snapshot().enabled).toBe(true));
  expect(context.createMediaElementSource).toHaveBeenCalledOnce();
  expect(persistEnabled).not.toHaveBeenCalled();
  audio.dispose();
});

it("allows OFF while saved ON activation waits for a browser gesture", async () => {
  const { audio, context, persistEnabled } = fixture([], undefined, true);
  let resume!: () => void;
  context.state = "suspended";
  context.resume.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        resume = resolve;
      }),
  );
  await Promise.resolve();
  expect(audio.snapshot()).toMatchObject({
    requestedEnabled: true,
    pending: true,
    enabled: false,
  });
  await audio.setEnabled(false);
  context.state = "running";
  resume();
  await Promise.resolve();
  expect(audio.snapshot()).toMatchObject({
    requestedEnabled: false,
    pending: false,
    enabled: false,
  });
  expect(context.createMediaElementSource).not.toHaveBeenCalled();
  expect(persistEnabled).toHaveBeenLastCalledWith(false);
  audio.dispose();
});

it("retries waiting activation on interaction and keeps saved ON after startup failure", async () => {
  const { audio, context, persistEnabled } = fixture([], undefined, true);
  let resume!: () => void;
  context.state = "suspended";
  context.resume.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        resume = resolve;
      }),
  );
  await Promise.resolve();
  context.resume.mockImplementation(async () => {
    context.state = "running";
    resume();
  });
  document.dispatchEvent(new Event("pointerdown"));
  await vi.waitFor(() => expect(audio.snapshot().enabled).toBe(true));
  expect(persistEnabled).not.toHaveBeenCalled();
  audio.dispose();
  const failure = fixture([], "direct", true);
  failure.context.resume.mockRejectedValueOnce(new Error("blocked"));
  await vi.waitFor(() =>
    expect(failure.audio.snapshot().error).toContain("Could not start"),
  );
  expect(failure.audio.snapshot()).toMatchObject({
    requestedEnabled: true,
    enabled: false,
  });
  expect(failure.persistEnabled).not.toHaveBeenCalled();
  document.dispatchEvent(new Event("play"));
  await vi.waitFor(() => expect(failure.audio.snapshot().enabled).toBe(true));
  failure.audio.dispose();
});

it("opens on click, edits sliders, uses a switch and keeps the preference on unmount", async () => {
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
  expect(
    Array.from(approaches.options, (option) => option.textContent),
  ).toEqual([
    "Curve headroom (recommended)",
    "Direct boost",
    "Boost + compressor",
    "Conservative headroom (original)",
  ]);
  expect(approaches.value).toBe(DEFAULT_EQ_APPROACH);
  approaches.value = "direct";
  approaches.dispatchEvent(new Event("change"));
  expect(audio.snapshot().approach).toBe("direct");
  expect(container.textContent).not.toContain("Loud material may clip");
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
  expect(toggle.getAttribute("role")).toBe("switch");
  expect(toggle.getAttribute("aria-checked")).toBe("true");
  expect(toggle.previousElementSibling?.textContent).toBe("OFF");
  expect(toggle.nextElementSibling?.textContent).toBe("ON");
  expect(trigger.dataset.modified).toBe("true");
  toggle.click();
  expect(toggle.getAttribute("aria-checked")).toBe("false");
  expect(trigger.dataset.modified).toBe("false");
  await audio.setEnabled(true);
  dispose();
  expect(audio.snapshot()).toMatchObject({
    enabled: true,
    requestedEnabled: true,
  });
  player.dispose();
  audio.dispose();
});

it("keeps saved ON across non-watch navigation and reuses the source when returning", async () => {
  const { audio, context, persistEnabled } = fixture([], "direct", true);
  await vi.waitFor(() => expect(audio.snapshot().enabled).toBe(true));
  history.replaceState(null, "", "/results?search_query=test");
  document.dispatchEvent(new Event("yt-navigate-finish"));
  expect(audio.snapshot()).toMatchObject({
    requestedEnabled: true,
    enabled: false,
  });
  history.replaceState(null, "", "/watch?v=next");
  document.dispatchEvent(new Event("yt-navigate-finish"));
  await vi.waitFor(() => expect(audio.snapshot().enabled).toBe(true));
  expect(context.createMediaElementSource).toHaveBeenCalledOnce();
  expect(persistEnabled).not.toHaveBeenCalled();
  audio.dispose();
});

it("keeps the switch operable while restored audio is waiting for permission", async () => {
  const { audio, context, persistEnabled } = fixture([], undefined, true);
  let resume!: () => void;
  context.state = "suspended";
  context.resume.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        resume = resolve;
      }),
  );
  const player = createPlayer(document);
  const container = document.createElement("div");
  document.body.append(container);
  const dispose = equalizer(audio).mount(container, player);
  await Promise.resolve();
  const toggle = container.querySelector<HTMLButtonElement>('[role="switch"]')!;
  expect(toggle.getAttribute("aria-checked")).toBe("true");
  expect(toggle.getAttribute("aria-busy")).toBe("true");
  expect(toggle.disabled).toBe(false);
  toggle.click();
  expect(toggle.getAttribute("aria-checked")).toBe("false");
  expect(persistEnabled).toHaveBeenLastCalledWith(false);
  context.state = "running";
  resume();
  await Promise.resolve();
  dispose();
  player.dispose();
  audio.dispose();
});
