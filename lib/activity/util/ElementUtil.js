import { is, isLabel, someElement } from '../../core/util/ModelUtil.js';


export function isActivityNode(element) {
  return is(element, 'uml:ActivityNode') && !isLabel(element);
}

export function isAction(element) {
  return is(element, 'uml:Action') && !isLabel(element);
}

export function isControlFlow(element) {
  return !!(element && element.waypoints) && is(element, 'uml:ActivityEdge');
}

// the keyword «structured» and the name at the top of structured activity nodes
export const STRUCTURED_HEADER_HEIGHT = 40;

/**
 * A structured activity node, owning and showing the nodes and edges inside it.
 */
export function isStructured(element) {
  return is(element, 'uml:StructuredActivityNode') && !isLabel(element);
}

/**
 * @param {Shape} action
 *
 * @return {'opaque'|'call'|'structured'} the kind of an action
 */
export function getActionKind(action) {
  return isStructured(action) ? 'structured' : is(action, 'uml:CallBehaviorAction') ? 'call' : 'opaque';
}

/**
 * Whether edges connect nodes inside a structured activity node to nodes outside,
 * which an activity of its own could not have.
 *
 * @param {Shape} element a structured activity node
 */
export function hasCrossingEdges(element) {
  const inside = new Set(getNestedNodes(element.businessObject));

  return getNestedEdges(getActivity(element.businessObject)).some(edge => inside.has(edge.source) !== inside.has(edge.target));
}

/**
 * Whether any other action than the given one calls an activity.
 *
 * @param {ModdleElement} activity
 * @param {ModdleElement} action
 */
export function isCalledByOthers(activity, action) {
  let root = activity;

  while (root.$parent) {
    root = root.$parent;
  }

  return someElement(root, element => element !== action && is(element, 'uml:CallBehaviorAction') && element.behavior === activity);
}

/**
 * The activity a node belongs to, directly or via structured activity nodes.
 */
export function getActivity(bo) {
  while (bo && !is(bo, 'uml:Activity')) {
    bo = bo.$parent;
  }

  return bo;
}

/**
 * The nodes of an activity or structured activity node, at any depth.
 */
function getNestedNodes(owner) {
  return owner.get('node').flatMap(node => [ node, ...(is(node, 'uml:StructuredActivityNode') ? getNestedNodes(node) : []) ]);
}

function getNestedEdges(owner) {
  return [
    ...owner.get('edge'),
    ...owner.get('node').filter(node => is(node, 'uml:StructuredActivityNode')).flatMap(getNestedEdges)
  ];
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
  'uml:StructuredActivityNode': { width: 300, height: 200 },
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
