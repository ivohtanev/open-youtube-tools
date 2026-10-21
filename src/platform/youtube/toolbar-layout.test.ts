import { afterEach, expect, it, vi } from "vitest";
import { positionToolbar } from "./toolbar-layout";

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

it("centers under the player in default and theater modes, persists selection through fullscreen and follows controls", async () => {
  document.body.innerHTML =
    '<ytd-watch-flexy><div id="full-bleed-container"></div><div id="player"><div id="movie_player"></div></div></ytd-watch-flexy><div id="host"><section></section></div>';
  const movie = document.querySelector<HTMLElement>("#movie_player")!;
  vi.spyOn(movie, "getBoundingClientRect").mockReturnValue({
    left: 100,
    bottom: 500,
    width: 800,
  } as DOMRect);
  const host = document.querySelector<HTMLElement>("#host")!;
  const toolbar = host.querySelector("section")!;
  const layout = positionToolbar(toolbar, host, "player");
  expect(toolbar.style.top).toBe("500px");
  expect(toolbar.style.left).toBe("500px");
  expect(host.previousElementSibling?.id).toBe("player");
  document.querySelector("ytd-watch-flexy")!.setAttribute("theater", "");
  layout.setPosition("player");
  expect(toolbar.style.left).toBe("500px");
  expect(host.previousElementSibling?.id).toBe("full-bleed-container");
  layout.setPosition("bottom");
  expect(toolbar.style.bottom).toBe("0px");
  expect(host.style.getPropertyValue("--oyt-host-height")).toBe("0px");
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => movie,
  });
  layout.setPosition("player");
  expect(host.parentElement).toBe(movie);
  expect(toolbar.dataset.fullscreen).toBe("true");
  movie.classList.add("ytp-autohide");
  layout.setPosition("player");
  expect(toolbar.inert).toBe(true);
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => null,
  });
  layout.setPosition("player");
  expect(toolbar.dataset.placement).toBe("player");
  expect(toolbar.inert).toBe(false);
  document.querySelector("ytd-watch-flexy")!.removeAttribute("theater");
  document
    .querySelector("ytd-watch-flexy")!
    .setAttribute("data-oyt-expanded", "");
  layout.setPosition("player");
  expect(toolbar.style.top).toBe("500px");
  expect(toolbar.style.right).toBe("auto");
  expect(toolbar.style.left).toBe("500px");
  expect(toolbar.style.transform).toBe("translateX(-50%)");
  expect(host.style.getPropertyValue("--oyt-host-height")).toBe("44px");
  document
    .querySelector("ytd-watch-flexy")!
    .removeAttribute("data-oyt-expanded");
  layout.setPosition("player");
  expect(toolbar.style.top).toBe("500px");
  expect(toolbar.style.right).toBe("auto");
  expect(toolbar.style.left).toBe("500px");
  expect(toolbar.style.transform).toBe("translateX(-50%)");
  layout.dispose();
});
