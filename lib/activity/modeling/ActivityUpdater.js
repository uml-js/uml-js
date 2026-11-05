import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import PositionTracker from '../../core/util/PositionTracker.js';

import {
  getOwners,
  getPinProperty,
  isActivityNode,
  isControlFlow,
  isExpansionNode,
  isGroup,
  isInput,
  isInterruptibleRegion,
  isPartition,
  isPin
} from '../util/ElementUtil.js';

import { is, isComment } from '../../core/util/ModelUtil.js';


/**
 * Keeps the activity in sync with activity diagrams:
 *
 *   * nodes are owned by the structured activity node they are shown in,
 *     or else by the activity
 *   * pins are owned by the action they are attached to, as its inputs or
 *     outputs (UML 2.5.1, 16.13)
 *   * expansion nodes are owned like the expansion region they are attached
 *     to, which references them as its inputs or outputs
 *   * edges are owned by the innermost structured activity node containing
 *     both their source and target, or else by the activity (UML 2.5.1, 16.11.3.1);
 *     pins and expansion nodes count as inside the node they are attached to
 *   * edges reference their source and target, nodes their incoming
 *     and outgoing edges
 *   * partitions and interruptible regions are owned by the activity
 *
 * Like UmlUpdater, all updates are derived from the current diagram state
 * and therefore apply to executing and reverting commands alike.
 *
 * Which nodes and edges partitions and interruptible regions group follows
 * from where they are drawn, see #updateGroups.
 */
export default function ActivityUpdater(eventBus, canvas, elementRegistry) {

  CommandInterceptor.call(this, eventBus);

  this._canvas = canvas;
  this._elementRegistry = elementRegistry;
  this._positions = new PositionTracker();

  const self = this;

  function updateShape(event) {

    // notes are handled by the CommentUpdater
    if (isComment(event.context.shape)) {
      return;
    }

    const shape = event.context.shape;

    self.updateShapeOwner(shape);

    // the pins and expansion nodes of a node
    (shape.attachers || []).forEach(attacher => self.updateShapeOwner(attacher));

    // moving a node, e.g. into a structured activity node, may change the owner of
    // the edges of the node and of the nodes inside it
    for (const connection of getConnections(shape)) {
      if (isControlFlow(connection) && connection.parent) {
        self._setOwned(connection.businessObject, self._getEdgeOwner(connection), 'edge');
      }
    }
  }

  function updateConnection(event) {
    if (isComment(event.context.connection)) {
      return;
    }

    const connection = event.context.connection;

    if (isControlFlow(connection)) {
      self.updateFlow(connection, event.context);
    }
  }

  const SHAPE_COMMANDS = [ 'shape.create', 'shape.delete', 'shape.move', 'element.updateAttachment' ];
  const CONNECTION_COMMANDS = [ 'connection.create', 'connection.delete', 'connection.reconnect' ];

  this.executed(SHAPE_COMMANDS, updateShape);
  this.reverted(SHAPE_COMMANDS, updateShape);

  this.executed(CONNECTION_COMMANDS, updateConnection);
  this.reverted(CONNECTION_COMMANDS, updateConnection);

  // an expansion node changed between input and output
  function updateExpansionNode(event) {
    const element = event.context.element;

    if (isExpansionNode(element)) {
      self.updateShapeOwner(element);
    }
  }

  this.executed('element.updateProperties', updateExpansionNode);
  this.reverted('element.updateProperties', updateExpansionNode);

  // after commands, undoing and redoing them, not when a diagram is opened
  eventBus.on('commandStack.changed', function(event) {
    if (event.trigger !== 'clear') {
      self.updateGroups();
    }
  });
}

inherits(ActivityUpdater, CommandInterceptor);

ActivityUpdater.$inject = [
  'eventBus',
  'canvas',
  'elementRegistry'
];

ActivityUpdater.prototype._getActivity = function() {
  return this._canvas.getRootElement().businessObject;
};

/**
 * @param {Shape} shape
 */
