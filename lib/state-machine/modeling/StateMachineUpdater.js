import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import PositionTracker from '../../core/util/PositionTracker.js';

import { is, isComment, isLabel } from '../../core/util/ModelUtil.js';

import { getReferences, isConnectionPoint, isConnectionPointReference, isTransition, isVertex } from '../util/ElementUtil.js';


/**
 * Keeps the UML model in sync with the diagram:
 *
 *   * vertices are owned by the (first) region of the state or
 *     state machine they are drawn in
 *   * entry and exit points are owned by the composite state they are
 *     attached to, or else by the state machine
 *   * connection point references are owned by the submachine state
 *     they are attached to
 *   * transitions are owned by the innermost region containing
 *     both their source and target
 *
 * Like UmlUpdater, all updates are derived from the current diagram state
 * and therefore apply to executing and reverting commands alike.
 */
export default function StateMachineUpdater(eventBus, umlFactory, canvas, elementRegistry) {

  CommandInterceptor.call(this, eventBus);

  this._umlFactory = umlFactory;
  this._canvas = canvas;
  this._eventBus = eventBus;
  this._elementRegistry = elementRegistry;

  this._positions = new PositionTracker();

  // regions created implicitly when dropping vertices into
  // simple states, removed again once they become empty
  this._implicitRegions = new WeakSet();

  // implicit regions removed from states that became empty, re-used when undoing
  this._removedRegions = new WeakMap();

  const self = this;

  function updateShape(event) {

    // notes are handled by the CommentUpdater
    if (isComment(event.context.shape)) {
      return;
    }

    const shape = event.context.shape;

    if (!isVertex(shape)) {
      return;
    }

    self.updateVertexContainer(shape);

    // moving a vertex may change the region a connected transition belongs to
    if (shape.parent) {
      [ ...shape.incoming, ...shape.outgoing ].forEach(connection => self.updateTransitionContainer(connection));
    }
  }

  function updateConnection(event) {
    if (isComment(event.context.connection)) {
      return;
    }

    const connection = event.context.connection;

    if (!isTransition(connection)) {
      return;
    }

    self.updateTransitionEnds(connection);
    self.updateTransitionContainer(connection);
  }

  const SHAPE_COMMANDS = [ 'shape.create', 'shape.delete', 'shape.move', 'element.updateAttachment' ];
  const CONNECTION_COMMANDS = [ 'connection.create', 'connection.delete', 'connection.move', 'connection.reconnect' ];

  this.executed(SHAPE_COMMANDS, updateShape);
  this.reverted(SHAPE_COMMANDS, updateShape);

  this.executed(CONNECTION_COMMANDS, updateConnection);
  this.reverted(CONNECTION_COMMANDS, updateConnection);
}

inherits(StateMachineUpdater, CommandInterceptor);

StateMachineUpdater.$inject = [
  'eventBus',
  'umlFactory',
  'canvas',
  'elementRegistry'
];

/**
 * @param {Shape} shape
 */
StateMachineUpdater.prototype.updateVertexContainer = function(shape) {
  if (isConnectionPoint(shape) || isConnectionPointReference(shape)) {
    return this.updateConnectionPointOwner(shape);
  }

  const bo = shape.businessObject;

  const oldRegion = bo.$parent;
  const newRegion = shape.parent ? this._getRegion(shape.parent) : null;

  if (oldRegion === newRegion) {
    return;
  }

  if (oldRegion) {
    this._positions.remove(oldRegion.get('subvertex'), bo);

    this._removeIfEmpty(oldRegion);
  }

  if (newRegion) {
    this._positions.add(newRegion.get('subvertex'), bo);
  }

  bo.$parent = newRegion;

  // states render differently once they become (or stop being) composite
  this._changed(oldRegion);
  this._changed(newRegion);
};

/**
 * @param {Shape} shape an entry or exit point, or a connection point reference
 */
StateMachineUpdater.prototype.updateConnectionPointOwner = function(shape) {
  const bo = shape.businessObject;

  const reference = isConnectionPointReference(shape);
  const property = reference ? 'connection' : 'connectionPoint';

  const oldOwner = bo.$parent;

  let newOwner = null;

  // a point keeps its owner while other shapes show it, and when no shape shows it
  // anymore while connection point references refer to it
  if (!reference && (
    this._elementRegistry.filter(element => element.businessObject === bo && element !== shape && !isLabel(element)).length ||
    (!shape.parent && oldOwner && getReferences(bo).length)
  )) {
    return;
  }

  if (shape.parent) {
    newOwner = shape.host ? shape.host.businessObject : (reference ? null : this._canvas.getRootElement().businessObject);
  }

  if (oldOwner === newOwner) {
    return;
  }

  if (oldOwner) {
    this._positions.remove(oldOwner.get(property), bo);
  }

  if (newOwner) {
    this._positions.add(newOwner.get(property), bo);
  }

  bo.$parent = newOwner;
};

