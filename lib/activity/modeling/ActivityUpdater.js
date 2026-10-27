import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import PositionTracker from '../../core/util/PositionTracker.js';

import { isActivityNode, isControlFlow } from '../util/ElementUtil.js';


/**
 * Keeps the activity in sync with activity diagrams:
 *
 *   * nodes and edges are owned by the activity
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
    const shape = event.context.shape;

    if (isActivityNode(shape)) {
      self._setOwned(shape.businessObject, shape.parent ? self._getActivity() : null, 'node');
    }
  }

  function updateConnection(event) {
    const connection = event.context.connection;

    if (isControlFlow(connection)) {
      self.updateFlow(connection, event.context);
    }
  }

  const SHAPE_COMMANDS = [ 'shape.create', 'shape.delete' ];
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
 * @param {Connection} connection
 * @param {Object} context of the command, with old source and target, if any
 */
ActivityUpdater.prototype.updateFlow = function(connection, context) {
  const flow = connection.businessObject;
  const attached = !!(connection.parent && connection.source && connection.target);

  this._setOwned(flow, attached ? this._getActivity() : null, 'edge');

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
