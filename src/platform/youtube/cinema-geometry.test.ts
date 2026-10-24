import { afterEach, expect, it, vi } from "vitest";
import { clearWindow, roundedOutline } from "./cinema-geometry";

function box(element: HTMLElement, width = 200, height = 100) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    left: 10,
    top: 20,
    width,
    height,
  } as DOMRect);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
  document.body.removeAttribute("style");
  document.documentElement.removeAttribute("style");
  vi.restoreAllMocks();
});

it("preserves independent elliptical and percentage corners", () => {
  const element = box(document.createElement("div"));
  document.body.append(element);
  element.style.borderTopLeftRadius = "10% 20%";
  element.style.borderTopRightRadius = "30px 10px";
  element.style.borderBottomRightRadius = "0px";
  element.style.borderBottomLeftRadius = "8px 12px";
  expect(roundedOutline(element)).toBe(
    "M 30 20 H 180 A 30 10 0 0 1 210 30 V 120 L 210 120 H 18 A 8 12 0 0 1 10 108 V 40 A 20 20 0 0 1 30 20 Z",
  );
});

it("normalizes overlapping radii using the CSS common scale factor", () => {
  const element = box(document.createElement("div"));
  document.body.append(element);
  for (const corner of ["top-left", "top-right", "bottom-right", "bottom-left"])
    element.style.setProperty(`border-${corner}-radius`, "200px");
  expect(roundedOutline(element)).toContain("A 50 50");
  expect(roundedOutline(element)).toContain("M 60 20 H 160");
});

it("uses current dimensions for percentages and accounts for CSS scaling", () => {
  const element = box(document.createElement("div"), 400, 200);
  document.body.append(element);
  Object.defineProperties(element, {
    offsetWidth: { value: 200 },
    offsetHeight: { value: 100 },
  });
  element.style.borderTopLeftRadius = "10% 8px";
  expect(roundedOutline(element)).toContain("M 50 20");
  expect(roundedOutline(element)).toContain("A 40 16");
});

it("intersects all clipping ancestors without inheriting unrelated rounding", () => {
  const parent = box(document.createElement("div"));
  const element = box(document.createElement("div"));
  parent.style.overflow = "hidden";
  parent.style.borderTopLeftRadius = "16px";
  parent.append(element);
  document.body.append(parent);
  expect(clearWindow(element, "test")).toContain('clip-path="url(#test-0)"');
  expect(clearWindow(element, "test")).toContain("A 16 16");
  parent.style.overflow = "visible";
  expect(clearWindow(element, "test")).not.toContain("clipPath");
});

it("ignores zero-height document boxes while preserving rounded player clipping", () => {
  const parent = box(document.createElement("div"));
  const element = box(document.createElement("div"));
  parent.style.overflow = "hidden";
  parent.style.borderTopLeftRadius = "12px";
  parent.append(element);
  document.body.append(parent);
  // YouTube positions its app absolutely, leaving the scrolling body empty.
  box(document.body, 1520, 0);
  box(document.documentElement, 1520, 0);
  document.body.style.overflowX = "auto";
  document.body.style.overflowY = "scroll";
  document.documentElement.style.overflow = "auto";

  const window = clearWindow(element, "test");
  expect(window.match(/<clipPath /g)).toHaveLength(1);
  expect(window).toContain("A 12 12");
  expect(window).toContain('fill="black"');
  expect(window).not.toContain("1520");
});
