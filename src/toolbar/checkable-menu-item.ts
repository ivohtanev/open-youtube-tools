/** A full-row target with native checkbox/radio keyboard and change behavior. */
export function createCheckableMenuItem(options: {
  label: string;
  type?: "checkbox" | "radio";
  name?: string;
  value?: string;
  checked: boolean;
  disabled?: boolean;
  icon?: SVGElement;
  onChange: (checked: boolean) => void;
}) {
  const row = document.createElement("div");
  row.className = "checkable-menu-item";
  const input = document.createElement("input");
  input.type = options.type ?? "checkbox";
  input.checked = options.checked;
  input.disabled = options.disabled ?? false;
  if (options.name) input.name = options.name;
  if (options.value) input.value = options.value;
  input.setAttribute("aria-label", options.label);
  const text = document.createElement("span");
  text.textContent = options.label;
  row.append(input);
  if (options.icon) row.append(options.icon);
  row.append(text);
  // Explicit forwarding also covers SVG targets inside a shadow root.
  row.addEventListener("click", (event) => {
    if (event.target === input || input.disabled) return;
    input.focus();
    input.click();
  });
  input.addEventListener("change", () => options.onChange(input.checked));
  return row;
}
