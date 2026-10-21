import type { Tool } from "../../core/contracts";
import { createPopover, iconButton } from "../../toolbar/popover";

const icon =
  '<path d="M8 6l2-3h4l2 3h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/><circle cx="12" cy="12" r="4"/>';
export function screenshot(save: () => Promise<void>): Tool {
  return {
    id: "screenshot",
    name: "Screenshot",
    icon,
    mount(container, player) {
      const button = iconButton("Save video screenshot", icon);
      const error = document.createElement("div");
      const message = document.createElement("span");
      message.setAttribute("role", "status");
      error.append(message);
      container.append(button, error);
      const popover = createPopover(button, error, { triggerOnClick: false });
      // This action captures immediately; the popover is reserved for failures.
      button.removeAttribute("aria-haspopup");
      let disposed = false;
      let busy = false;
      const unsubscribe = player.subscribe(({ available }) => {
        button.disabled = busy || !available;
      });
      button.onclick = async () => {
        if (busy) return;
        popover.close();
        busy = true;
        button.disabled = true;
        try {
          await save();
        } catch (reason) {
          if (!disposed) {
            message.textContent =
              reason instanceof Error
                ? reason.message
                : "Could not save screenshot. Please try again.";
            popover.open();
          }
        } finally {
          busy = false;
          if (!disposed) button.disabled = !player.snapshot().available;
        }
      };
      return () => {
        disposed = true;
        unsubscribe();
        popover.dispose();
        button.remove();
        error.remove();
      };
    },
  };
}
