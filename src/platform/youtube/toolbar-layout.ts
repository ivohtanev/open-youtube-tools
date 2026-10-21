import type { ToolbarPosition } from "../../core/contracts";

/** Owns YouTube layout selectors, fullscreen hosting and native controls visibility. */
export function positionToolbar(
  toolbar: HTMLElement,
  host: HTMLElement,
  initial: ToolbarPosition,
) {
  let position = initial;
  let frame = 0;
  let disposed = false;
  const originalParent = host.parentElement!;
  const resize =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
  let observed: HTMLElement | null = null;
  function update() {
    frame = 0;
    if (disposed) return;
    const movie = document.querySelector<HTMLElement>("#movie_player");
    const watch = document.querySelector("ytd-watch-flexy");
    const fullscreen = document.fullscreenElement;
    const theater = watch?.hasAttribute("theater") ?? false;
    if (movie !== observed) {
      resize?.disconnect();
      if (movie) resize?.observe(movie);
      observed = movie;
    }
    const anchor = document.querySelector(
      theater ? "#full-bleed-container" : "ytd-watch-flexy #player",
    );
    const fullscreenPlayer =
      !!fullscreen &&
      !!movie &&
      (fullscreen === movie || fullscreen.contains(movie));
    if (fullscreenPlayer) {
      if (host.parentElement !== fullscreen) fullscreen!.append(host);
    } else if (position === "player" && anchor?.parentElement) {
      if (anchor.nextElementSibling !== host) anchor.after(host);
    } else if (host.parentElement !== originalParent)
      originalParent.append(host);
    host.style.setProperty("display", "block", "important");
    host.style.setProperty(
      "--oyt-host-height",
      position === "player" && !fullscreenPlayer && !!anchor && !toolbar.hidden
        ? "44px"
        : "0px",
      "important",
    );
    const bottom = position === "bottom" || fullscreenPlayer;
    toolbar.dataset.placement = bottom ? "bottom" : "player";
    toolbar.dataset.fullscreen = String(fullscreenPlayer);
    const hiddenControls =
      fullscreenPlayer && !!movie?.classList.contains("ytp-autohide");
    toolbar.dataset.controlsHidden = String(hiddenControls);
    toolbar.inert = hiddenControls;
    const rect = movie?.getBoundingClientRect();
    Object.assign(toolbar.style, {
      top: bottom ? "auto" : `${rect?.bottom ?? 0}px`,
      bottom: bottom ? "0px" : "auto",
      right: "auto",
      left: `${rect && (!bottom || fullscreenPlayer) ? rect.left + rect.width / 2 : innerWidth / 2}px`,
      transform: "translateX(-50%)",
      visibility:
        !bottom && (!rect || rect.bottom < 0 || rect.bottom > innerHeight)
          ? "hidden"
          : "",
    });
  }
  function schedule() {
    if (!frame && !disposed) frame = requestAnimationFrame(update);
  }
  const mutations = new MutationObserver((records) => {
    if (
      records.some(
        (record) =>
          record.type === "childList" ||
          (record.target instanceof Element &&
            record.target.matches("#movie_player, ytd-watch-flexy")),
      )
    )
      schedule();
  });
  mutations.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "theater", "hidden", "data-oyt-expanded"],
  });
  document.addEventListener("fullscreenchange", schedule);
  document.addEventListener("yt-navigate-finish", schedule);
  window.addEventListener("resize", schedule);
  window.addEventListener("scroll", schedule, true);
  update();
  return {
    setPosition(next: ToolbarPosition) {
      position = next;
      update();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize?.disconnect();
      document.removeEventListener("fullscreenchange", schedule);
      document.removeEventListener("yt-navigate-finish", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      host.style.removeProperty("--oyt-host-height");
    },
  };
}
