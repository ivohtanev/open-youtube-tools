import {
  arrow,
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
  options: { placement?: () => Placement; triggerOnClick?: boolean } = {},
) {
  panel.id = `oyt-panel-${++nextId}`;
  panel.classList.add("popover");
  const pointer = document.createElement("span");
  pointer.className = "popover-arrow";
  pointer.setAttribute("aria-hidden", "true");
  panel.append(pointer);
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
          middleware: [
            offset(10),
            flip({ padding: 8 }),
            shift({ padding: 8 }),
            arrow({ element: pointer, padding: 12 }),
          ],
        }).then(({ x, y, placement, middlewareData }) => {
          if (current !== generation) return;
          Object.assign(panel.style, { left: `${x}px`, top: `${y}px` });
          const side = placement.split("-")[0] as
            "top" | "bottom" | "left" | "right";
          const opposite = {
            top: "bottom",
            bottom: "top",
            left: "right",
            right: "left",
          }[side];
          Object.assign(pointer.style, {
            left:
              middlewareData.arrow?.x == null
                ? ""
                : middlewareData.arrow.x + "px",
            top:
              middlewareData.arrow?.y == null
                ? ""
                : middlewareData.arrow.y + "px",
            right: "",
            bottom: "",
          });
          pointer.style.setProperty(opposite, "-5px");
          pointer.dataset.side = side;
        });
      },
      {
        elementResize: typeof ResizeObserver !== "undefined",
        layoutShift: typeof IntersectionObserver !== "undefined",
      },
    );
  };
  const scheduleClose = (event: FocusEvent) => {
    cancelClose();
    // Pointer clicks on panel padding or disabled controls can clear focus.
    // Only dismiss for an actual focus move outside this panel and its trigger.
    const next = event.relatedTarget;
    if (!(next instanceof Node) || panel.contains(next) || next === trigger)
      return;
    timer = setTimeout(() => {
      const active =
        panel.getRootNode() instanceof ShadowRoot
          ? (panel.getRootNode() as ShadowRoot).activeElement
          : document.activeElement;
      if (!panel.contains(active) && active !== trigger) close();
    }, 180);
  };
  if (options.triggerOnClick !== false)
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
      pointer.remove();
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
