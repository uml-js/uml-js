import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import PositionTracker from '../../core/util/PositionTracker.js';

import { isActivityNode, isControlFlow } from '../util/ElementUtil.js';

import { is, isComment } from '../../core/util/ModelUtil.js';


/**
 * Keeps the activity in sync with activity diagrams:
 *
 *   * nodes are owned by the structured activity node they are shown in,
 *     or else by the activity
 *   * edges are owned by the innermost structured activity node containing
 *     both their source and target, or else by the activity (UML 2.5.1, 16.11.3.1)
 *   * edges reference their source and target, nodes their incoming
 *     and outgoing edges
 *
 * Like UmlUpdater, all updates are derived from the current diagram state
 * and therefore apply to executing and reverting commands alike.
 */
export default function ActivityUpdater(eventBus, canvas) {

  CommandInterceptor.call(this, eventBus);

  this._canvas = canvas;
  this._positions = new PositionTracker();

  const self = this;

  function updateShape(event) {

    // notes are handled by the CommentUpdater
    if (isComment(event.context.shape)) {
      return;
    }

    const shape = event.context.shape;

    if (isActivityNode(shape)) {
      self._setOwned(shape.businessObject, shape.parent ? self._getOwner(shape.parent) : null, 'node');
    }

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

  const SHAPE_COMMANDS = [ 'shape.create', 'shape.delete', 'shape.move' ];
  const CONNECTION_COMMANDS = [ 'connection.create', 'connection.delete', 'connection.reconnect' ];

  this.executed(SHAPE_COMMANDS, updateShape);
  this.reverted(SHAPE_COMMANDS, updateShape);

  this.executed(CONNECTION_COMMANDS, updateConnection);
  this.reverted(CONNECTION_COMMANDS, updateConnection);
}

inherits(ActivityUpdater, CommandInterceptor);

ActivityUpdater.$inject = [
  'eventBus',
  'canvas'
];

ActivityUpdater.prototype._getActivity = function() {
  return this._canvas.getRootElement().businessObject;
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
 * Add or remove a model element to or from the activity's collection.
 */
ActivityUpdater.prototype._setOwned = function(bo, owner, property) {
  const oldOwner = bo.$parent;

  if (oldOwner === owner) {
    return;
  }

  if (oldOwner) {
    this._positions.remove(oldOwner.get(property), bo);
  }

  if (owner) {
    this._positions.add(owner.get(property), bo);
  }

  bo.$parent = owner;
};


/**
 * The structured activity nodes and the activity containing a node, innermost first.
 */
function getOwners(node) {
  const owners = [];

  for (let owner = node.$parent; owner; owner = owner.$parent) {
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
 * The connections of a shape and of the shapes inside it, at any depth.
 */
function getConnections(shape) {
  return [
    ...shape.incoming,
    ...shape.outgoing,
    ...(shape.children || []).filter(child => !child.waypoints).flatMap(getConnections)
  ];
}
