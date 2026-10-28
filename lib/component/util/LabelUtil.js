import { getDefaultLabelBounds, getPathMid, getShapeLabelBounds, isVerticalAtMid } from '../../core/util/GeometryUtil.js';

import { is } from '../../core/util/ModelUtil.js';

import { isBall } from './ElementUtil.js';

export { getBorderSide } from '../../core/util/GeometryUtil.js';

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

  return getShapeLabelBounds(shape, size);
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
