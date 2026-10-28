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

/**
 * The name shown for an action: its own or, for a call behavior action without
 * a name of its own, the name of the called behavior, as UML 2.5.1 allows.
 *
 * @param {ModdleElement} bo
 *
 * @return {string}
 */
export function getActionName(bo) {
  if (bo.name) {
    return bo.name;
  }

  if (is(bo, 'uml:CallBehaviorAction') && bo.behavior) {
    return bo.behavior.name || '';
  }

  return '';
}

/**
 * Whether a call behavior action shows the rake symbol, the sign of calling an
 * activity, whose nodes and flows are shown in the activity's own diagram.
 */
export function isCallingActivity(bo) {
  return is(bo, 'uml:CallBehaviorAction') && is(bo.behavior, 'uml:Activity');
}

const DEFAULT_SIZES = {
  'uml:OpaqueAction': { width: 120, height: 60 },
  'uml:CallBehaviorAction': { width: 120, height: 60 },
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