/**
 * @param {Connection} connection
 */
StateMachineUpdater.prototype.updateTransitionContainer = function(connection) {
  const bo = connection.businessObject;

  const oldRegion = bo.$parent;
  const newRegion = connection.parent && connection.source && connection.target
    ? this._getTransitionRegion(connection.source.businessObject, connection.target.businessObject)
    : null;

  if (oldRegion === newRegion) {
    return;
  }

  if (oldRegion) {
    this._positions.remove(oldRegion.get('transition'), bo);

    this._removeIfEmpty(oldRegion);
  }

  if (newRegion) {
    this._positions.add(newRegion.get('transition'), bo);
  }

  bo.$parent = newRegion;
};

StateMachineUpdater.prototype.updateTransitionEnds = function(connection) {
  const bo = connection.businessObject;

  bo.set('source', connection.source && connection.source.businessObject);
  bo.set('target', connection.target && connection.target.businessObject);
};

/**
 * Return the region a diagram element's children belong to,
 * creating it if necessary.
 *
 * @param {Element} parent the root element (state machine) or a state
 *
 * @return {ModdleElement} uml:Region
 */
StateMachineUpdater.prototype._getRegion = function(parent) {
  const bo = isLabel(parent) ? null : parent.businessObject;

  if (!bo || !(is(bo, 'uml:StateMachine') || is(bo, 'uml:State'))) {
    throw new Error(`cannot place vertex in <${ parent.id }>`);
  }

  const regions = bo.get('region');

  if (!regions.length) {
    const region = this._removedRegions.get(bo) || this._umlFactory.create('uml:Region');

    this._implicitRegions.add(region);

    region.$parent = bo;
    this._positions.add(regions, region);
  }

  return regions[0];
};

/**
 * The innermost region containing both vertices.
 */
StateMachineUpdater.prototype._getTransitionRegion = function(source, target) {
  const sourceRegions = getRegions(source, target);
  const targetRegions = getRegions(target, source);

  const region = sourceRegions.find(r => targetRegions.includes(r));

  return region || sourceRegions[sourceRegions.length - 1] || this._getRegion(this._canvas.getRootElement());
};

/**
 * Remove implicitly created regions of states that became empty, so states stop
 * being composite. Regions read from a file or explicitly created are kept.
 */
StateMachineUpdater.prototype._removeIfEmpty = function(region) {
  const owner = region.$parent;

  if (!is(owner, 'uml:State') || !this._implicitRegions.has(region)) {
    return;
  }

  if (region.get('subvertex').length || region.get('transition').length) {
    return;
  }

  this._positions.remove(owner.get('region'), region);
  this._removedRegions.set(owner, region);

  region.$parent = null;
};

StateMachineUpdater.prototype._changed = function(region) {
  const owner = region && region.$parent;

  if (!is(owner, 'uml:State')) {
    return;
  }

  this._elementRegistry.filter(element => element.businessObject === owner && !isLabel(element)).forEach(element => {
    this._eventBus.fire('element.changed', { element });
  });
};


// helpers //////////

/**
 * @param {ModdleElement} vertex
 * @param {ModdleElement} [other] the vertex at the other end of a transition
 *
 * @return {ModdleElement[]} the regions a vertex is (transitively) contained in, innermost first;
 * entry and exit points count as part of the region of their state or state machine the other
 * vertex is in, if it is inside, connection point references as part of the regions of their state
 */
function getRegions(vertex, other) {
  const container = vertex.$parent;

  // transitions to and from connection point references are outside their submachine state
  if (is(vertex, 'uml:ConnectionPointReference')) {
    return container ? getRegions(container) : [];
  }

  // entry and exit points, of a composite state or the state machine
  if (is(vertex, 'uml:Pseudostate') && container && !is(container, 'uml:Region')) {
    const containerRegions = is(container, 'uml:State') ? getRegions(container) : [];

    const inner = other && getRegions(other).find(region => region.$parent === container);

    if (inner) {
      return [ inner, ...containerRegions ];
    }

    return is(container, 'uml:State') ? containerRegions : container.get('region').slice(0, 1);
  }

  const regions = [];

  let region = container;

  while (region && is(region, 'uml:Region')) {
    regions.push(region);

    const owner = region.$parent;

    region = owner && is(owner, 'uml:State') ? owner.$parent : null;
  }

  return regions;
}
