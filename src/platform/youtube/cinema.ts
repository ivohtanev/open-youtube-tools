import { findVideo } from "./player";
import { clearWindow } from "./cinema-geometry";

/** Cut clear windows through a dimmer without altering YouTube's stacking contexts. */
export function createCinema(
  doc: Document,
  toolbar: HTMLElement,
  onChange: (active: boolean) => void = () => {},
) {
  const win = doc.defaultView!;
  let active = false;
  let frame = 0;
  let removal: ReturnType<typeof setTimeout> | undefined;
  const ns = "http://www.w3.org/2000/svg";
  const overlay = doc.createElementNS(ns, "svg");
  overlay.setAttribute("aria-hidden", "true");
  overlay.dataset.oytCinema = "";
  overlay.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483646;";
  const maskId = `oyt-cinema-${crypto.randomUUID()}`;
  overlay.innerHTML = `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="white"/><g data-hole="player"/><g data-hole="toolbar"/></mask></defs><rect width="100%" height="100%" fill="black" fill-opacity="0.87" mask="url(#${maskId})"/>`;
  const holes = overlay.querySelectorAll("[data-hole]");
  const outlines = ["", ""];
  const style = doc.createElementNS(ns, "style");
  style.textContent = `
    svg[data-oyt-cinema] { opacity: 0; transition: opacity 180ms ease; }
    svg[data-oyt-cinema][data-active] { opacity: 1; }
    @starting-style { svg[data-oyt-cinema][data-active] { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      svg[data-oyt-cinema] { transition: none; }
    }
  `;
  overlay.append(style);
  function stop(animate = false) {
    active = false;
    win.cancelAnimationFrame(frame);
    clearTimeout(removal);
    overlay.removeAttribute("data-active");
    delete toolbar.dataset.cinema;
    if (animate) removal = setTimeout(() => overlay.remove(), 180);
    else overlay.remove();
    onChange(false);
  }
  const reset = () => stop();
  function update() {
    if (!active) return;
    const video = findVideo(doc);
    if (!video) {
      stop();
      return;
    }
    const parent = doc.fullscreenElement ?? doc.body;
    if (overlay.parentElement !== parent) parent.append(overlay);
    const picture = video.hasAttribute("data-oyt-mini-player")
      ? video
      : video.closest("#movie_player")!;
    [picture, toolbar].forEach((element, index) => {
      const outline = clearWindow(element, `${maskId}-${index}`);
      if (outlines[index] !== outline) {
        holes[index]!.innerHTML = outline;
        outlines[index] = outline;
      }
    });
    frame = win.requestAnimationFrame(update);
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") stop();
  };
  doc.addEventListener("keydown", onKey);
  doc.addEventListener("yt-navigate-start", reset);
  doc.addEventListener("yt-navigate-finish", reset);
  return {
    get active() {
      return active;
    },
    toggle() {
      if (active) stop(true);
      else {
        clearTimeout(removal);
        active = true;
        overlay.setAttribute("data-active", "");
        toolbar.dataset.cinema = "true";
        onChange(true);
        update();
      }
    },
    dispose() {
      stop();
      doc.removeEventListener("keydown", onKey);
      doc.removeEventListener("yt-navigate-start", reset);
      doc.removeEventListener("yt-navigate-finish", reset);
    },
  };
}
