import { afterEach, expect, it, vi } from "vitest";
import { createCheckableMenuItem } from "./checkable-menu-item";

afterEach(() => document.body.replaceChildren());

it("toggles once from row padding, text, SVG and the input in a shadow root", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = host.attachShadow({ mode: "open" });
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  icon.append(path);
  const change = vi.fn();
  const row = createCheckableMenuItem({
    label: "Feature",
    checked: false,
    icon,
    onChange: change,
  });
  root.append(row);
  const input = row.querySelector("input")!;
  for (const target of [row, row.querySelector("span")!, path, input]) {
    const before = input.checked;
    target.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true }),
    );
    expect(input.checked).toBe(!before);
    expect(change).toHaveBeenLastCalledWith(!before);
  }
  expect(change).toHaveBeenCalledTimes(4);
  input.disabled = true;
  row.click();
  expect(change).toHaveBeenCalledTimes(4);
});

it("uses native radio group selection and does not toggle a selected radio off", () => {
  const change = vi.fn();
  const first = createCheckableMenuItem({
    label: "First",
    type: "radio",
    name: "mode",
    value: "first",
    checked: true,
    onChange: change,
  });
  const second = createCheckableMenuItem({
    label: "Second",
    type: "radio",
    name: "mode",
    value: "second",
    checked: false,
    onChange: change,
  });
  document.body.append(first, second);
  second.click();
  second.click();
  expect(first.querySelector("input")!.checked).toBe(false);
  expect(second.querySelector("input")!.checked).toBe(true);
  expect(change).toHaveBeenCalledExactlyOnceWith(true);
});
