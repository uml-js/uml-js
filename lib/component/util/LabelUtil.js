import { getDefaultLabelBounds, getPathMid, isVerticalAtMid } from '../../core/util/GeometryUtil.js';

import { is } from '../../core/util/ModelUtil.js';

import { isBall } from './ElementUtil.js';

const LABEL_DISTANCE = 4;

const KEYWORD_HEIGHT = 16;


/**
 * Default bounds of an external label: above the middle of connections,
 * outside the component next to ports, centered below other shapes.
 *
 * @param {Shape|Connection} shape
 * @param {Dimensions} size
 *
 * @return {Bounds}
 */
export function getExternalLabelBounds(shape, size) {
  const { width, height } = size;

  if (shape.waypoints) {

    // «use» is shown at the middle of dashed usages, put their name next to it
    if (hasKeyword(shape)) {
      const mid = getPathMid(shape.waypoints);
      const vertical = isVerticalAtMid(shape.waypoints);

      return {
        x: Math.round(vertical ? mid.x + LABEL_DISTANCE : mid.x - width / 2),
        y: Math.round(vertical ? mid.y + KEYWORD_HEIGHT / 2 : mid.y + LABEL_DISTANCE),
        width,
        height
      };
    }

    return getDefaultLabelBounds(shape.waypoints, size);
  }

  const mid = {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2
  };

  const side = shape.host ? getBorderSide(mid, shape.host) : 'bottom';

  const positions = {
    left: { x: shape.x - LABEL_DISTANCE - width, y: shape.y + shape.height + LABEL_DISTANCE },
    right: { x: shape.x + shape.width + LABEL_DISTANCE, y: shape.y + shape.height + LABEL_DISTANCE },
    top: { x: shape.x + shape.width + LABEL_DISTANCE, y: shape.y - LABEL_DISTANCE - height },
    bottom: { x: mid.x - width / 2, y: shape.y + shape.height + LABEL_DISTANCE }
  };

  const { x, y } = positions[side];

  return {
    x: Math.round(x),
    y: Math.round(y),
    width,
    height
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
 * Dashed usages show the keyword «use».
 *
 * @param {Connection} connection
 *
 * @return {boolean}
 */
export function hasKeyword(connection) {
  return is(connection, 'uml:Usage') && !isBall(connection.target);
}
