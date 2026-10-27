import { is } from '../../core/util/ModelUtil.js';

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
