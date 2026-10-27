import { is, isLabel } from '../../core/util/ModelUtil.js';

/**
 * Height of the head of a lifeline, the box showing its name.
 */
export const HEAD_HEIGHT = 40;

/**
 * Distance of messages from the head and the end of a lifeline.
 */
export const MESSAGE_MARGIN = 10;

/**
 * Size of self messages, which loop to the right.
 */
export const SELF_MESSAGE_SIZE = { width: 40, height: 20 };

export const LIFELINE_SIZE = { width: 100, height: 300 };

/**
 * Size of execution specifications (activation bars).
 */
export const EXECUTION_SIZE = { width: 12, height: 60 };

export const COMBINED_FRAGMENT_SIZE = { width: 300, height: 140 };

/**
 * The tab in the top left corner of a combined fragment, showing its operator.
 */
export const OPERATOR_TAB_HEIGHT = 20;

/**
 * Minimal height of the operands of combined fragments.
 */
export const MIN_OPERAND_HEIGHT = 30;


export function isLifeline(element) {
  return is(element, 'uml:Lifeline') && !isLabel(element);
}

export function isMessage(element) {
  return !!(element && element.waypoints) && is(element, 'uml:Message');
}

/**
 * Execution specifications, shown as activation bars on lifelines.
 */
export function isExecution(element) {
  return is(element, 'uml:ExecutionSpecification') && !isLabel(element);
}

/**
 * Combined fragments (loop, alt, opt, ...), shown as frames.
 */
export function isCombinedFragment(element) {
  return is(element, 'uml:CombinedFragment') && !isLabel(element);
}

/**
 * Operands of combined fragments, shown as the parts of their frame.
 */
export function isOperand(element) {
  return is(element, 'uml:InteractionOperand') && !isLabel(element);
}

/**
 * @param {Shape} fragment
 *
 * @return {Shape[]} the operands of a combined fragment, top to bottom
 */
export function getOperands(fragment) {
  return fragment.children.filter(isOperand).sort((a, b) => a.y - b.y);
}

/**
 * @param {ModdleElement} operand
 *
 * @return {string} the guard of an operand, without brackets
 */
export function getGuardText(operand) {
  const specification = operand.guard && operand.guard.specification;

  return specification && is(specification, 'uml:OpaqueExpression') ? specification.get('body').join(' ') : '';
}

/**
 * Lifelines and activation bars, where messages start and end.
 */
export function isMessageEnd(element) {
  return isLifeline(element) || isExecution(element);
}

/**
 * @param {Shape} element lifeline or activation bar
 *
 * @return {Shape} the lifeline
 */
export function getLifeline(element) {
  return isExecution(element) ? element.parent : element;
}

/**
 * @param {Shape} element lifeline or activation bar
 *
 * @return {number} x of the dashed line of a lifeline, the middle of an activation bar
 */
export function getLifelineX(element) {
  return Math.round(element.x + element.width / 2);
}

/**
 * @param {Shape} element lifeline or activation bar
 *
 * @return { { min: number, max: number } } where messages can be attached;
 *   lifelines grow to hold their messages, so they do not limit them downwards
 */
export function getMessageRange(element) {
  if (isExecution(element)) {
    return {
      min: element.y,
      max: element.y + element.height
    };
  }

  return {
    min: element.y + HEAD_HEIGHT + MESSAGE_MARGIN,
    max: Infinity
  };
}

/**
 * @param {Connection} message
 *
 * @return {number} the vertical position of a message, its first waypoint
 */
export function getMessageY(message) {
  return message.waypoints[0].y;
}
