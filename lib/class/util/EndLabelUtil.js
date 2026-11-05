const DISTANCE_ALONG = 6;
const DISTANCE_ACROSS = 3;

/**
 * Height of the box of qualifiers, and the padding left and right of its text.
 */
export const QUALIFIER_HEIGHT = 20;
export const QUALIFIER_PADDING = 6;


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
 * @param {number} [offset=0] distance from the end along the line, e.g. beyond a qualifier
 *
 * @return {Bounds}
 */
export function getEndLabelBounds(waypoints, index, size, offset = 0) {
  const end = getEnd(waypoints, index);
  const direction = end.direction;

  const point = {
    x: end.point.x + direction.x * offset,
    y: end.point.y + direction.y * offset
  };

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

/**
 * The box of the qualifiers of an association end (UML 2.5.1, 11.5.4): attached
 * to the classifier at the end of the line, which starts at the far side of the
 * box. Along horizontal lines the box is as long as its text, along vertical
 * ones as high as a line of text.
 *
 * @param {Point[]} waypoints
 * @param {number} index 0 for the source end, 1 for the target end
 * @param {number} textWidth the width of the qualifiers' text
 *
 * @return { { x: number, y: number, width: number, height: number, extent: number } }
 *   the bounds of the box and how far it extends along the line
 */
export function getQualifierBox(waypoints, index, textWidth) {
  const { point, direction } = getEnd(waypoints, index);

  const width = Math.ceil(textWidth) + 2 * QUALIFIER_PADDING;
  const height = QUALIFIER_HEIGHT;

  if (Math.abs(direction.x) >= Math.abs(direction.y)) {
    return {
      x: Math.round(direction.x > 0 ? point.x : point.x - width),
      y: Math.round(point.y - height / 2),
      width,
      height,
      extent: width
    };
  }

  return {
    x: Math.round(point.x - width / 2),
    y: Math.round(direction.y > 0 ? point.y : point.y - height),
    width,
    height,
    extent: height
  };
}
