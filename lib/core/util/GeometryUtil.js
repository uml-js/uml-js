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

/**
 * The border of a host shape a point is closest to.
 *
 * @param {Point} point
 * @param {Bounds} host
 *
 * @return {'left'|'right'|'top'|'bottom'}
 */
export function getBorderSide(point, host) {
  const distances = {
    left: Math.abs(point.x - host.x),
    right: Math.abs(point.x - (host.x + host.width)),
    top: Math.abs(point.y - host.y),
    bottom: Math.abs(point.y - (host.y + host.height))
  };

  return Object.keys(distances).reduce((a, b) => distances[a] <= distances[b] ? a : b);
}

/**
 * The point on the border of a shape closest to the given point.
 *
 * @param {Point} point
 * @param {Bounds} shape
 *
 * @return {Point}
 */
export function snapToBorder(point, shape) {
  const left = shape.x, right = shape.x + shape.width;
  const top = shape.y, bottom = shape.y + shape.height;

  const x = Math.min(Math.max(point.x, left), right);
  const y = Math.min(Math.max(point.y, top), bottom);

  const distances = [
    { x: left, y, distance: Math.abs(point.x - left) },
    { x: right, y, distance: Math.abs(point.x - right) },
    { x, y: top, distance: Math.abs(point.y - top) },
    { x, y: bottom, distance: Math.abs(point.y - bottom) }
  ];

  const { x: snappedX, y: snappedY } = distances.reduce((a, b) => a.distance <= b.distance ? a : b);

  return {
    x: Math.round(snappedX),
    y: Math.round(snappedY)
  };
}

const BORDER_LABEL_DISTANCE = 4;

/**
 * Default bounds of the external label of a shape: outside its host next to
 * shapes attached to the border of another one (e.g. ports), centered below others.
 *
 * @param {Shape} shape
 * @param {Dimensions} size
 *
 * @return {Bounds}
 */
export function getShapeLabelBounds(shape, size) {
  const { width, height } = size;

  const mid = {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2
  };

  const side = shape.host ? getBorderSide(mid, shape.host) : 'bottom';

  const positions = {
    left: { x: shape.x - BORDER_LABEL_DISTANCE - width, y: shape.y + shape.height + BORDER_LABEL_DISTANCE },
    right: { x: shape.x + shape.width + BORDER_LABEL_DISTANCE, y: shape.y + shape.height + BORDER_LABEL_DISTANCE },
    top: { x: shape.x + shape.width + BORDER_LABEL_DISTANCE, y: shape.y - BORDER_LABEL_DISTANCE - height },
    bottom: { x: mid.x - width / 2, y: shape.y + shape.height + BORDER_LABEL_DISTANCE }
  };

  const { x, y } = positions[side];

  return {
    x: Math.round(x),
    y: Math.round(y),
    width,
    height
  };
}
