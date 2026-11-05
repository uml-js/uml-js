import { is } from '../../core/util/ModelUtil.js';

import { getBorderSide, getDefaultLabelBounds, getShapeLabelBounds } from '../../core/util/GeometryUtil.js';

import { isBorderNode, isControlFlow } from './ElementUtil.js';

const LABEL_DISTANCE = 4;

/**
 * Flows, pins and expansion nodes show their label outside of them.
 *
 * @param {Element} element
 *
 * @return {boolean}
 */
export function hasExternalLabel(element) {
  return isControlFlow(element) || isBorderNode(element);
}

/**
 * Default bounds of an external label: above the middle of flows, outside the
 * node next to pins and expansion nodes. Beside those on the bottom of their node,
 * rather than below, which is where their flows run.
 *
 * @param {Shape|Connection} element
 * @param {Dimensions} size
 *
 * @return {Bounds}
 */
export function getExternalLabelBounds(element, size) {
  if (element.waypoints) {
    return getDefaultLabelBounds(element.waypoints, size);
  }

  const mid = { x: element.x + element.width / 2, y: element.y + element.height / 2 };

  if (element.host && getBorderSide(mid, element.host) === 'bottom') {
    return {
      x: Math.round(element.x + element.width + LABEL_DISTANCE),
      y: Math.round(element.y + element.height + LABEL_DISTANCE),
      width: size.width,
      height: size.height
    };
  }

  return getShapeLabelBounds(element, size);
}

/**
 * Guards of control flows, shown as `[guard]`.
 */

/**
 * @param {ModdleElement} flow
 *
 * @return {string} the guard, without brackets
 */
export function getGuardText(flow) {
  const guard = flow.guard;

  if (!guard) {
    return '';
  }

  if (is(guard, 'uml:OpaqueExpression')) {
    return guard.get('body').join(' ');
  }

  return guard.name || '';
}

/**
 * @param {ModdleElement} flow
 *
 * @return {string} the label of a control flow
 */
export function getFlowLabel(flow) {
  const guard = getGuardText(flow);

  return [ flow.name, guard ? `[${ guard }]` : '' ].filter(Boolean).join(' ');
}

/**
 * @param {ModdleElement} bo
 *
 * @return {string} the text of an external label: of a flow (`name [guard]`)
 *   or of a pin or expansion node (its name)
 */
export function getLabelText(bo) {
  return is(bo, 'uml:ActivityEdge') ? getFlowLabel(bo) : (bo.name || '');
}

/**
 * @param {string} text e.g. `[x > 3]`, `x > 3` or `name [x > 3]`
 *
 * @return { { name: string, guard: string } }
 */
export function parseFlowLabel(text) {
  const match = /^([^[]*)(?:\[(.*)\]?)?\s*$/.exec(text.trim());

  if (!match || match[2] === undefined) {

    // without brackets, the text is the guard
    return { name: '', guard: text.trim().replace(/^\[|\]$/g, '') };
  }

  return {
    name: match[1].trim(),
    guard: match[2].replace(/\]$/, '').trim()
  };
}