ActivityUpdater.prototype.updateShapeOwner = function(shape) {
  const bo = shape.businessObject;

  if (isPin(shape)) {
    const owner = shape.parent && shape.host ? shape.host.businessObject : null;

    return this._setOwned(bo, owner, owner ? getPinProperty(owner, isInput(bo)) : null);
  }

  if (isExpansionNode(shape)) {
    return this._updateExpansionNode(shape);
  }

  if (isGroup(shape)) {
    const activity = shape.parent ? this._getActivity() : null;

    this._setOwned(bo, activity, 'group');

    if (isPartition(shape)) {
      this._setReferenced(bo, activity, 'partition');
    }

    return;
  }

  if (isActivityNode(shape)) {
    this._setOwned(bo, shape.parent ? this._getOwner(shape.parent) : null, 'node');
  }
};

/**
 * Expansion nodes are owned like their expansion region, which references them as
 * its inputs or outputs. They keep whether they are an input or an output while detached.
 */
ActivityUpdater.prototype._updateExpansionNode = function(shape) {
  const bo = shape.businessObject;
  const input = isInput(bo);

  const region = shape.parent && shape.host ? shape.host.businessObject : null;

  this._setOwned(bo, region ? region.$parent : null, 'node');

  // the regions it was an input or output of, also when changing between both
  for (const oldRegion of new Set([ bo.regionAsInput, bo.regionAsOutput, region ])) {
    if (!oldRegion) {
      continue;
    }

    if (oldRegion !== region || !input) {
      this._positions.remove(oldRegion.get('inputElement'), bo);
    }

    if (oldRegion !== region || input) {
      this._positions.remove(oldRegion.get('outputElement'), bo);
    }
  }

  if (region) {
    this._positions.add(region.get(input ? 'inputElement' : 'outputElement'), bo);

    bo.set(input ? 'regionAsInput' : 'regionAsOutput', region);
  }
};

/**
 * @param {Element} parent the shape a node is shown in
 *
 * @return {ModdleElement} the structured activity node or activity owning nodes shown in it
 */
ActivityUpdater.prototype._getOwner = function(parent) {
  while (parent.parent && !is(parent, 'uml:StructuredActivityNode')) {
    parent = parent.parent;
  }

  return parent.parent ? parent.businessObject : this._getActivity();
};

/**
 * @return {ModdleElement} the innermost structured activity node containing both
 * ends of an edge, or else the activity
 */
ActivityUpdater.prototype._getEdgeOwner = function(connection) {
  const sourceOwners = getOwners(connection.source.businessObject);
  const targetOwners = new Set(getOwners(connection.target.businessObject));

  return sourceOwners.find(owner => targetOwners.has(owner)) || this._getActivity();
};

/**
 * @param {Connection} connection
 * @param {Object} context of the command, with old source and target, if any
 */
ActivityUpdater.prototype.updateFlow = function(connection, context) {
  const flow = connection.businessObject;
  const attached = !!(connection.parent && connection.source && connection.target);

  this._setOwned(flow, attached ? this._getEdgeOwner(connection) : null, 'edge');

  const source = attached ? connection.source.businessObject : null;
  const target = attached ? connection.target.businessObject : null;

  // detach from previous ends
  [ flow.source, context.oldSource && context.oldSource.businessObject ].forEach(node => {
    if (node && node !== source) {
      this._positions.remove(node.get('outgoing'), flow);
    }
  });

  [ flow.target, context.oldTarget && context.oldTarget.businessObject ].forEach(node => {
    if (node && node !== target) {
      this._positions.remove(node.get('incoming'), flow);
    }
  });

  flow.set('source', source || undefined);
  flow.set('target', target || undefined);

  if (source) {
    this._positions.add(source.get('outgoing'), flow);
  }

  if (target) {
    this._positions.add(target.get('incoming'), flow);
  }
};

/**
 * Partitions and interruptible regions group the nodes whose middle they contain,
 * partitions also the edges both of whose ends they group (UML 2.5.1, 15.6.3.2,
 * 15.7.3.2). Interruptible regions are interrupted by the edges marked so.
 *
 * Nodes and edges in the activity but not shown keep the groups they are in,
 * those removed from it leave them.
 */
