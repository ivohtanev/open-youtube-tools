import type { Tool } from "../../core/contracts";
import { EQ_FREQUENCIES, type EqualizerPort } from "../../core/equalizer";
import {
  EQ_APPROACHES,
  getApproach,
  parseApproach,
} from "../../core/equalizer-approaches";
import { createPopover, iconButton } from "../../toolbar/popover";
import { EQ_PRESETS } from "../../core/equalizer-presets";

export function equalizer(audio: EqualizerPort): Tool {
  const icon =
    '<path d="M5 3v7m0 4v7M12 3v11m0 4v3M19 3v3m0 4v11M2 10h6v4H2zM9 14h6v4H9zM16 6h6v4h-6z"/>';
  return {
    id: "equalizer",
    name: "Equalizer",
    icon,
    mount(container, player) {
      const group = document.createElement("div");
      group.className = "tool";
      const trigger = iconButton("Equalizer", icon);
      const panel = document.createElement("div");
      panel.className = "eq-panel";
      const heading = document.createElement("div");
      heading.className = "panel-heading";
      const title = document.createElement("strong");
      title.textContent = "Equalizer";
      const toggle = document.createElement("button");
      toggle.className = "eq-switch";
      toggle.type = "button";
      toggle.setAttribute("role", "switch");
      toggle.setAttribute("aria-label", "Enable equalizer");
      const thumb = document.createElement("span");
      thumb.className = "eq-switch-thumb";
      toggle.append(thumb);
      toggle.onclick = () => {
        void audio.setEnabled(!audio.snapshot().requestedEnabled);
      };
      const switchControl = document.createElement("div");
      switchControl.className = "eq-switch-control";
      const offLabel = document.createElement("span");
      offLabel.textContent = "OFF";
      const onLabel = document.createElement("span");
      onLabel.textContent = "ON";
      switchControl.append(offLabel, toggle, onLabel);
      const reset = document.createElement("button");
      reset.textContent = "Reset";
      reset.onclick = () => audio.reset();
      const presetsToggle = document.createElement("button");
      presetsToggle.type = "button";
      presetsToggle.textContent = "Presets";
      presetsToggle.setAttribute("aria-expanded", "false");
      const actions = document.createElement("div");
      actions.className = "eq-heading-actions";
      actions.append(presetsToggle, reset);
      heading.append(title, switchControl, actions);
      const presetsReveal = document.createElement("div");
      presetsReveal.className = "eq-presets-reveal";
      presetsReveal.inert = true;
      presetsReveal.setAttribute("aria-hidden", "true");
      const presets = document.createElement("div");
      presets.className = "eq-presets";
      presets.setAttribute("role", "group");
      presets.setAttribute("aria-label", "EQ presets");
      const presetButtons = EQ_PRESETS.map((preset) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = preset.label;
        button.onclick = () => audio.setPreset(preset.id);
        presets.append(button);
        return button;
      });
      presetsReveal.append(presets);
      presetsToggle.onclick = () => {
        const expanded = presetsReveal.classList.toggle("expanded");
        presetsReveal.inert = !expanded;
        presetsReveal.setAttribute("aria-hidden", String(!expanded));
        presetsToggle.setAttribute("aria-expanded", String(expanded));
      };
      const approachLabel = document.createElement("label");
      approachLabel.className = "eq-approach";
      const approachCaption = document.createElement("span");
      approachCaption.textContent = "EQ approach";
      const approachSelect = document.createElement("select");
      approachSelect.setAttribute("aria-label", "EQ approach");
      for (const approach of EQ_APPROACHES) {
        const option = document.createElement("option");
        option.value = approach.id;
        option.textContent = approach.label;
        approachSelect.append(option);
      }
      approachSelect.onchange = () =>
        audio.setApproach(parseApproach(approachSelect.value));
      approachLabel.append(approachCaption, approachSelect);
      const approachNote = document.createElement("p");
      approachNote.className = "eq-note";
      const level = document.createElement("p");
      level.className = "eq-note";
      const bands = document.createElement("div");
      bands.className = "eq-bands";
      const bandArea = document.createElement("div");
      bandArea.className = "eq-band-area";
      const locked = document.createElement("div");
      locked.className = "eq-preset-overlay";
      locked.textContent = "Select User to adjust EQ.";
      locked.hidden = true;
      bandArea.append(bands, locked);
      const controls = EQ_FREQUENCIES.map((frequency, index) => {
        const label = document.createElement("label");
        label.className = "eq-band";
        const output = document.createElement("output");
        const input = document.createElement("input");
        input.type = "range";
        input.min = "-12";
        input.max = "12";
        input.step = "0.5";
        input.setAttribute("aria-label", `${frequency} Hz gain`);
        input.setAttribute("aria-orientation", "vertical");
        input.oninput = () => audio.setGain(index, Number(input.value));
        const caption = document.createElement("span");
        caption.textContent =
          frequency >= 1000
            ? `${frequency / 1000}k`
            : String(Math.round(frequency));
        label.append(output, input, caption);
        bands.append(label);
        return { input, output };
      });
      const note = document.createElement("p");
      note.className = "eq-note";
      note.textContent =
        "Experimental · ±12 dB. If audio becomes silent, reload this page. Enable only in a test tab.";
      const status = document.createElement("p");
      status.className = "eq-note";
      status.setAttribute("role", "status");
      panel.append(
        heading,
        approachLabel,
        approachNote,
        level,
        presetsReveal,
        bandArea,
        note,
        status,
      );
      group.append(trigger, panel);
      container.append(group);
      const popover = createPopover(trigger, panel);
      presetsReveal.id = `${panel.id}-presets`;
      presetsToggle.setAttribute("aria-controls", presetsReveal.id);
      locked.id = `${panel.id}-preset-lock`;
      bands.setAttribute("aria-describedby", locked.id);
      approachNote.id = `${panel.id}-approach-help`;
      approachSelect.setAttribute("aria-describedby", approachNote.id);
      let available = player.snapshot().available;
      const render = () => {
        const state = audio.snapshot();
        trigger.dataset.modified = String(state.enabled);
        toggle.setAttribute("aria-checked", String(state.requestedEnabled));
        toggle.setAttribute("aria-busy", String(state.pending));
        approachSelect.value = state.approach;
        approachNote.textContent = getApproach(state.approach).description;
        level.textContent = state.enabled
          ? `Overall compensation: ${state.preampDb.toFixed(1)} dB`
          : state.requestedEnabled
            ? "EQ is saved ON. Waiting for video playback or audio activation."
            : "EQ is OFF. Your approach and band settings will apply when enabled.";
        status.textContent = state.error;
        status.hidden = !state.error;
        const isLocked = state.preset !== "user";
        locked.hidden = !isLocked;
        reset.disabled = isLocked;
        reset.title = isLocked
          ? "Select User to reset your EQ."
          : "Reset User EQ";
        presetButtons.forEach((button, index) => {
          button.setAttribute(
            "aria-pressed",
            String(EQ_PRESETS[index]!.id === state.preset),
          );
        });
        controls.forEach(({ input, output }, i) => {
          input.disabled = isLocked;
          input.value = String(state.gains[i]);
          output.textContent = `${(state.gains[i] ?? 0) > 0 ? "+" : ""}${state.gains[i]}`;
          input.setAttribute("aria-valuetext", `${state.gains[i]} dB`);
        });
      };
      const unsubscribe = audio.subscribe(render);
      const unsubscribePlayer = player.subscribe((state) => {
        available = state.available;
        trigger.disabled = !available;
        if (!available) {
          popover.close();
        }
        render();
      });
      return () => {
        unsubscribe();
        unsubscribePlayer();
        popover.dispose();
        group.remove();
      };
    },
  };
}
