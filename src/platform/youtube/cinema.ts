import { findVideo } from "./player";

/** Cut clear windows through a dimmer without altering YouTube's stacking contexts. */
export function createCinema(
  doc: Document,
  toolbar: HTMLElement,
  onChange: (active: boolean) => void = () => {},
) {
  const win = doc.defaultView!;
  let active = false;
  let frame = 0;
  const ns = "http://www.w3.org/2000/svg";
  const overlay = doc.createElementNS(ns, "svg");
  overlay.setAttribute("aria-hidden", "true");
  overlay.dataset.oytCinema = "";
  overlay.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483646;";
  const maskId = `oyt-cinema-${crypto.randomUUID()}`;
  overlay.innerHTML = `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="white"/><rect fill="black"/><rect fill="black"/></mask></defs><rect width="100%" height="100%" fill="black" fill-opacity="0.7" mask="url(#${maskId})"/>`;
  const holes = overlay.querySelectorAll("mask rect[fill=black]");
  function stop() {
    active = false;
    win.cancelAnimationFrame(frame);
    overlay.remove();
    onChange(false);
  }
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
      const rect = element.getBoundingClientRect();
      for (const [key, value] of Object.entries({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      }))
        holes[index]!.setAttribute(key, String(value));
    });
    frame = win.requestAnimationFrame(update);
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") stop();
  };
  doc.addEventListener("keydown", onKey);
  doc.addEventListener("yt-navigate-start", stop);
  doc.addEventListener("yt-navigate-finish", stop);
  return {
    get active() {
      return active;
    },
    toggle() {
      if (active) stop();
      else {
        active = true;
        onChange(true);
        update();
      }
    },
    dispose() {
      stop();
      doc.removeEventListener("keydown", onKey);
      doc.removeEventListener("yt-navigate-start", stop);
      doc.removeEventListener("yt-navigate-finish", stop);
    },
  };
}
