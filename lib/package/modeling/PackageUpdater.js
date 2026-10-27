import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import PositionTracker from '../../core/util/PositionTracker.js';

import { is, isComment, isLabel } from '../../core/util/ModelUtil.js';

import { isPackage } from '../util/ElementUtil.js';

// before the changed elements are redrawn
const HIGH_PRIORITY = 1500;


/**
 * Keeps the UML model in sync with package diagrams:
 *
 *   * packages are packaged in the package they are drawn in,
 *     or in the diagram's package
 *   * dependencies are packaged next to their client
 *   * package imports and merges are owned by the importing / receiving package
 *
 * Like UmlUpdater, all updates are derived from the current diagram state
 * and therefore apply to executing and reverting commands alike.
 *
 * Packages whose contents change are redrawn, as their name moves between
 * body and tab.
 */
export default function PackageUpdater(eventBus, canvas) {

  CommandInterceptor.call(this, eventBus);

  this._canvas = canvas;
  this._positions = new PositionTracker();

  const self = this;

  const changedParents = new Set();

  function updateShape(event) {

    // notes are handled by the CommentUpdater
    if (isComment(event.context.shape)) {
      return;
    }

    const context = event.context;
    const shape = context.shape;

    if (isLabel(shape)) {
      return;
    }

    self.updateShape(shape);

    [ context.oldParent, context.newParent, context.parent, shape.parent ]
      .filter(parent => parent && isPackage(parent))
      .forEach(parent => changedParents.add(parent));
  }

  function updateConnection(event) {
    if (isComment(event.context.connection)) {
      return;
    }

    self.updateConnection(event.context.connection);
  }

  const SHAPE_COMMANDS = [ 'shape.create', 'shape.delete', 'shape.move' ];
  const CONNECTION_COMMANDS = [ 'connection.create', 'connection.delete', 'connection.reconnect' ];

  this.executed(SHAPE_COMMANDS, updateShape);
  this.reverted(SHAPE_COMMANDS, updateShape);

  this.executed(CONNECTION_COMMANDS, updateConnection);
  this.reverted(CONNECTION_COMMANDS, updateConnection);

  eventBus.on('elements.changed', HIGH_PRIORITY, function(event) {
    const elements = event.elements;

    changedParents.forEach(parent => {
      if (!elements.includes(parent)) {
        elements.push(parent);
      }
    });

    changedParents.clear();
  });
}

inherits(PackageUpdater, CommandInterceptor);

PackageUpdater.$inject = [
  'eventBus',
  'canvas'
];

/**
 * @param {Shape} shape
 */
PackageUpdater.prototype.updateShape = function(shape) {
  this._setOwner(shape.businessObject, shape.parent ? shape.parent.businessObject : null, 'packagedElement');

  // the connections of moved packages are packaged next to their clients
  if (shape.parent) {
    shape.outgoing.forEach(connection => this.updateConnection(connection));
  }
};

/**
 * @param {Connection} connection
 */
PackageUpdater.prototype.updateConnection = function(connection) {
  const bo = connection.businessObject;

  const source = connection.source && connection.source.businessObject;
  const target = connection.target && connection.target.businessObject;

  const attached = !!(connection.parent && source && target);

  if (is(bo, 'uml:PackageImport')) {
    bo.set('importedPackage', target);

    return this._setOwner(bo, attached ? source : null, 'packageImport');
  }

  if (is(bo, 'uml:PackageMerge')) {
    bo.set('mergedPackage', target);

    return this._setOwner(bo, attached ? source : null, 'packageMerge');
  }

  if (is(bo, 'uml:Dependency')) {
    bo.set('client', source ? [ source ] : []);
    bo.set('supplier', target ? [ target ] : []);

    return this._setOwner(bo, attached ? source.$parent : null, 'packagedElement');
  }
};

/**
 * Move a model element to the given owner's collection.
 *
 * @param {ModdleElement} bo
 * @param {ModdleElement|null} owner
 * @param {string} [property]
 */
PackageUpdater.prototype._setOwner = function(bo, owner, property) {
  const oldOwner = bo.$parent;

  if (oldOwner === owner && (!owner || owner.get(property).includes(bo))) {
    return;
  }

  if (oldOwner) {
    [ 'packagedElement', 'packageImport', 'packageMerge' ]
      .filter(name => oldOwner.$descriptor.propertiesByName[name])
      .forEach(name => this._positions.remove(oldOwner.get(name), bo));
  }

  if (owner) {
    this._positions.add(owner.get(property), bo);
  }

  bo.$parent = owner;
};
