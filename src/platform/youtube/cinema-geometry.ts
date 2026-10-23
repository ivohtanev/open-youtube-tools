/** Resolve each CSS corner against the current border box, including percentages. */
export function roundedOutline(element: Element): string {
  const rect = element.getBoundingClientRect();
  const style = element.ownerDocument.defaultView!.getComputedStyle(element);
  const box = element as HTMLElement;
  const width = box.offsetWidth || rect.width;
  const height = box.offsetHeight || rect.height;
  const scaleX = width ? rect.width / width : 1;
  const scaleY = height ? rect.height / height : 1;
  const resolve = (value: string, size: number) =>
    Math.max(
      0,
      (parseFloat(value) || 0) * (value.endsWith("%") ? size / 100 : 1),
    );
  const corners = [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ].map((value) => {
    const [x = "0", y = x] = value.trim().split(/\s+/);
    return [resolve(x, width) * scaleX, resolve(y, height) * scaleY];
  });
  // CSS reduces all radii by the same factor when adjacent corners overlap.
  const [tl, tr, br, bl] = corners as [number[], number[], number[], number[]];
  const factor = Math.min(
    1,
    rect.width / (tl[0]! + tr[0]! || 1),
    rect.width / (bl[0]! + br[0]! || 1),
    rect.height / (tl[1]! + bl[1]! || 1),
    rect.height / (tr[1]! + br[1]! || 1),
  );
  for (const corner of corners) {
    corner[0] = corner[0]! * factor;
    corner[1] = corner[1]! * factor;
  }
  const left = rect.left;
  const top = rect.top;
  const right = left + rect.width;
  const bottom = top + rect.height;
  const arc = (corner: number[], x: number, y: number) =>
    corner[0] && corner[1]
      ? `A ${corner[0]} ${corner[1]} 0 0 1 ${x} ${y}`
      : `L ${x} ${y}`;
  return [
    `M ${left + tl[0]!} ${top}`,
    `H ${right - tr[0]!}`,
    arc(tr, right, top + tr[1]!),
    `V ${bottom - br[1]!}`,
    arc(br, right - br[0]!, bottom),
    `H ${left + bl[0]!}`,
    arc(bl, left, bottom - bl[1]!),
    `V ${top + tl[1]!}`,
    arc(tl, left + tl[0]!, top),
    "Z",
  ].join(" ");
}

/** Intersect the clear window with rounded clipping containers above the player. */
export function clearWindow(element: Element, id: string): string {
  let content = `<path fill="black" d="${roundedOutline(element)}"/>`;
  let index = 0;
  for (
    let parent = element.parentElement;
    parent;
    parent = parent.parentElement
  ) {
    const style = element.ownerDocument.defaultView!.getComputedStyle(parent);
    if (
      ![style.overflow, style.overflowX, style.overflowY].some((value) =>
        /^(hidden|clip|scroll|auto)$/.test(value),
      )
    )
      continue;
    const clipId = `${id}-${index++}`;
    content = `<defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><path d="${roundedOutline(parent)}"/></clipPath></defs><g clip-path="url(#${clipId})">${content}</g>`;
  }
  return content;
}
