import type { Tool } from "../../core/contracts";

export const playbackSpeed: Tool = {
  id: "playback-speed",
  mount(container, player) {
    const group = document.createElement("div");
    group.className = "speed-control";
    const label = document.createElement("span");
    label.textContent = "Speed";
    const slower = document.createElement("button");
    slower.textContent = "−";
    slower.setAttribute("aria-label", "Decrease playback speed");
    const reset = document.createElement("button");
    reset.setAttribute("aria-label", "Reset playback speed to 1×");
    reset.title = "Reset to normal speed";
    const faster = document.createElement("button");
    faster.textContent = "+";
    faster.setAttribute("aria-label", "Increase playback speed");
    const status = document.createElement("span");
    status.className = "sr-only";
    status.setAttribute("role", "status");
    const change = (delta: number) => {
      const rate = player.snapshot().playbackRate;
      player.setPlaybackRate(
        Math.min(2, Math.max(0.25, Math.round((rate + delta) * 100) / 100)),
      );
    };
    slower.onclick = () => change(-0.25);
    reset.onclick = () => player.setPlaybackRate(1);
    faster.onclick = () => change(0.25);
    group.append(label, slower, reset, faster, status);
    container.append(group);
    const unsubscribe = player.subscribe(({ available, playbackRate }) => {
      slower.disabled = !available || playbackRate <= 0.25;
      faster.disabled = !available || playbackRate >= 2;
      reset.disabled = !available;
      reset.textContent = `${Number(playbackRate.toFixed(2))}×`;
      status.textContent = available
        ? `Playback speed ${playbackRate} times`
        : "No video available";
    });
    return () => {
      unsubscribe();
      slower.onclick = reset.onclick = faster.onclick = null;
      group.remove();
    };
  },
};
