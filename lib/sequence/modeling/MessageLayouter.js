import {
  GUARD_HEIGHT,
  GUARD_TOP,
  MESSAGE_MARGIN,
  SELF_MESSAGE_SIZE,
  getGuardText,
  getLifeline,
  getLifelineX,
  getMessageRange,
  isMessageEnd,
  isOperand
} from '../util/ElementUtil.js';

import { isComment } from '../../core/util/ModelUtil.js';

import { LABEL_DISTANCE } from '../../core/util/GeometryUtil.js';

import { layoutStraight } from '../../core/layout/UmlLayouter.js';


/**
 * Lays out messages as horizontal lines between the dashed lines of
 * lifelines (or activation bars), at the height they are drawn or were moved
 * to. Messages to the sending lifeline itself loop to the right, their ends
 * and the width of the loop placed freely.
 *
 * Messages are kept below the guards of the operands they are drawn in, with
 * their name, so that neither is drawn over a guard.
 */
export default function MessageLayouter(elementRegistry, textRenderer) {
  this._elementRegistry = elementRegistry;
  this._textRenderer = textRenderer;
}

MessageLayouter.$inject = [
  'elementRegistry',
  'textRenderer'
];

/**
 * @param {Connection} connection a message
 * @param {number} y
 * @param {number} left
 * @param {number} right
 *
 * @return {number} the height, moved below the guards of the operands spanning
 *   from left to right whose guards the message or its name would cover
 */
MessageLayouter.prototype._belowGuards = function(connection, y, left, right) {
  const name = connection.businessObject && connection.businessObject.name;

  const clearance = name
    ? this._textRenderer.getExternalLabelBounds({ x: 0, y: 0, width: 0, height: 0 }, name).height + LABEL_DISTANCE
    : MESSAGE_MARGIN;

  const guarded = this._elementRegistry.filter(element => {
    return isOperand(element) && getGuardText(element.businessObject) &&
      element.x <= left && right <= element.x + element.width;
  });

  // nested operands may push a message below the guard of another
  let moved = true;

  while (moved) {
    moved = false;

    for (const operand of guarded) {
      const top = operand.y + GUARD_TOP + GUARD_HEIGHT + clearance;

      if (operand.y <= y && y < top && top < operand.y + operand.height) {
        y = top;
        moved = true;
      }
    }
  }

  return y;
};

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
    const x = getLifelineX(source);

    return layoutSelfMessage(connection, hints, source, target, y => this._belowGuards(connection, y, x, x));
  }

  const sourceX = getLifelineX(source);
  const targetX = getLifelineX(target);

  const y = clampY(
    this._belowGuards(connection, getY(connection, hints, source), Math.min(sourceX, targetX), Math.max(sourceX, targetX)),
    source,
    target
  );

  return [
    { x: sourceX, y },
    { x: targetX, y }
  ];
};

/**
 * A loop to the right: sent at one height, received at another (not above),
 * as wide as it was or the default. The height it is sent at is kept below
 * guards by the given function.
 */
function layoutSelfMessage(connection, hints, source, target, belowGuards) {
  const waypoints = connection.waypoints || [];

  const sourceX = getLifelineX(source);
  const targetX = getLifelineX(target);

  const sourceRange = getMessageRange(source);
  const targetRange = getMessageRange(target);

  const sendY = clamp(belowGuards(getY(connection, hints, source)), sourceRange.min, sourceRange.max);

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
