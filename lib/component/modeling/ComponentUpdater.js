import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import PositionTracker from '../../core/util/PositionTracker.js';

import { is, isLabel } from '../../core/util/ModelUtil.js';

import { getConnectorContext } from '../util/ElementUtil.js';


/**
 * Keeps the UML model in sync with component diagrams:
 *
 *   * components and interfaces are packaged elements of the package
 *     (diagram) or component they are drawn in
 *   * ports are owned attributes of the component they are attached to
 *   * interface realizations are owned by the realizing component
 *   * other dependencies are packaged next to their client
 *   * connectors are owned by the innermost component containing both ports
 *
 * Like UmlUpdater, all updates are derived from the current diagram state
 * and therefore apply to executing and reverting commands alike.
 */
export default function ComponentUpdater(eventBus, umlFactory, elementRegistry) {

  CommandInterceptor.call(this, eventBus);

  this._eventBus = eventBus;
  this._elementRegistry = elementRegistry;
  this._umlFactory = umlFactory;
  this._positions = new PositionTracker();

  const self = this;

  function updateShape(event) {
    const shape = event.context.shape;

    if (isLabel(shape)) {
      return;
    }

    self.updateShapeOwner(shape);

    // moving shapes may change the owner of connected relationships
    if (shape.parent) {
      [ ...shape.incoming, ...shape.outgoing ].forEach(connection => self.updateConnection(connection));

      (shape.attachers || []).forEach(port => {
        [ ...port.incoming, ...port.outgoing ].forEach(connection => self.updateConnection(connection));
      });
    }
  }

  function updateConnection(event) {
    self.updateConnection(event.context.connection);
  }

  const SHAPE_COMMANDS = [ 'shape.create', 'shape.delete', 'shape.move', 'element.updateAttachment' ];
  const CONNECTION_COMMANDS = [ 'connection.create', 'connection.delete', 'connection.move', 'connection.reconnect' ];

  this.executed(SHAPE_COMMANDS, updateShape);
  this.reverted(SHAPE_COMMANDS, updateShape);

  this.executed(CONNECTION_COMMANDS, updateConnection);
  this.reverted(CONNECTION_COMMANDS, updateConnection);
}

inherits(ComponentUpdater, CommandInterceptor);

ComponentUpdater.$inject = [
  'eventBus',
  'umlFactory',
  'elementRegistry'
];

/**
 * @param {Shape} shape
 */
ComponentUpdater.prototype.updateShapeOwner = function(shape) {
  const bo = shape.businessObject;

  if (is(bo, 'uml:Port')) {
    const owner = shape.parent && shape.host ? shape.host.businessObject : null;

    return this._setOwner(bo, owner, 'ownedAttribute');
  }

  const owner = shape.parent ? shape.parent.businessObject : null;

  this._setOwner(bo, owner, 'packagedElement');
};

/**
 * @param {Connection} connection
 */
ComponentUpdater.prototype.updateConnection = function(connection) {
  const bo = connection.businessObject;

  const source = connection.source && connection.source.businessObject;
  const target = connection.target && connection.target.businessObject;

  const attached = !!(connection.parent && source && target);

  if (is(bo, 'uml:Connector')) {
    this._updateConnectorEnds(bo, source, target);

    return this._setOwner(bo, attached ? getConnectorContext(source, target) : null, 'ownedConnector');
  }

  if (is(bo, 'uml:Dependency')) {
    bo.set('client', source ? [ source ] : []);
    bo.set('supplier', target ? [ target ] : []);

    if (is(bo, 'uml:InterfaceRealization')) {
      bo.set('contract', target);

      return this._setOwner(bo, attached ? source : null, 'interfaceRealization');
    }

    return this._setOwner(bo, attached ? getPackagingOwner(source) : null, 'packagedElement');
  }
};

ComponentUpdater.prototype._updateConnectorEnds = function(connector, source, target) {
  const ends = connector.get('end');

  while (ends.length < 2) {
    const end = this._umlFactory.create('uml:ConnectorEnd');

    end.$parent = connector;
    ends.push(end);
  }

  ends[0].set('role', source);
  ends[1].set('role', target);
};

/**
 * Move a model element to the given owner's collection.
 *
 * @param {ModdleElement} bo
 * @param {ModdleElement|null} owner
 * @param {string} property
 */
ComponentUpdater.prototype._setOwner = function(bo, owner, property) {
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

  // components render differently once they (stop to) contain other classifiers
  if (property === 'packagedElement') {
    this._changed(oldOwner);
    this._changed(owner);
  }
};

ComponentUpdater.prototype._changed = function(bo) {
  if (!is(bo, 'uml:Component')) {
    return;
  }

  this._elementRegistry.filter(element => element.businessObject === bo && !isLabel(element)).forEach(element => {
    this._eventBus.fire('element.changed', { element });
  });
};


/**
 * Dependencies are packaged in the package or component owning their client.
 */
function getPackagingOwner(client) {
  let owner = client.$parent;

  while (owner && !(is(owner, 'uml:Package') || is(owner, 'uml:Component'))) {
    owner = owner.$parent;
  }

  return owner || null;
}
