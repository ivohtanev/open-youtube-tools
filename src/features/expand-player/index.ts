import type { ExpandPlayerPort, Tool } from "../../core/contracts";
import { iconButton } from "../../toolbar/popover";

const expandIcon =
  '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><path d="m3 3 6 6m12-6-6 6M3 21l6-6m12 6-6-6"/>';
const shrinkIcon = '<path d="M3 9h6V3m6 0v6h6M9 21v-6H3m18 0h-6v6"/>';

export function expandPlayer(port: ExpandPlayerPort): Tool {
  return {
    id: "expand-player",
    name: "Expand / shrink video",
    icon: expandIcon,
    mount(container) {
      const button = iconButton("Expand video", expandIcon);
      button.onclick = () => port.toggle();
      container.append(button);
      const unsubscribe = port.subscribe(({ available, expanded }) => {
        button.disabled = !available;
        button.setAttribute(
          "aria-label",
          expanded ? "Shrink video" : "Expand video",
        );
        button.title = expanded ? "Shrink video" : "Expand video";
        button.setAttribute("aria-pressed", String(expanded));
        button.dataset.modified = String(expanded);
        button.innerHTML = iconButton(
          "",
          expanded ? shrinkIcon : expandIcon,
        ).innerHTML;
      });
      return () => {
        unsubscribe();
        port.reset();
        button.remove();
      };
    },
  };
}
