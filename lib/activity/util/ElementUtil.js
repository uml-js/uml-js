import { is, isLabel } from '../../core/util/ModelUtil.js';


export function isActivityNode(element) {
  return is(element, 'uml:ActivityNode') && !isLabel(element);
}

export function isAction(element) {
  return is(element, 'uml:Action') && !isLabel(element);
}

export function isControlFlow(element) {
  return !!(element && element.waypoints) && is(element, 'uml:ActivityEdge');
}

/**
 * Decision and merge nodes share their notation (a diamond),
 * which one a node is follows from its flows.
 */
export function isDecisionOrMerge(element) {
  return (is(element, 'uml:DecisionNode') || is(element, 'uml:MergeNode')) && !isLabel(element);
}

/**
 * Fork and join nodes share their notation (a bar),
 * which one a node is follows from its flows.
 */
export function isForkOrJoin(element) {
  return (is(element, 'uml:ForkNode') || is(element, 'uml:JoinNode')) && !isLabel(element);
}

const DEFAULT_SIZES = {
  'uml:OpaqueAction': { width: 120, height: 60 },
  'uml:InitialNode': { width: 24, height: 24 },
  'uml:ActivityFinalNode': { width: 30, height: 30 },
  'uml:FlowFinalNode': { width: 24, height: 24 },
  'uml:DecisionNode': { width: 36, height: 36 },
  'uml:MergeNode': { width: 36, height: 36 },
  'uml:ForkNode': { width: 80, height: 8 },
  'uml:JoinNode': { width: 80, height: 8 }
};

/**
 * @param {ModdleElement} bo
 *
 * @return {Dimensions}
 */
export function getDefaultSize(bo) {
  return DEFAULT_SIZES[bo.$type] || DEFAULT_SIZES['uml:OpaqueAction'];
}
