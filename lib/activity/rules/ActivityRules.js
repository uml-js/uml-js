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
    const { shape, target } = context;

    return target && target.waypoints ? canInsert(shape, target) : canCreate(shape, target);
  });

  // nodes dropped on a control flow are inserted into it
  this.addRule('shape.insert', function(context) {
    return canInsert(context.shape, context.connection);
  });

  this.addRule('elements.create', function(context) {
    const { elements, target } = context;

    if (target && target.waypoints) {
      return elements.length === 1 && canInsert(elements[0], target);
    }

    return elements.every(element => element.waypoints || canCreate(element, target));
  });

  this.addRule('elements.move', function(context) {
    const { shapes, target } = context;

    if (target && target.waypoints) {
      return shapes.length === 1 && canInsert(shapes[0], target);
    }

    return shapes.every(shape => isLabel(shape) || !target || canContain(target));
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
 * A node may be inserted into a control flow, splitting it, if it may be drawn where
 * the control flow is, and is neither of its ends.
 */
export function canInsert(shape, connection) {
  if (!is(connection, 'uml:ControlFlow') || isLabel(connection)) {
    return false;
  }

  if (connection.source === shape || connection.target === shape) {
    return false;
  }

  return isActivityNode(shape) && canContain(connection.parent);
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
