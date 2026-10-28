import inherits from 'inherits-browser';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';

import { is, isLabel } from '../../core/util/ModelUtil.js';

import { isActivityNode, isForkOrJoin, isStructured } from '../util/ElementUtil.js';


/**
 * Modeling rules for activity diagrams: nodes are drawn on the activity or
 * inside structured activity nodes, and connected by control flows.
 */
export default function ActivityRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(ActivityRules, RuleProvider);

ActivityRules.$inject = [ 'eventBus' ];

ActivityRules.prototype.init = function() {

  this.addRule('shape.create', function(context) {
    return canCreate(context.shape, context.target);
  });

  this.addRule('elements.create', function(context) {
    return context.elements.every(element => element.waypoints || canCreate(element, context.target));
  });

  this.addRule('elements.move', function(context) {
    const target = context.target;

    return context.shapes.every(shape => isLabel(shape) || !target || canContain(target));
  });

  this.addRule('connection.create', function(context) {
    return canConnect(context.source, context.target);
  });

  this.addRule('connection.reconnect', function(context) {
    return canConnect(context.source, context.target);
  });

  this.addRule('shape.resize', function(context) {
    return is(context.shape, 'uml:Action') || isForkOrJoin(context.shape);
  });

  this.addRule('shape.attach', function() {
    return false;
  });
};

export function canCreate(shape, target) {
  if (isLabel(shape)) {
    return true;
  }

  return isActivityNode(shape) && canContain(target);
}

/**
 * Nodes are shown on the activity (root) or inside structured activity nodes.
 */
export function canContain(target) {
  return !!target && (!target.parent || isStructured(target));
}

export function canConnect(source, target) {
  if (!isActivityNode(source) || !isActivityNode(target) || source === target) {
    return false;
  }

  // nothing leaves a final node, nothing enters an initial node
  if (is(source, 'uml:FinalNode') || is(target, 'uml:InitialNode')) {
    return false;
  }

  return { type: 'uml:ControlFlow' };
}
