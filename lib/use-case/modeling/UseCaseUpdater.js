import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import PositionTracker from '../../core/util/PositionTracker.js';

import { is, isLabel } from '../../core/util/ModelUtil.js';

import { isSubject, isUseCase } from '../util/ElementUtil.js';


/**
 * Keeps the UML model in sync with use case diagrams:
 *
 *   * actors and subjects are packaged in the diagram's package
 *   * use cases are owned by the subject they are drawn in, which they
 *     reference as subject, or packaged in the diagram's package
 *   * associations are packaged in the diagram's package, owning
 *     their two ends, typed by the actor and the use case
 *   * includes and extends are owned by the including / extending use case,
 *     generalizations by the specific classifier
 *
 * Like UmlUpdater, all updates are derived from the current diagram state
 * and therefore apply to executing and reverting commands alike.
 */
export default function UseCaseUpdater(eventBus, umlFactory, canvas) {

  CommandInterceptor.call(this, eventBus);

  this._umlFactory = umlFactory;
  this._canvas = canvas;
  this._positions = new PositionTracker();

  const self = this;

  function updateShape(event) {
    const shape = event.context.shape;

    if (!isLabel(shape)) {
      self.updateShape(shape);

      if (shape.parent) {
        [ ...shape.incoming, ...shape.outgoing ].forEach(connection => self.updateConnection(connection));
      }
    }
  }

  function updateConnection(event) {
    self.updateConnection(event.context.connection);
  }

  const SHAPE_COMMANDS = [ 'shape.create', 'shape.delete', 'shape.move' ];
  const CONNECTION_COMMANDS = [ 'connection.create', 'connection.delete', 'connection.reconnect' ];

  this.executed(SHAPE_COMMANDS, updateShape);
  this.reverted(SHAPE_COMMANDS, updateShape);

  this.executed(CONNECTION_COMMANDS, updateConnection);
  this.reverted(CONNECTION_COMMANDS, updateConnection);
}

inherits(UseCaseUpdater, CommandInterceptor);

UseCaseUpdater.$inject = [
  'eventBus',
  'umlFactory',
  'canvas'
];

UseCaseUpdater.prototype._getPackage = function() {
  return this._canvas.getRootElement().businessObject;
};

/**
 * @param {Shape} shape
 */
UseCaseUpdater.prototype.updateShape = function(shape) {
  const bo = shape.businessObject;

  if (!shape.parent) {
    this._setOwner(bo, null);

    if (isUseCase(shape)) {
      bo.set('subject', []);
    }

    return;
  }

  if (isUseCase(shape) && isSubject(shape.parent)) {
    const subject = shape.parent.businessObject;

    this._setOwner(bo, subject, 'ownedUseCase');
    bo.set('subject', [ subject ]);

    return;
  }

  this._setOwner(bo, this._getPackage(), 'packagedElement');

  if (isUseCase(shape)) {
    bo.set('subject', []);
  }
};

/**
 * @param {Connection} connection
 */
UseCaseUpdater.prototype.updateConnection = function(connection) {
  const bo = connection.businessObject;

  const source = connection.source && connection.source.businessObject;
  const target = connection.target && connection.target.businessObject;

  const attached = !!(connection.parent && source && target);

  if (is(bo, 'uml:Association')) {
    this._updateEnds(bo, source, target);

    return this._setOwner(bo, attached ? this._getPackage() : null, 'packagedElement');
  }

  if (is(bo, 'uml:Include')) {
    bo.set('addition', target);

    return this._setOwner(bo, attached ? source : null, 'include');
  }

  if (is(bo, 'uml:Extend')) {
    bo.set('extendedCase', target);

    return this._setOwner(bo, attached ? source : null, 'extend');
  }

  if (is(bo, 'uml:Generalization')) {
    bo.set('general', target);

    return this._setOwner(bo, attached ? source : null, 'generalization');
  }
};

/**
 * Associations own their two ends, typed by the connected classifiers.
 */
UseCaseUpdater.prototype._updateEnds = function(association, source, target) {
  const ends = association.get('ownedEnd');

  while (ends.length < 2) {
    const end = this._umlFactory.create('uml:Property');

    end.$parent = association;
    end.set('association', association);
    ends.push(end);
  }

  ends[0].set('type', source);
  ends[1].set('type', target);

  association.set('memberEnd', [ ends[0], ends[1] ]);
};

/**
 * Move a model element to the given owner's collection.
 *
 * @param {ModdleElement} bo
 * @param {ModdleElement|null} owner
 * @param {string} [property]
 */
UseCaseUpdater.prototype._setOwner = function(bo, owner, property) {
  const oldOwner = bo.$parent;

  if (oldOwner === owner && (!owner || owner.get(property).includes(bo))) {
    return;
  }

  if (oldOwner) {
    [ 'packagedElement', 'ownedUseCase', 'include', 'extend', 'generalization' ]
      .filter(name => oldOwner.$descriptor.propertiesByName[name])
      .forEach(name => this._positions.remove(oldOwner.get(name), bo));
  }

  if (owner) {
    this._positions.add(owner.get(property), bo);
  }

  bo.$parent = owner;
};
