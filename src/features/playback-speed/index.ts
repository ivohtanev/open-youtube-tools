import type { Tool } from "../../core/contracts";
import { createPopover, iconButton } from "../../toolbar/popover";

export function stepSpeed(rate: number, direction: number) {
  const scaled = Math.round(rate * 100) / 25;
  return Math.min(
    2,
    Math.max(
      0.25,
      (direction > 0 ? Math.floor(scaled) + 1 : Math.ceil(scaled) - 1) / 4,
    ),
  );
}

export const playbackSpeed: Tool = {
  id: "playback-speed",
  name: "Playback speed",
  icon: '<path d="M4 18a9 9 0 1 1 16 0Z"/><path d="m12 13 5-5"/><circle cx="12" cy="13" r="1"/>',
  mount(container, player) {
    const group = document.createElement("div");
    group.className = "tool";
    const trigger = iconButton("Change Speed with Scroll", playbackSpeed.icon);
    const panel = document.createElement("div");
    const heading = document.createElement("div");
    heading.className = "panel-heading";
    const label = document.createElement("span");
    label.textContent = "Change Speed with Scroll";
    const expand = iconButton(
      "Expand playback speed controls",
      '<path d="m7 10 5 5 5-5"/>',
    );
    expand.classList.add("disclosure");
    expand.setAttribute("aria-expanded", "false");
    const reveal = document.createElement("div");
    reveal.className = "reveal";
    reveal.inert = true;
    const controls = document.createElement("div");
    controls.className = "speed-control";
    const slower = document.createElement("button");
    slower.textContent = "−";
    slower.setAttribute("aria-label", "Decrease playback speed");
    const reset = document.createElement("button");
    reset.setAttribute("aria-label", "Reset playback speed to 1×");
    const faster = document.createElement("button");
    faster.textContent = "+";
    faster.setAttribute("aria-label", "Increase playback speed");
    const status = document.createElement("span");
    status.className = "sr-only";
    status.setAttribute("role", "status");
    slower.onclick = () =>
      player.setPlaybackRate(stepSpeed(player.snapshot().playbackRate, -1));
    faster.onclick = () =>
      player.setPlaybackRate(stepSpeed(player.snapshot().playbackRate, 1));
    reset.onclick = () => player.setPlaybackRate(1);
    expand.onclick = () => {
      const expanded = expand.getAttribute("aria-expanded") !== "true";
      expand.setAttribute("aria-expanded", String(expanded));
      reveal.classList.toggle("expanded", expanded);
      reveal.inert = !expanded;
    };
    trigger.addEventListener(
      "wheel",
      (event) => {
        if (event.ctrlKey || !event.deltaY || !player.snapshot().available)
          return;
        event.preventDefault();
        event.stopPropagation();
        const rate = player.snapshot().playbackRate;
        player.setPlaybackRate(
          Math.min(
            2,
            Math.max(
              0.25,
              Math.round((rate + (event.deltaY < 0 ? 0.02 : -0.02)) * 100) /
                100,
            ),
          ),
        );
      },
      { passive: false },
    );
    heading.append(label, expand);
    controls.append(slower, reset, faster);
    reveal.append(controls);
    panel.append(heading, reveal);
    group.append(trigger, panel, status);
    container.append(group);
    const popover = createPopover(trigger, panel);
    const unsubscribe = player.subscribe(({ available, playbackRate }) => {
      trigger.disabled = !available;
      trigger.dataset.modified = String(playbackRate !== 1);
      slower.disabled = !available || playbackRate <= 0.25;
      faster.disabled = !available || playbackRate >= 2;
      reset.disabled = !available;
      reset.textContent = `${playbackRate.toFixed(2)}×`;
      status.textContent = available
        ? `Playback speed ${playbackRate} times`
        : "No video available";
      if (!available) popover.close();
    });
    return () => {
      unsubscribe();
      popover.dispose();
      group.remove();
    };
  },
};
