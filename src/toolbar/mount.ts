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
    miniPlayerEnabled?: boolean;
    onMiniPlayerEnabledChange?: (enabled: boolean) => void;
  } = {},
) {
  const toolbar = document.createElement("section");
  toolbar.className = "oyt-toolbar";
  toolbar.setAttribute("aria-label", "Open YouTube Tools");
  container.append(toolbar);
  // Keep interactions from activating the underlying fullscreen player.
  for (const name of ["click", "dblclick", "pointerdown", "mousedown"]) {
    toolbar.addEventListener(name, (event) => event.stopPropagation());
  }
  const isNativeModeShortcut = (event: KeyboardEvent) =>
    event.key.toLowerCase() === "t" &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.isComposing;
  // Keep YouTube's mode shortcut available after clicking a focused tool button.
  toolbar.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" && !isNativeModeShortcut(event))
      event.stopPropagation();
  });
  toolbar.addEventListener("keyup", (event) => {
    if (!isNativeModeShortcut(event)) event.stopPropagation();
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
    '<path d="m9 3-.5 2-2 1-2-.5-2 3.5L4 10.5v3L2.5 15l2 3.5 2-.5 2 1 .5 2h6l.5-2 2-1 2 .5 2-3.5-1.5-1.5v-3L21.5 9l-2-3.5-2 .5-2-1-.5-2Z"/><circle cx="12" cy="12" r="3"/>',
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
  const playbackTrigger = document.createElement("button");
  playbackTrigger.textContent = "Player Playback ›";
  playbackTrigger.setAttribute("aria-label", "Player Playback");
  const playbackPanel = document.createElement("div");
  const miniPlayerRow = document.createElement("label");
  miniPlayerRow.className = "function-option";
  const miniPlayerCheckbox = document.createElement("input");
  miniPlayerCheckbox.type = "checkbox";
  miniPlayerCheckbox.checked = options.miniPlayerEnabled !== false;
  miniPlayerCheckbox.onchange = () =>
    options.onMiniPlayerEnabledChange?.(miniPlayerCheckbox.checked);
  miniPlayerRow.append(miniPlayerCheckbox, "Mini player");
  playbackPanel.append(miniPlayerRow);
  menu.append(
    layoutTrigger,
    layoutPanel,
    functionsTrigger,
    functionsPanel,
    playbackTrigger,
    playbackPanel,
  );
  toolbar.append(settings, menu);
  const settingsPopover = createPopover(settings, menu);
  const layoutPopover = createPopover(layoutTrigger, layoutPanel, {
    placement: () => "right-start",
  });
  const functionsPopover = createPopover(functionsTrigger, functionsPanel, {
    placement: () => "right-start",
  });
  const playbackPopover = createPopover(playbackTrigger, playbackPanel, {
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
      playbackPopover.close();
      functionsPopover.close();
      layoutPopover.close();
      settingsPopover.close();
    }
  });
  return () => {
    unsubscribe();
    controller?.dispose();
    playbackPopover.dispose();
    functionsPopover.dispose();
    layoutPopover.dispose();
    settingsPopover.dispose();
    [...mounted.values()].reverse().forEach((dispose) => dispose());
    toolbar.remove();
  };
}
