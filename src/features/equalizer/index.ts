import type { Tool } from "../../core/contracts";
import { EQ_FREQUENCIES, type EqualizerPort } from "../../core/equalizer";
import { createPopover, iconButton } from "../../toolbar/popover";

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
      toggle.setAttribute("aria-label", "Enable equalizer");
      toggle.onclick = () => {
        void audio.setEnabled(!audio.snapshot().enabled);
      };
      const reset = document.createElement("button");
      reset.textContent = "Reset";
      reset.onclick = () => audio.reset();
      heading.append(title, toggle, reset);
      const bands = document.createElement("div");
      bands.className = "eq-bands";
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
        "Experimental · ±12 dB · Auto headroom. If audio becomes silent, reload this page. Enable only in a test tab.";
      const status = document.createElement("p");
      status.className = "eq-note";
      status.setAttribute("role", "status");
      panel.append(heading, bands, note, status);
      group.append(trigger, panel);
      container.append(group);
      const popover = createPopover(trigger, panel);
      let available = player.snapshot().available;
      const render = () => {
        const state = audio.snapshot();
        trigger.dataset.modified = String(state.enabled);
        toggle.textContent = state.pending
          ? "Starting…"
          : state.enabled
            ? "ON"
            : "OFF";
        toggle.setAttribute("aria-pressed", String(state.enabled));
        toggle.disabled = !available || state.pending;
        status.textContent = state.error;
        status.hidden = !state.error;
        controls.forEach(({ input, output }, i) => {
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
          void audio.setEnabled(false);
          popover.close();
        }
        render();
      });
      return () => {
        unsubscribe();
        unsubscribePlayer();
        void audio.setEnabled(false);
        popover.dispose();
        group.remove();
      };
    },
  };
}
