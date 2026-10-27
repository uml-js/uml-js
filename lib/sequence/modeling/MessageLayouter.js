import {
  SELF_MESSAGE_SIZE,
  getLifeline,
  getLifelineX,
  getMessageRange,
  isMessageEnd
} from '../util/ElementUtil.js';

import { isComment } from '../../core/util/ModelUtil.js';

import { layoutStraight } from '../../core/layout/UmlLayouter.js';


/**
 * Lays out messages as horizontal lines between the dashed lines of
 * lifelines (or activation bars), at the height they are drawn or were moved
 * to. Messages to the sending lifeline itself loop to the right, their ends
 * and the width of the loop placed freely.
 */
export default function MessageLayouter() {}

MessageLayouter.prototype.layoutConnection = function(connection, hints = {}) {

  // lines of notes are straight
  if (isComment(connection)) {
    return layoutStraight(connection, hints);
  }

  const source = hints.source || connection.source;
  const target = hints.target || connection.target;

  if (!isMessageEnd(source) || !isMessageEnd(target)) {
    return [ hints.connectionStart || getMid(source), hints.connectionEnd || getMid(target) ];
  }

  if (getLifeline(source) === getLifeline(target)) {
    return layoutSelfMessage(connection, hints, source, target);
  }

  const y = clampY(getY(connection, hints, source), source, target);

  const sourceX = getLifelineX(source);

  return [
    { x: sourceX, y },
    { x: getLifelineX(target), y }
  ];
};

/**
 * A loop to the right: sent at one height, received at another (not above),
 * as wide as it was or the default.
 */
function layoutSelfMessage(connection, hints, source, target) {
  const waypoints = connection.waypoints || [];

  const sourceX = getLifelineX(source);
  const targetX = getLifelineX(target);

  const sourceRange = getMessageRange(source);
  const targetRange = getMessageRange(target);

  const sendY = clamp(getY(connection, hints, source), sourceRange.min, sourceRange.max);

  const previousReceiveY = waypoints.length > 2 ? waypoints[waypoints.length - 1].y : sendY + SELF_MESSAGE_SIZE.height;
  const receiveY = clamp(
    hints.connectionEnd ? hints.connectionEnd.y : previousReceiveY,
    Math.max(targetRange.min, sendY + MIN_SELF_MESSAGE_HEIGHT),
    Math.max(targetRange.max, sendY + MIN_SELF_MESSAGE_HEIGHT)
  );

  const previousWidth = waypoints.length > 2 ? waypoints[1].x - Math.max(sourceX, targetX) : SELF_MESSAGE_SIZE.width;
  const loopX = Math.max(sourceX, targetX) + Math.max(previousWidth, MIN_SELF_MESSAGE_WIDTH);

  return [
    { x: sourceX, y: sendY },
    { x: loopX, y: sendY },
    { x: loopX, y: receiveY },
    { x: targetX, y: receiveY }
  ];
}

const MIN_SELF_MESSAGE_WIDTH = 20;
const MIN_SELF_MESSAGE_HEIGHT = 10;

function clamp(value, min, max) {
  return Math.round(Math.min(Math.max(value, min), Math.max(min, max)));
}

/**
 * The height of a message: where it was started, where it was, or the middle of the source.
 */
function getY(connection, hints, source) {
  if (hints.connectionStart) {
    return hints.connectionStart.y;
  }

  if (connection.waypoints && connection.waypoints.length) {
    return connection.waypoints[0].y;
  }

  return source.y + source.height / 2;
}

function clampY(y, source, target) {
  const sourceRange = getMessageRange(source);
  const targetRange = getMessageRange(target);

  const min = Math.max(sourceRange.min, targetRange.min);
  const max = Math.min(sourceRange.max, targetRange.max);

  return Math.round(Math.min(Math.max(y, min), Math.max(min, max)));
}

function getMid(shape) {
  return {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2
  };
}
