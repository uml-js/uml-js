import inherits from 'inherits-browser';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';

import { isLabel } from '../../core/util/ModelUtil.js';

import { isArtifact, isNode } from '../util/ElementUtil.js';


/**
 * Modeling rules for deployment diagrams: nodes and artifacts are drawn
 * on the diagram or in nodes.
 */
export default function DeploymentRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(DeploymentRules, RuleProvider);

DeploymentRules.$inject = [ 'eventBus' ];

DeploymentRules.prototype.init = function() {

  this.addRule('shape.create', function(context) {
    return canCreate(context.shape, context.target);
  });

  this.addRule('elements.create', function(context) {
    return context.elements.every(element => element.waypoints || canCreate(element, context.target));
  });

  this.addRule('elements.move', function(context) {
    const target = context.target;

    return context.shapes.every(shape => isLabel(shape) || !target || canCreate(shape, target));
  });

  this.addRule('connection.create', function(context) {
    return canConnect(context.source, context.target);
  });

  this.addRule('connection.reconnect', function(context) {
    return getRelationshipTypes(context.source, context.target).includes(context.connection.type) && { type: context.connection.type };
  });

  this.addRule('shape.resize', function(context) {
    return isNode(context.shape) || isArtifact(context.shape);
  });

  this.addRule('shape.attach', function() {
    return false;
  });
};

export function canCreate(shape, target) {
  if (isLabel(shape)) {
    return true;
  }

  return !!target && (isNode(shape) || isArtifact(shape)) && (!target.parent || isNode(target));
}

/**
 * The relationships possible between source and target, the default first:
 * communication paths between nodes, deployments of artifacts on nodes.
 *
 * @return {string[]}
 */
export function getRelationshipTypes(source, target) {
  if (!source || !target || source === target) {
    return [];
  }

  if (isNode(source) && isNode(target)) {
    return [ 'uml:CommunicationPath', 'uml:Dependency' ];
  }

  if (isArtifact(source) && isNode(target)) {
    return [ 'uml:Deployment', 'uml:Dependency' ];
  }

  if ((isArtifact(source) || isNode(source)) && (isArtifact(target) || isNode(target))) {
    return [ 'uml:Dependency' ];
  }

  return [];
}

/**
 * @return {false|{ type: string }}
 */
export function canConnect(source, target) {
  const types = getRelationshipTypes(source, target);

  return types.length ? { type: types[0] } : false;
}

