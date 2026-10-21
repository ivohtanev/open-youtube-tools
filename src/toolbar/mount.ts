import type {
  PlayerPort,
  Tool,
  ToolbarPosition,
  ToolbarLayout,
} from "../core/contracts";
import { createPopover, iconButton } from "./popover";

export function mountToolbar(
  container: HTMLElement,
  player: PlayerPort,
  tools: Tool[],
  options: {
    createLayout?: (toolbar: HTMLElement) => ToolbarLayout;
    position?: ToolbarPosition;
    onPositionChange?: (position: ToolbarPosition) => void;
  } = {},
) {
  const toolbar = document.createElement("section");
  toolbar.className = "oyt-toolbar";
  toolbar.setAttribute("aria-label", "Open YouTube Tools");
  container.append(toolbar);
  // Keep interactions from activating the underlying fullscreen player.
  for (const name of [
    "click",
    "dblclick",
    "pointerdown",
    "mousedown",
    "keyup",
  ]) {
    toolbar.addEventListener(name, (event) => event.stopPropagation());
  }
  toolbar.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") event.stopPropagation();
  });
  const disposers = tools.map((tool) => tool.mount(toolbar, player));
  const settings = iconButton(
    "Toolbar options",
    '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  );
  const menu = document.createElement("div");
  menu.className = "settings-panel";
  const layoutTrigger = document.createElement("button");
  layoutTrigger.textContent = "Layout ›";
  layoutTrigger.setAttribute("aria-label", "Layout");
  const layoutPanel = document.createElement("div");
  const title = document.createElement("div");
  title.className = "menu-title";
  title.textContent = "Toolbar position";
  const playerOption = document.createElement("button");
  playerOption.textContent = "Attached to video";
  const bottomOption = document.createElement("button");
  bottomOption.textContent = "Bottom of screen";
  layoutPanel.append(title, playerOption, bottomOption);
  menu.append(layoutTrigger, layoutPanel);
  toolbar.append(settings, menu);
  const settingsPopover = createPopover(settings, menu);
  const layoutPopover = createPopover(layoutTrigger, layoutPanel, {
    placement: () => "right-start",
  });
  const controller = options.createLayout?.(toolbar);
  const select = (position: ToolbarPosition, persist = true) => {
    playerOption.setAttribute("aria-pressed", String(position === "player"));
    bottomOption.setAttribute("aria-pressed", String(position === "bottom"));
    toolbar.dataset.placement = position;
    controller?.setPosition(position);
    if (persist) options.onPositionChange?.(position);
  };
  playerOption.onclick = () => select("player");
  bottomOption.onclick = () => select("bottom");
  select(options.position ?? "player", false);
  const unsubscribe = player.subscribe(({ available }) => {
    toolbar.hidden = !available;
    if (!available) {
      layoutPopover.close();
      settingsPopover.close();
    }
  });
  return () => {
    unsubscribe();
    controller?.dispose();
    layoutPopover.dispose();
    settingsPopover.dispose();
    disposers.reverse().forEach((dispose) => dispose());
    toolbar.remove();
  };
}
