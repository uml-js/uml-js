const LABEL_DISTANCE = 5;


/**
 * The point in the middle of a path (by length).
 *
 * @param {Point[]} waypoints
 *
 * @return {Point}
 */
export function getPathMid(waypoints) {
  const segments = [];

  let total = 0;

  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1], b = waypoints[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);

    segments.push({ a, b, length });
    total += length;
  }

  let remaining = total / 2;

  for (const { a, b, length } of segments) {
    if (remaining <= length && length > 0) {
      const ratio = remaining / length;

      return {
        x: Math.round(a.x + (b.x - a.x) * ratio),
        y: Math.round(a.y + (b.y - a.y) * ratio)
      };
    }

    remaining -= length;
  }

  return { x: waypoints[0].x, y: waypoints[0].y };
}

/**
 * Whether the path is vertical at its middle.
 *
 * @param {Point[]} waypoints
 *
 * @return {boolean}
 */
export function isVerticalAtMid(waypoints) {
  const mid = getPathMid(waypoints);

  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1], b = waypoints[i];

    const onSegment = Math.min(a.x, b.x) <= mid.x && mid.x <= Math.max(a.x, b.x) &&
      Math.min(a.y, b.y) <= mid.y && mid.y <= Math.max(a.y, b.y);

    if (onSegment) {
      return a.x === b.x && a.y !== b.y;
    }
  }

  return false;
}

/**
 * Default bounds of a connection label: above the middle of
 * the path, or right of it where the path is vertical.
 *
 * @param {Point[]} waypoints
 * @param {Dimensions} size
 *
 * @return {Bounds}
 */
export function getDefaultLabelBounds(waypoints, size) {
  const mid = getPathMid(waypoints);

  const position = isVerticalAtMid(waypoints) ? {
    x: mid.x + LABEL_DISTANCE,
    y: mid.y - size.height / 2
  } : {
    x: mid.x - size.width / 2,
    y: mid.y - size.height - LABEL_DISTANCE
  };

  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
    width: size.width,
    height: size.height
  };
}
