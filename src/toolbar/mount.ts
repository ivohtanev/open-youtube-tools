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
    hiddenTools?: string[];
    onHiddenToolsChange?: (ids: string[]) => void;
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
  const hiddenTools = new Set(options.hiddenTools ?? []);
  const mounted = new Map<string, () => void>();
  const slots = new Map<string, HTMLElement>();
  for (const tool of tools) {
    const slot = document.createElement("div");
    slot.className = "tool-slot";
    toolbar.append(slot);
    slots.set(tool.id, slot);
  }
  const setEnabled = (tool: Tool, enabled: boolean) => {
    const slot = slots.get(tool.id)!;
    if (enabled && !mounted.has(tool.id))
      mounted.set(tool.id, tool.mount(slot, player));
    if (!enabled) {
      mounted.get(tool.id)?.();
      mounted.delete(tool.id);
    }
    slot.hidden = !enabled;
  };
  tools.forEach((tool) => setEnabled(tool, !hiddenTools.has(tool.id)));
  const settings = iconButton(
    "Toolbar options",
    '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  );
  const menu = document.createElement("div");
  menu.className = "settings-panel";
  const layoutTrigger = document.createElement("button");
  layoutTrigger.textContent = "Position ›";
  layoutTrigger.setAttribute("aria-label", "Position");
  const layoutPanel = document.createElement("div");
  const title = document.createElement("div");
  title.className = "menu-title";
  title.textContent = "Toolbar position";
  const playerOption = document.createElement("button");
  playerOption.textContent = "Attached to video";
  const bottomOption = document.createElement("button");
  bottomOption.textContent = "Bottom of screen";
  layoutPanel.append(title, playerOption, bottomOption);
  const functionsTrigger = document.createElement("button");
  functionsTrigger.textContent = "Functions ›";
  functionsTrigger.setAttribute("aria-label", "Functions");
  const functionsPanel = document.createElement("div");
  for (const tool of tools) {
    const row = document.createElement("label");
    row.className = "function-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !hiddenTools.has(tool.id);
    const icon = iconButton(tool.name, tool.icon).querySelector("svg")!;
    const name = document.createElement("span");
    name.textContent = tool.name;
    row.append(checkbox, icon, name);
    checkbox.onchange = () => {
      setEnabled(tool, checkbox.checked);
      if (checkbox.checked) hiddenTools.delete(tool.id);
      else hiddenTools.add(tool.id);
      options.onHiddenToolsChange?.([...hiddenTools]);
    };
    functionsPanel.append(row);
  }
  menu.append(layoutTrigger, layoutPanel, functionsTrigger, functionsPanel);
  toolbar.append(settings, menu);
  const settingsPopover = createPopover(settings, menu);
  const layoutPopover = createPopover(layoutTrigger, layoutPanel, {
    placement: () => "right-start",
  });
  const functionsPopover = createPopover(functionsTrigger, functionsPanel, {
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
      functionsPopover.close();
      layoutPopover.close();
      settingsPopover.close();
    }
  });
  return () => {
    unsubscribe();
    controller?.dispose();
    functionsPopover.dispose();
    layoutPopover.dispose();
    settingsPopover.dispose();
    [...mounted.values()].reverse().forEach((dispose) => dispose());
    toolbar.remove();
  };
}
