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
 * An expansion region, a structured activity node executed once per element
 * of the collections given to its input expansion nodes.
 */
export function isExpansionRegion(element) {
  return is(element, 'uml:ExpansionRegion') && !isLabel(element);
}

/**
 * @param {Shape} action
 *
 * @return {'opaque'|'call'|'structured'|'expansion'} the kind of an action
 */
export function getActionKind(action) {
  if (isExpansionRegion(action)) {
    return 'expansion';
  }

  return isStructured(action) ? 'structured' : is(action, 'uml:CallBehaviorAction') ? 'call' : 'opaque';
}

/**
 * Object nodes: pins, central buffer and data store nodes, expansion nodes.
 */
export function isObjectNode(element) {
  return is(element, 'uml:ObjectNode') && !isLabel(element) && !(element && element.waypoints);
}

/**
 * Pins, attached to the border of the action they are inputs or outputs of.
 */
export function isPin(element) {
  return is(element, 'uml:Pin') && !isLabel(element) && !(element && element.waypoints);
}

/**
 * Expansion nodes, attached to the border of their expansion region.
 */
export function isExpansionNode(element) {
  return is(element, 'uml:ExpansionNode') && !isLabel(element) && !(element && element.waypoints);
}

/**
 * Nodes attached to the border of another node: pins and expansion nodes.
 */
export function isBorderNode(element) {
  return isPin(element) || isExpansionNode(element);
}

/**
 * @param {Element|ModdleElement} element a pin or an expansion node
 *
 * @return {boolean} whether the node is an input, rather than an output
 */
export function isInput(element) {
  const bo = element.businessObject || element;

  if (is(bo, 'uml:ExpansionNode')) {
    return !bo.regionAsOutput;
  }

  return is(bo, 'uml:InputPin');
}

/**
 * The property of an action owning its input or output pins (UML 2.5.1, 16.13),
 * depending on the kind of action.
 *
 * @param {ModdleElement} action
 * @param {boolean} input
 *
 * @return {string}
 */
export function getPinProperty(action, input) {
  if (is(action, 'uml:StructuredActivityNode')) {
    return input ? 'structuredNodeInput' : 'structuredNodeOutput';
  }

  if (is(action, 'uml:CallAction')) {
    return input ? 'argument' : 'result';
  }

  return input ? 'inputValue' : 'outputValue';
}

/**
 * @param {ModdleElement} action
 *
 * @return {Array<ModdleElement>} the input and output pins of an action
 */
export function getPins(action) {
  return [
    ...action.get(getPinProperty(action, true)),
    ...action.get(getPinProperty(action, false))
  ];
}

/**
 * Activity partitions (swimlanes) and interruptible activity regions, which group
 * nodes drawn within them without owning them.
 */
export function isGroup(element) {
  return is(element, 'uml:ActivityGroup') && !isLabel(element);
}

export function isPartition(element) {
  return is(element, 'uml:ActivityPartition') && !isLabel(element);
}

export function isInterruptibleRegion(element) {
  return is(element, 'uml:InterruptibleActivityRegion') && !isLabel(element);
}

// the header of partitions, showing their name
export const PARTITION_HEADER_SIZE = 30;

/**
 * Partitions wider than high are horizontal swimlanes, with their header at
 * the left, others are vertical ones, with their header at the top.
 */
export function isHorizontal(partition) {
  return partition.width > partition.height;
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
 * The structured activity nodes and the activity containing a node, innermost first.
 * Pins and expansion nodes count as inside the node they are attached to, so that the
 * flows between them and the content of that node are owned by it.
 *
 * @param {ModdleElement} node
 *
 * @return {Array<ModdleElement>}
 */
export function getOwners(node) {
  const owners = [];

  let owner = is(node, 'uml:ExpansionNode') ? (node.regionAsInput || node.regionAsOutput || node.$parent) : node.$parent;

  for (; owner; owner = owner.$parent) {
    if (is(owner, 'uml:StructuredActivityNode') || is(owner, 'uml:Activity')) {
      owners.push(owner);
    }

    if (is(owner, 'uml:Activity')) {
      break;
    }
  }

  return owners;
}

/**
 * The nodes of an activity or structured activity node, at any depth.
 */
function getNestedNodes(owner) {
  return owner.get('node').flatMap(node => [
    node,
    ...(is(node, 'uml:Action') ? getPins(node) : []),
    ...(is(node, 'uml:StructuredActivityNode') ? getNestedNodes(node) : [])
  ]);
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

/**
 * Size of pins, and of expansion nodes across and along the border they are attached to.
 */
export const PIN_SIZE = 16;
export const EXPANSION_NODE_LENGTH = 48;

const DEFAULT_SIZES = {
  'uml:OpaqueAction': { width: 120, height: 60 },
  'uml:CallBehaviorAction': { width: 120, height: 60 },
  'uml:StructuredActivityNode': { width: 300, height: 200 },
  'uml:ExpansionRegion': { width: 300, height: 200 },
  'uml:InputPin': { width: PIN_SIZE, height: PIN_SIZE },
  'uml:OutputPin': { width: PIN_SIZE, height: PIN_SIZE },
  'uml:ExpansionNode': { width: EXPANSION_NODE_LENGTH, height: PIN_SIZE },
  'uml:CentralBufferNode': { width: 120, height: 50 },
  'uml:DataStoreNode': { width: 120, height: 50 },
  'uml:ActivityPartition': { width: 200, height: 400 },
  'uml:InterruptibleActivityRegion': { width: 300, height: 200 },
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
