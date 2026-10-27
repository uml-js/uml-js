import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import PositionTracker from '../../core/util/PositionTracker.js';

import { is, isComment, isLabel } from '../../core/util/ModelUtil.js';

import { isArtifact, isNode } from '../util/ElementUtil.js';


/**
 * Keeps the UML model in sync with deployment diagrams:
 *
 *   * nodes are nested in the node they are drawn in,
 *     or packaged in the diagram's package
 *   * artifacts are packaged in the diagram's package; drawn in a node,
 *     they are deployed there, by a deployment owned by the node
 *   * communication paths are packaged in the diagram's package, owning
 *     their two ends, typed by the connected nodes
 *   * deployments drawn as «deploy» dependencies are owned by the node
 *   * other dependencies are packaged in the diagram's package
 *
 * Like UmlUpdater, all updates are derived from the current diagram state
 * and therefore apply to executing and reverting commands alike.
 */
export default function DeploymentUpdater(eventBus, umlFactory, canvas, elementRegistry) {

  CommandInterceptor.call(this, eventBus);

  this._umlFactory = umlFactory;
  this._canvas = canvas;
  this._elementRegistry = elementRegistry;
  this._positions = new PositionTracker();

  // the deployment of artifacts drawn in nodes, by artifact
  this._deployments = new WeakMap();

  const self = this;

  function updateShape(event) {

    // notes are handled by the CommentUpdater
    if (isComment(event.context.shape)) {
      return;
    }

    const shape = event.context.shape;

    if (!isLabel(shape)) {
      self.updateShape(shape);
    }
  }

  function updateConnection(event) {
    if (isComment(event.context.connection)) {
      return;
    }

    self.updateConnection(event.context.connection);
  }

  const SHAPE_COMMANDS = [ 'shape.create', 'shape.delete', 'shape.move', 'node.changeType' ];
  const CONNECTION_COMMANDS = [ 'connection.create', 'connection.delete', 'connection.reconnect' ];

  this.executed(SHAPE_COMMANDS, updateShape);
  this.reverted(SHAPE_COMMANDS, updateShape);

  this.executed(CONNECTION_COMMANDS, updateConnection);
  this.reverted(CONNECTION_COMMANDS, updateConnection);
}

inherits(DeploymentUpdater, CommandInterceptor);

DeploymentUpdater.$inject = [
  'eventBus',
  'umlFactory',
  'canvas',
  'elementRegistry'
];

DeploymentUpdater.prototype._getPackage = function() {
  return this._canvas.getRootElement().businessObject;
};

/**
 * @param {Shape} shape
 */
DeploymentUpdater.prototype.updateShape = function(shape) {
  const bo = shape.businessObject;
  const parent = shape.parent;

  if (isNode(shape)) {
    if (!parent) {
      this._setOwner(bo, null);
    } else if (isNode(parent)) {
      this._setOwner(bo, parent.businessObject, 'nestedNode');
    } else {
      this._setOwner(bo, this._getPackage(), 'packagedElement');
    }

    // the deployments of contained artifacts move along
    shape.children.filter(isArtifact).forEach(artifact => this.updateShape(artifact));

    return;
  }

  if (isArtifact(shape)) {
    this._setOwner(bo, parent ? this._getPackage() : null, 'packagedElement');

    const deployment = this._getDeployment(bo);

    if (parent && isNode(parent)) {
      const node = parent.businessObject;

      deployment.set('deployedArtifact', [ bo ]);
      deployment.set('client', [ node ]);
      deployment.set('supplier', [ bo ]);

      this._setOwner(deployment, node, 'deployment');
    } else {
      this._setOwner(deployment, null);
    }
  }
};

/**
 * @param {ModdleElement} artifact
 *
 * @return {ModdleElement} the deployment of the artifact drawn in a node: existing, imported or new
 */
DeploymentUpdater.prototype._getDeployment = function(artifact) {
  let deployment = this._deployments.get(artifact);

  if (!deployment) {
    const drawn = new Set(this._elementRegistry.filter(element => element.waypoints).map(element => element.businessObject));

    deployment = this._elementRegistry
      .filter(element => isNode(element))
      .flatMap(element => element.businessObject.get('deployment'))
      .find(candidate => !drawn.has(candidate) && candidate.get('deployedArtifact').includes(artifact));

    deployment = deployment || this._umlFactory.create('uml:Deployment');

    this._deployments.set(artifact, deployment);
  }

  return deployment;
};

/**
 * @param {Connection} connection
 */
DeploymentUpdater.prototype.updateConnection = function(connection) {
  const bo = connection.businessObject;

  const source = connection.source && connection.source.businessObject;
  const target = connection.target && connection.target.businessObject;

  const attached = !!(connection.parent && source && target);

  if (is(bo, 'uml:CommunicationPath')) {
    this._updateEnds(bo, source, target);

    return this._setOwner(bo, attached ? this._getPackage() : null, 'packagedElement');
  }

  if (is(bo, 'uml:Deployment')) {
    bo.set('deployedArtifact', source ? [ source ] : []);
    bo.set('client', target ? [ target ] : []);
    bo.set('supplier', source ? [ source ] : []);

    return this._setOwner(bo, attached ? target : null, 'deployment');
  }

  if (is(bo, 'uml:Dependency')) {
    bo.set('client', source ? [ source ] : []);
    bo.set('supplier', target ? [ target ] : []);

    return this._setOwner(bo, attached ? this._getPackage() : null, 'packagedElement');
  }
};

/**
 * Communication paths own their two ends, typed by the connected nodes.
 */
DeploymentUpdater.prototype._updateEnds = function(path, source, target) {
  const ends = path.get('ownedEnd');

  while (ends.length < 2) {
    const end = this._umlFactory.create('uml:Property');

    end.$parent = path;
    end.set('association', path);
    ends.push(end);
  }

  if (!path.get('memberEnd').length) {
    path.set('memberEnd', [ ends[0], ends[1] ]);
  }

  const [ sourceEnd, targetEnd ] = path.get('memberEnd');

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
DeploymentUpdater.prototype._setOwner = function(bo, owner, property) {
  const oldOwner = bo.$parent;

  if (oldOwner === owner && (!owner || owner.get(property).includes(bo))) {
    return;
  }

  if (oldOwner) {
    [ 'packagedElement', 'nestedNode', 'deployment' ]
      .filter(name => oldOwner.$descriptor.propertiesByName[name])
      .forEach(name => this._positions.remove(oldOwner.get(name), bo));
  }

  if (owner) {
    this._positions.add(owner.get(property), bo);
  }

  bo.$parent = owner;
};
