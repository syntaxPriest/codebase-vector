// Treemap layouts. `squarifiedTreemap` is the default — implements the
// classical Bruls/Huijsen/van Wijk 2000 algorithm, which iteratively
// packs sorted items into rows along the shortest side of the
// remaining rectangle, accepting items as long as the worst aspect
// ratio in the row keeps improving. Produces noticeably squarer cells
// than the simpler binary-split fallback below.

export interface TreemapItem {
  value: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type TreemapResult<T extends TreemapItem> = (T & Rect)[];

interface Scaled<T extends TreemapItem> {
  item: T;
  area: number;
}

// ──────────────────────────────────────────────────────────────
// Squarified — main export.
// ──────────────────────────────────────────────────────────────
export function squarifiedTreemap<T extends TreemapItem>(
  items: T[],
  x: number,
  y: number,
  w: number,
  h: number,
): TreemapResult<T> {
  if (items.length === 0 || w <= 0 || h <= 0) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];

  const total = items.reduce((s, it) => s + Math.max(it.value, 1), 0);
  if (total <= 0) return [];

  const scale = (w * h) / total;
  const queue: Scaled<T>[] = [...items]
    .sort((a, b) => b.value - a.value)
    .map((it) => ({ item: it, area: Math.max(it.value, 1) * scale }));

  const out: TreemapResult<T> = [];

  let rect: Rect = { x, y, w, h };
  let row: Scaled<T>[] = [];

  const minSide = (r: Rect) => Math.min(r.w, r.h);

  const worstAspect = (rowItems: Scaled<T>[], side: number): number => {
    if (rowItems.length === 0) return Infinity;
    const sum = rowItems.reduce((s, it) => s + it.area, 0);
    if (sum <= 0 || side <= 0) return Infinity;
    let max = -Infinity;
    let min = Infinity;
    for (const it of rowItems) {
      if (it.area > max) max = it.area;
      if (it.area < min) min = it.area;
    }
    const sumSq = sum * sum;
    const sideSq = side * side;
    return Math.max((sideSq * max) / sumSq, sumSq / (sideSq * min));
  };

  const layoutRow = (rowItems: Scaled<T>[]): Rect => {
    if (rowItems.length === 0) return rect;
    const sum = rowItems.reduce((s, it) => s + it.area, 0);
    if (sum <= 0) return rect;

    const horizontal = rect.w >= rect.h;
    if (horizontal) {
      const rowW = sum / rect.h;
      let cy = rect.y;
      for (const it of rowItems) {
        const cellH = it.area / rowW;
        out.push({ ...it.item, x: rect.x, y: cy, w: rowW, h: cellH });
        cy += cellH;
      }
      return { x: rect.x + rowW, y: rect.y, w: rect.w - rowW, h: rect.h };
    }
    const rowH = sum / rect.w;
    let cx = rect.x;
    for (const it of rowItems) {
      const cellW = it.area / rowH;
      out.push({ ...it.item, x: cx, y: rect.y, w: cellW, h: rowH });
      cx += cellW;
    }
    return { x: rect.x, y: rect.y + rowH, w: rect.w, h: rect.h - rowH };
  };

  while (queue.length > 0) {
    const next = queue[0];
    const candidate = [...row, next];
    const side = minSide(rect);
    if (row.length === 0 || worstAspect(candidate, side) <= worstAspect(row, side)) {
      row = candidate;
      queue.shift();
    } else {
      rect = layoutRow(row);
      row = [];
      // try `next` again in the fresh row
    }
  }
  if (row.length > 0) layoutRow(row);

  return out;
}

// ──────────────────────────────────────────────────────────────
// Binary-split — kept as a small fallback. Cuts the rectangle in
// roughly equal halves until each item has its own. Cheap and stable;
// produces blockier aspect ratios than squarified.
// ──────────────────────────────────────────────────────────────
export function binaryTreemap<T extends TreemapItem>(
  items: T[],
  x: number,
  y: number,
  w: number,
  h: number,
): TreemapResult<T> {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];

  const total = items.reduce((s, it) => s + Math.max(it.value, 1), 0);

  let splitIdx = 1;
  let leftSum = Math.max(items[0].value, 1);
  while (splitIdx < items.length - 1 && leftSum * 2 < total) {
    leftSum += Math.max(items[splitIdx].value, 1);
    splitIdx++;
  }

  const left = items.slice(0, splitIdx);
  const right = items.slice(splitIdx);
  const leftFrac = leftSum / total;

  if (w >= h) {
    const lw = Math.round(w * leftFrac);
    return [
      ...binaryTreemap(left,  x,      y, lw,     h),
      ...binaryTreemap(right, x + lw, y, w - lw, h),
    ];
  }
  const lh = Math.round(h * leftFrac);
  return [
    ...binaryTreemap(left,  x, y,      w, lh),
    ...binaryTreemap(right, x, y + lh, w, h - lh),
  ];
}
