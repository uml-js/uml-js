import { getPathMid } from './GeometryUtil.js';


/**
 * Where to show the keyword of a connection, e.g. «include»: next to the
 * middle of the line, on its upper (or, if vertical, right) side, clear of
 * the line whatever its direction.
 *
 * @param {Point[]} waypoints
 * @param {Dimensions} size of the keyword text
 *
 * @return {Point} the center of the keyword
 */
export function getKeywordCenter(waypoints, size) {
  const mid = getPathMid(waypoints);

  // the segment the middle is on
  const index = Math.max(1, waypoints.findIndex((point, idx) => idx > 0 && isBetween(mid, waypoints[idx - 1], point)));

  const from = waypoints[index - 1], to = waypoints[index];
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;

  let normal = { x: -(to.y - from.y) / length, y: (to.x - from.x) / length };

  if (normal.y > 0 || (Math.abs(normal.y) < 0.01 && normal.x < 0)) {
    normal = { x: -normal.x, y: -normal.y };
  }

  // distance of the center from the line, so that the text does not touch it
  const distance = Math.abs(normal.x) * size.width / 2 + Math.abs(normal.y) * size.height / 2 + 4;

  return {
    x: mid.x + normal.x * distance,
    y: mid.y + normal.y * distance
  };
}

function isBetween(point, a, b) {
  return point.x >= Math.min(a.x, b.x) - 1 && point.x <= Math.max(a.x, b.x) + 1 &&
    point.y >= Math.min(a.y, b.y) - 1 && point.y <= Math.max(a.y, b.y) + 1;
}
