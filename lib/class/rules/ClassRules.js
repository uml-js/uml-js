import inherits from 'inherits-browser';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';

import { is, isLabel } from '../../core/util/ModelUtil.js';

import { isClassifier, isInterface } from '../util/ElementUtil.js';


/**
 * Modeling rules for class diagrams.
 */
export default function ClassRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(ClassRules, RuleProvider);

ClassRules.$inject = [ 'eventBus' ];

ClassRules.prototype.init = function() {

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
    return canReconnect(context.connection, context.source, context.target);
  });

  this.addRule('shape.resize', function(context) {
    return isClassifier(context.shape);
  });

  this.addRule('shape.attach', function() {
    return false;
  });
};

/**
 * Classifiers are drawn on the diagram, labels anywhere.
 */
export function canCreate(shape, target) {
  if (isLabel(shape)) {
    return true;
  }

  return !!target && !target.parent && isClassifier(shape);
}

/**
 * Classes realize interfaces, everything else is associated by default.
 *
 * @return {false|{ type: string }}
 */
export function canConnect(source, target) {
  if (!isClassifier(source) || !isClassifier(target)) {
    return false;
  }

  if (is(source, 'uml:Class') && isInterface(target)) {
    return { type: 'uml:InterfaceRealization' };
  }

  return { type: 'uml:Association' };
}

/**
 * The relationships a connection between source and target may be changed into.
 *
 * @return {string[]}
 */
export function getRelationshipTypes(source, target) {
  if (!isClassifier(source) || !isClassifier(target)) {
    return [];
  }

  const types = [ 'uml:Association', 'uml:Dependency' ];

  // generalizations between classifiers of the same kind
  if (source !== target && source.type === target.type) {
    types.push('uml:Generalization');
  }

  if (is(source, 'uml:Class') && isInterface(target)) {
    types.push('uml:InterfaceRealization');
  }

  return types;
}

/**
 * Relationships keep their type when reconnected, as far as it fits the new ends.
 */
export function canReconnect(connection, source, target) {
  return getRelationshipTypes(source, target).includes(connection.type) ? { type: connection.type } : false;
}