ActivityUpdater.prototype.updateGroups = function() {
  const registry = this._elementRegistry;

  const groups = registry.filter(element => isGroup(element) && element.parent);
  const nodes = registry.filter(element => isActivityNode(element) && element.parent);
  const edges = registry.filter(element => isControlFlow(element) && element.parent);

  const shown = new Set([ ...nodes, ...edges ].map(element => element.businessObject));

  // members not shown, but still in the activity
  const isKept = element => !shown.has(element) && !!element.$parent;

  const members = new Map(groups.map(group => [ group, nodes.filter(node => contains(group, getMid(node))) ]));

  for (const node of nodes) {
    const containing = groups.filter(group => members.get(group).includes(node)).map(group => group.businessObject);

    setList(node.businessObject, 'inPartition', containing.filter(group => is(group, 'uml:ActivityPartition')));
    setList(node.businessObject, 'inInterruptibleRegion', containing.filter(group => is(group, 'uml:InterruptibleActivityRegion')));
  }

  for (const edge of edges) {
    const containing = groups.filter(group => isPartition(group) && members.get(group).includes(edge.source) && members.get(group).includes(edge.target));

    setList(edge.businessObject, 'inPartition', containing.map(group => group.businessObject));
  }

  for (const group of groups) {
    const bo = group.businessObject;

    // keep the order of members as far as possible
    const grouped = members.get(group).map(node => node.businessObject);
    const kept = bo.get('node').filter(node => isKept(node) || grouped.includes(node));

    setList(bo, 'node', [ ...kept, ...grouped.filter(node => !kept.includes(node)) ]);

    if (isPartition(group)) {
      const groupedEdges = edges.filter(edge => members.get(group).includes(edge.source) && members.get(group).includes(edge.target)).map(edge => edge.businessObject);
      const keptEdges = bo.get('edge').filter(edge => isKept(edge) || groupedEdges.includes(edge));

      setList(bo, 'edge', [ ...keptEdges, ...groupedEdges.filter(edge => !keptEdges.includes(edge)) ]);
    }

    if (isInterruptibleRegion(group)) {
      const interrupting = edges.filter(edge => edge.businessObject.interrupts === bo).map(edge => edge.businessObject);
      const keptEdges = bo.get('interruptingEdge').filter(edge => isKept(edge) || interrupting.includes(edge));

      setList(bo, 'interruptingEdge', [ ...keptEdges, ...interrupting.filter(edge => !keptEdges.includes(edge)) ]);
    }
  }
};

/**
 * Add or remove a model element to or from a collection of its owner.
 */
ActivityUpdater.prototype._setOwned = function(bo, owner, property) {
  const oldOwner = bo.$parent;
  const oldProperty = oldOwner && getContainingProperty(oldOwner, bo);

  if (oldOwner === owner && oldProperty === property) {
    return;
  }

  if (oldOwner && oldProperty) {
    this._positions.remove(oldOwner.get(oldProperty), bo);
  }

  if (owner) {
    this._positions.add(owner.get(property), bo);
  }

  bo.$parent = owner;
};

/**
 * Add or remove a model element to or from a collection referencing it.
 */
ActivityUpdater.prototype._setReferenced = function(bo, owner, property) {
  const activity = this._getActivity();
  const collection = activity.get(property);

  if (owner) {
    this._positions.add(collection, bo);
  } else {
    this._positions.remove(collection, bo);
  }
};


/**
 * @return {string|undefined} the property of an owner containing a model element
 */
function getContainingProperty(owner, bo) {
  const descriptor = owner.$descriptor;

  const property = descriptor.properties.find(p => p.isMany && !p.isReference && owner.get(p.name).includes(bo));

  return property && property.name;
}

/**
 * Set a list property, if its elements change.
 */
function setList(bo, property, elements) {
  const list = bo.get(property);

  if (list.length === elements.length && list.every((element, index) => element === elements[index])) {
    return;
  }

  bo.set(property, elements);
}

function getMid(shape) {
  return {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2
  };
}

function contains(bounds, point) {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y && point.y <= bounds.y + bounds.height;
}

/**
 * The connections of a shape and of the shapes inside it or attached to it, at any depth.
 */
function getConnections(shape) {
  return [
    ...shape.incoming,
    ...shape.outgoing,
    ...(shape.attachers || []).flatMap(getConnections),
    ...(shape.children || []).filter(child => !child.waypoints).flatMap(getConnections)
  ];
}
