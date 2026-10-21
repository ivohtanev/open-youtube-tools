import type { PlayerPort, Tool } from "../core/contracts";

export function mountToolbar(
  container: HTMLElement,
  player: PlayerPort,
  tools: Tool[],
) {
  const toolbar = document.createElement("section");
  toolbar.className = "oyt-toolbar";
  toolbar.setAttribute("aria-label", "Open YouTube Tools");
  const brand = document.createElement("span");
  brand.className = "brand";
  brand.textContent = "▶ OYT";
  toolbar.append(brand);
  container.append(toolbar);
  const disposers = tools.map((tool) => tool.mount(toolbar, player));
  const unsubscribe = player.subscribe(({ available }) => {
    toolbar.hidden = !available;
  });
  return () => {
    unsubscribe();
    disposers.reverse().forEach((dispose) => dispose());
    toolbar.remove();
  };
}
