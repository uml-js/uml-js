import inherits from 'inherits-browser';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';

import { isLabel } from '../../core/util/ModelUtil.js';

import { isPackage } from '../util/ElementUtil.js';


/**
 * Modeling rules for package diagrams: packages nest in packages,
 * relationships connect packages.
 */
export default function PackageRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(PackageRules, RuleProvider);

PackageRules.$inject = [ 'eventBus' ];

PackageRules.prototype.init = function() {

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
    return canConnect(context.source, context.target) && { type: context.connection.type };
  });

  this.addRule('shape.resize', function(context) {
    return isPackage(context.shape);
  });

  this.addRule('shape.attach', function() {
    return false;
  });
};

export function canCreate(shape, target) {
  if (isLabel(shape)) {
    return true;
  }

  return !!target && isPackage(shape) && (!target.parent || isPackage(target));
}

/**
 * @return {false|{ type: string }}
 */
export function canConnect(source, target) {
  if (!isPackage(source) || !isPackage(target) || source === target) {
    return false;
  }

  return { type: 'uml:Dependency' };
}
