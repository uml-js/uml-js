import inherits from 'inherits-browser';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';

import { is, isLabel } from '../../core/util/ModelUtil.js';

import { isCollapsed, isPseudostate, isState, isSubmachineState, isVertex } from '../util/ElementUtil.js';


/**
 * Modeling rules for state machine diagrams.
 */
export default function StateMachineRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(StateMachineRules, RuleProvider);

StateMachineRules.$inject = [ 'eventBus' ];

StateMachineRules.prototype.init = function() {

  this.addRule('shape.create', function(context) {
    return canCreate(context.shape, context.target);
  });

  this.addRule('elements.create', function(context) {
    return context.elements.every(element => {
      return element.waypoints || canCreate(element, context.target);
    });
  });

  this.addRule('elements.move', function(context) {
    const target = context.target;

    return context.shapes.every(shape => {
      return isLabel(shape) || !target || canContain(target);
    });
  });

  this.addRule('connection.create', function(context) {
    return canConnect(context.source, context.target);
  });

  this.addRule('connection.reconnect', function(context) {
    return canConnect(context.source, context.target);
  });

  this.addRule('shape.resize', function(context) {
    return canResize(context.shape);
  });

  this.addRule('shape.attach', function() {
    return false;
  });
};

StateMachineRules.prototype.canConnect = canConnect;
StateMachineRules.prototype.canCreate = canCreate;
StateMachineRules.prototype.canResize = canResize;


/**
 * Vertices may be drawn on the state machine (root) or inside states, except
 * submachine states, whose states belong to the state machine referred to,
 * and collapsed states, whose states are shown in a diagram of their own.
 */
export function canContain(target) {
  return !!target && (!target.parent || (isState(target) && !isSubmachineState(target) && !isCollapsed(target)));
}

export function canCreate(shape, target) {
  if (isLabel(shape)) {
    return true;
  }

  return isVertex(shape) && canContain(target);
}

export function canConnect(source, target) {
  if (!isVertex(source) || !isVertex(target) || source === target) {
    return false;
  }

  // nothing leaves a final state or a terminate pseudostate
  if (is(source, 'uml:FinalState') || isPseudostate(source, 'terminate')) {
    return false;
  }

  // nothing enters an initial pseudostate
  if (isPseudostate(target, 'initial')) {
    return false;
  }

  return { type: 'uml:Transition' };
}

export function canResize(shape) {
  return isState(shape) || isPseudostate(shape, 'fork') || isPseudostate(shape, 'join');
}
