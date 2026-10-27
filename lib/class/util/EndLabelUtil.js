const DISTANCE_ALONG = 6;
const DISTANCE_ACROSS = 3;


/**
 * @param {Point[]} waypoints
 * @param {number} index 0 for the source end, 1 for the target end
 *
 * @return {{ point: Point, direction: Point }} the end of the line and the unit vector pointing into the line
 */
export function getEnd(waypoints, index) {
  const point = index ? waypoints[waypoints.length - 1] : waypoints[0];
  const next = index ? waypoints[waypoints.length - 2] : waypoints[1];

  const length = Math.hypot(next.x - point.x, next.y - point.y) || 1;

  return {
    point,
    direction: { x: (next.x - point.x) / length, y: (next.y - point.y) / length }
  };
}

/**
 * Default bounds of the label of an association end: next to the end of
 * the line, above (or, at vertical lines, right of) it.
 *
 * @param {Point[]} waypoints
 * @param {number} index 0 for the source end, 1 for the target end
 * @param {Dimensions} size
 *
 * @return {Bounds}
 */
export function getEndLabelBounds(waypoints, index, size) {
  const { point, direction } = getEnd(waypoints, index);

  // above horizontal lines, right of vertical lines
  let normal = { x: direction.y, y: -direction.x };

  if (normal.y > 0 || (Math.abs(normal.y) < 0.01 && normal.x < 0)) {
    normal = { x: -normal.x, y: -normal.y };
  }

  const along = Math.abs(direction.x) * size.width / 2 + Math.abs(direction.y) * size.height / 2 + DISTANCE_ALONG;
  const across = Math.abs(normal.x) * size.width / 2 + Math.abs(normal.y) * size.height / 2 + DISTANCE_ACROSS;

  const center = {
    x: point.x + direction.x * along + normal.x * across,
    y: point.y + direction.y * along + normal.y * across
  };

  return {
    x: Math.round(center.x - size.width / 2),
    y: Math.round(center.y - size.height / 2),
    width: size.width,
    height: size.height
  };
}
