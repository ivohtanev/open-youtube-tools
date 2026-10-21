import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type Placement,
} from "@floating-ui/dom";

let nextId = 0;

/** Shared non-modal popover lifecycle for tools and nested settings panels. */
export function createPopover(
  trigger: HTMLButtonElement,
  panel: HTMLElement,
  options: { hover?: boolean; placement?: () => Placement } = {},
) {
  panel.id = `oyt-panel-${++nextId}`;
  panel.classList.add("popover");
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute(
    "aria-label",
    trigger.getAttribute("aria-label") ?? "Tool options",
  );
  trigger.setAttribute("aria-controls", panel.id);
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-haspopup", "dialog");
  const abort = new AbortController();
  const { signal } = abort;
  let cleanup: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  const contains = (event: Event) =>
    event.composedPath().includes(panel) ||
    event.composedPath().includes(trigger);
  const cancelClose = () => clearTimeout(timer);
  const close = () => {
    cancelClose();
    panel
      .querySelectorAll<HTMLElement>(".popover")
      .forEach((child) => child.dispatchEvent(new Event("oyt-close")));
    generation++;
    cleanup?.();
    cleanup = undefined;
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  };
  panel.addEventListener("oyt-close", close, { signal });
  const open = () => {
    cancelClose();
    if (!panel.hidden) return;
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    const current = ++generation;
    cleanup = autoUpdate(
      trigger,
      panel,
      () => {
        void computePosition(trigger, panel, {
          strategy: "fixed",
          placement:
            options.placement?.() ??
            (trigger.closest("[data-placement='bottom']")
              ? "top-start"
              : "bottom-start"),
          middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
        }).then(({ x, y }) => {
          if (current !== generation) return;
          Object.assign(panel.style, { left: `${x}px`, top: `${y}px` });
        });
      },
      {
        elementResize: typeof ResizeObserver !== "undefined",
        layoutShift: typeof IntersectionObserver !== "undefined",
      },
    );
  };
  const scheduleClose = () => {
    cancelClose();
    timer = setTimeout(() => {
      const active =
        panel.getRootNode() instanceof ShadowRoot
          ? (panel.getRootNode() as ShadowRoot).activeElement
          : document.activeElement;
      if (!panel.contains(active) && active !== trigger) close();
    }, 180);
  };
  trigger.addEventListener("click", () => (panel.hidden ? open() : close()), {
    signal,
  });
  trigger.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        open();
        panel.querySelector<HTMLButtonElement>("button")?.focus();
      }
    },
    { signal },
  );
  if (options.hover) {
    trigger.addEventListener("pointerenter", open, { signal });
    trigger.addEventListener("pointerleave", scheduleClose, { signal });
    trigger.addEventListener("focus", open, { signal });
    trigger.addEventListener("focusout", scheduleClose, { signal });
    panel.addEventListener("pointerenter", cancelClose, { signal });
    panel.addEventListener("pointerleave", scheduleClose, { signal });
  }
  panel.addEventListener("focusout", scheduleClose, { signal });
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!contains(event)) close();
    },
    { signal, capture: true },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        !panel.hidden &&
        !panel.querySelector(".popover:not([hidden])")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        trigger.focus();
        close();
      }
    },
    { signal },
  );
  return {
    open,
    close,
    dispose() {
      close();
      abort.abort();
    },
  };
}

export function iconButton(label: string, path: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.setAttribute("aria-label", label);
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  return button;
}
