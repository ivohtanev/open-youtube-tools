import { afterEach, expect, it, vi } from "vitest";
import { createPopover } from "./popover";

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

it.each([false, true])(
  "keeps nested panels open after focus clears inside them (shadow: %s)",
  async (shadow) => {
    vi.useFakeTimers();
    const host = document.createElement("div");
    document.body.append(host);
    const root = shadow ? host.attachShadow({ mode: "open" }) : host;
    const trigger = document.createElement("button");
    const panel = document.createElement("div");
    const nestedTrigger = document.createElement("button");
    const nested = document.createElement("div");
    const control = document.createElement("button");
    const select = document.createElement("select");
    select.append(new Option("Default", "default"));
    nested.append(control, select);
    panel.append(nestedTrigger, nested);
    root.append(trigger, panel);
    const parent = createPopover(trigger, panel);
    const child = createPopover(nestedTrigger, nested);
    try {
      parent.open();
      child.open();
      for (const target of [control, select]) {
        target.focus();
        target.blur();
        nested.dispatchEvent(
          new Event("pointerdown", { bubbles: true, composed: true }),
        );
        await vi.advanceTimersByTimeAsync(250);
        expect(panel.hidden).toBe(false);
        expect(nested.hidden).toBe(false);
      }
      control.disabled = true;
      control.dispatchEvent(
        new Event("pointerdown", { bubbles: true, composed: true }),
      );
      await vi.advanceTimersByTimeAsync(250);
      expect(nested.hidden).toBe(false);
      // Blank space in the main menu must not dismiss the entire menu.
      panel.dispatchEvent(
        new Event("pointerdown", { bubbles: true, composed: true }),
      );
      expect(panel.hidden).toBe(false);
      child.open();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(nested.hidden).toBe(true);
      expect(panel.hidden).toBe(false);
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      expect(panel.hidden).toBe(true);
      parent.open();
      const outside = document.createElement("button");
      root.append(outside);
      nestedTrigger.focus();
      outside.focus();
      await vi.advanceTimersByTimeAsync(250);
      expect(panel.hidden).toBe(true);
    } finally {
      child.dispose();
      parent.dispose();
    }
  },
);
