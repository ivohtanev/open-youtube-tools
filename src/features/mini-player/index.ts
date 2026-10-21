import type { MiniPlayerPort } from "../../core/contracts";
import { iconButton } from "../../toolbar/popover";

export function mountMiniPlayer(
  container: HTMLElement,
  player: MiniPlayerPort,
) {
  const overlay = document.createElement("section");
  overlay.className = "oyt-mini-player";
  overlay.setAttribute("aria-label", "Mini player");
  const useTopLayer = typeof overlay.showPopover === "function";
  if (useTopLayer) overlay.setAttribute("popover", "manual");
  let showing = false;
  const toggle = iconButton("Play", "");
  toggle.classList.add("mini-player-toggle");
  toggle.onclick = () => player.togglePlayback();
  const progress = document.createElement("div");
  progress.className = "mini-player-progress";
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-label", "Video progress");
  progress.setAttribute("aria-valuemin", "0");
  progress.setAttribute("aria-valuemax", "100");
  const elapsed = document.createElement("div");
  progress.append(elapsed);
  overlay.append(toggle, progress);
  for (const name of [
    "click",
    "dblclick",
    "pointerdown",
    "mousedown",
    "keydown",
    "keyup",
  ]) {
    overlay.addEventListener(name, (event) => event.stopPropagation());
  }
  container.append(overlay);
  const unsubscribe = player.subscribe(
    ({ active, top, left, paused, progress: value }) => {
      overlay.hidden = !active;
      if (useTopLayer && active !== showing) {
        if (active) overlay.showPopover();
        else overlay.hidePopover();
      }
      showing = active;
      overlay.style.top = `${top}px`;
      overlay.style.left = `${left}px`;
      toggle.setAttribute("aria-label", paused ? "Play" : "Pause");
      toggle.querySelector("svg")!.innerHTML = paused
        ? '<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>'
        : '<path d="M7 5v14M17 5v14" stroke-width="5"/>';
      elapsed.style.transform = `scaleX(${value})`;
      progress.setAttribute("aria-valuenow", String(Math.round(value * 100)));
    },
  );
  return () => {
    unsubscribe();
    if (useTopLayer && showing) overlay.hidePopover();
    overlay.remove();
  };
}
