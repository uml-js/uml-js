import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import PositionTracker from '../../core/util/PositionTracker.js';

import { is, isLabel } from '../../core/util/ModelUtil.js';


/**
 * Keeps the UML model in sync with class diagrams:
 *
 *   * classifiers are packaged in the diagram's package
 *   * associations are packaged in the diagram's package, owning their two
 *     ends, typed by the source and the target classifier
 *   * generalizations are owned by the specific classifier
 *   * interface realizations are owned by the implementing class
 *   * dependencies are packaged in the diagram's package
 *
 * Like UmlUpdater, all updates are derived from the current diagram state
 * and therefore apply to executing and reverting commands alike.
 */
export default function ClassUpdater(eventBus, umlFactory, canvas) {

  CommandInterceptor.call(this, eventBus);

  this._umlFactory = umlFactory;
  this._canvas = canvas;
  this._positions = new PositionTracker();

  const self = this;

  function updateShape(event) {
    const shape = event.context.shape;

    if (!isLabel(shape)) {
      self.updateShape(shape);
    }
  }

  function updateConnection(event) {
    self.updateConnection(event.context.connection);
  }

  const SHAPE_COMMANDS = [ 'shape.create', 'shape.delete' ];
  const CONNECTION_COMMANDS = [ 'connection.create', 'connection.delete', 'connection.reconnect' ];

  this.executed(SHAPE_COMMANDS, updateShape);
  this.reverted(SHAPE_COMMANDS, updateShape);

  this.executed(CONNECTION_COMMANDS, updateConnection);
  this.reverted(CONNECTION_COMMANDS, updateConnection);
}

inherits(ClassUpdater, CommandInterceptor);

ClassUpdater.$inject = [
  'eventBus',
  'umlFactory',
  'canvas'
];

ClassUpdater.prototype._getPackage = function() {
  return this._canvas.getRootElement().businessObject;
};

/**
 * @param {Shape} shape
 */
ClassUpdater.prototype.updateShape = function(shape) {
  this._setOwner(shape.businessObject, shape.parent ? this._getPackage() : null, 'packagedElement');
};

/**
 * @param {Connection} connection
 */
ClassUpdater.prototype.updateConnection = function(connection) {
  const bo = connection.businessObject;

  const source = connection.source && connection.source.businessObject;
  const target = connection.target && connection.target.businessObject;

  const attached = !!(connection.parent && source && target);

  if (is(bo, 'uml:Association')) {
    this._updateEnds(bo, source, target);

    return this._setOwner(bo, attached ? this._getPackage() : null, 'packagedElement');
  }

  if (is(bo, 'uml:Generalization')) {
    bo.set('general', target);

    return this._setOwner(bo, attached ? source : null, 'generalization');
  }

  if (is(bo, 'uml:InterfaceRealization')) {
    bo.set('contract', target);
    bo.set('client', source ? [ source ] : []);
    bo.set('supplier', target ? [ target ] : []);

    return this._setOwner(bo, attached ? source : null, 'interfaceRealization');
  }

  if (is(bo, 'uml:Dependency')) {
    bo.set('client', source ? [ source ] : []);
    bo.set('supplier', target ? [ target ] : []);

    return this._setOwner(bo, attached ? this._getPackage() : null, 'packagedElement');
  }
};

/**
 * Associations own their two ends, the first typed by the source,
 * the second by the target classifier.
 */
ClassUpdater.prototype._updateEnds = function(association, source, target) {
  const ends = association.get('ownedEnd');

  while (ends.length < 2) {
    const end = this._umlFactory.create('uml:Property');

    end.$parent = association;
    end.set('association', association);
    ends.push(end);
  }

  if (!association.get('memberEnd').length) {
    association.set('memberEnd', [ ends[0], ends[1] ]);
  }

  const [ sourceEnd, targetEnd ] = association.get('memberEnd');

  sourceEnd.set('type', source);
  targetEnd.set('type', target);
};

/**
 * Move a model element to the given owner's collection.
 *
 * @param {ModdleElement} bo
 * @param {ModdleElement|null} owner
 * @param {string} [property]
 */
ClassUpdater.prototype._setOwner = function(bo, owner, property) {
  const oldOwner = bo.$parent;

  if (oldOwner === owner && (!owner || owner.get(property).includes(bo))) {
    return;
  }

  if (oldOwner) {
    [ 'packagedElement', 'generalization', 'interfaceRealization' ]
      .filter(name => oldOwner.$descriptor.propertiesByName[name])
      .forEach(name => this._positions.remove(oldOwner.get(name), bo));
  }

  if (owner) {
    this._positions.add(owner.get(property), bo);
  }

  bo.$parent = owner;
};
