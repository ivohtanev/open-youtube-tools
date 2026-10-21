import type { MountCinema, Tool } from "../../core/contracts";
import { iconButton } from "../../toolbar/popover";

const icon =
  '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4m-4 6h4M17 9h4m-4 6h4"/>';
export function cinema(mountCinema: MountCinema): Tool {
  return {
    id: "cinema",
    name: "Cinema mode",
    icon,
    mount(container, player) {
      const button = iconButton("Cinema mode", icon);
      const controller = mountCinema(
        container.closest<HTMLElement>(".oyt-toolbar")!,
        (active) => {
          button.setAttribute("aria-pressed", String(active));
          button.dataset.modified = String(active);
        },
      );
      button.setAttribute("aria-pressed", "false");
      button.onclick = () => controller.toggle();
      container.append(button);
      const unsubscribe = player.subscribe(({ available }) => {
        button.disabled = !available;
      });
      return () => {
        unsubscribe();
        controller.dispose();
        button.remove();
      };
    },
  };
}
