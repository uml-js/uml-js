import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import PositionTracker from '../util/PositionTracker.js';

import { getRoot, isConnection, isLabel } from '../util/ModelUtil.js';


/**
 * Keeps UML DI in sync with the diagram: bounds, waypoints, edge ends and
 * the nesting of diagram elements.
 *
 * Every update derives the DI from the current diagram state, which makes it
 * work the same for executing and reverting commands.
 *
 * Diagram types keep their model (non-DI) in sync on their own.
 */
export default function UmlUpdater(eventBus, connectionDocking, umlFactory) {

  CommandInterceptor.call(this, eventBus);

  this._umlFactory = umlFactory;
  this._positions = new PositionTracker();

  const self = this;

  function cropConnection(event) {
    const context = event.context;

    if (!context.cropped) {
      const connection = context.connection;

      connection.waypoints = connectionDocking.getCroppedWaypoints(connection);
      context.cropped = true;
    }
  }

  this.executed([
    'connection.layout',
    'connection.create'
  ], cropConnection);

  this.reverted([ 'connection.layout' ], function(event) {
    delete event.context.cropped;
  });

  const PARENT_CHANGING = [
    'shape.create',
    'label.create',
    'shape.delete',
    'shape.move',
    'connection.create',
    'connection.delete',
    'connection.move',
    'element.updateAttachment'
  ];

  const BOUNDS_CHANGING = [
    'shape.create',
    'label.create',
    'shape.move',
    'shape.resize'
  ];

  const WAYPOINTS_CHANGING = [
    'connection.create',
    'connection.layout',
    'connection.move',
    'connection.updateWaypoints',
    'connection.reconnect'
  ];

  const ENDS_CHANGING = [
    'connection.create',
    'connection.reconnect'
  ];

  function updateParent(event) {
    const context = event.context;

    self.updateDiParent(context.shape || context.connection);
  }

  function updateBounds(event) {
    self.updateBounds(event.context.shape);
  }

  function updateWaypoints(event) {
    self.updateWaypoints(event.context.connection);
  }

  function updateEnds(event) {
    self.updateEdgeEnds(event.context.connection);
  }

  this.executed(PARENT_CHANGING, updateParent);
  this.reverted(PARENT_CHANGING, updateParent);

  this.executed(BOUNDS_CHANGING, updateBounds);
  this.reverted(BOUNDS_CHANGING, updateBounds);

  this.executed(WAYPOINTS_CHANGING, updateWaypoints);
  this.reverted(WAYPOINTS_CHANGING, updateWaypoints);

  this.executed(ENDS_CHANGING, updateEnds);
  this.reverted(ENDS_CHANGING, updateEnds);
}

inherits(UmlUpdater, CommandInterceptor);

UmlUpdater.$inject = [
  'eventBus',
  'connectionDocking',
  'umlFactory'
];

/**
 * Return the DI element that should own the DI of the given element.
 *
 *   * labels are owned by their label target
 *   * edges are owned by the diagram
 *   * attached shapes are owned by their host
 *   * other shapes are owned by their parent shape (or the diagram)
 *
 * @param {Element} element
 *
 * @return {ModdleElement|null}
 */
UmlUpdater.prototype.getDiOwner = function(element) {
  if (!element.parent) {
    return null;
  }

  if (isLabel(element)) {
    return element.labelTarget.di;
  }

  if (isConnection(element)) {
    return getRoot(element).di;
  }

  // attached shapes (e.g. ports) are owned by their host
  if (element.host) {
    return element.host.di;
  }

  return element.parent.di;
};

UmlUpdater.prototype.updateDiParent = function(element) {
  const di = element && element.di;

  if (!di) {
    return;
  }

  const oldOwner = di.$parent;
  const newOwner = this.getDiOwner(element);

  // labels shown by default, without label DI yet, get their DI once they are placed
  if (isLabel(element) && !oldOwner && !di.bounds) {
    return;
  }

  if (oldOwner === newOwner) {
    return;
  }

  if (oldOwner) {
    this._positions.remove(oldOwner.get('ownedElement'), di);
  }

  if (newOwner) {
    this._positions.add(newOwner.get('ownedElement'), di);
  }

  di.$parent = newOwner;
};

UmlUpdater.prototype.updateBounds = function(shape) {
  const di = shape.di;

  if (!di) {
    return;
  }

  di.set('bounds', this._umlFactory.createBounds(shape));
  di.bounds.$parent = di;

  // labels are created lazily for imported edges
  if (isLabel(shape) && shape.parent) {
    this.updateDiParent(shape);
  }
};

UmlUpdater.prototype.updateWaypoints = function(connection) {
  const di = connection.di;

  if (!di) {
    return;
  }

  const points = this._umlFactory.createPoints(connection.waypoints);

  points.forEach(point => point.$parent = di);

  di.set('waypoint', points);
};

UmlUpdater.prototype.updateEdgeEnds = function(connection) {
  const di = connection.di;

  if (!di) {
    return;
  }

  di.set('source', connection.source && connection.source.di);
  di.set('target', connection.target && connection.target.di);
};
