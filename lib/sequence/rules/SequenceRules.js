import inherits from 'inherits-browser';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';

import { isLabel } from '../../core/util/ModelUtil.js';

import { isCombinedFragment, isExecution, isLifeline, isMessage, isMessageEnd, isOperand } from '../util/ElementUtil.js';


/**
 * Modeling rules for sequence diagrams: lifelines and combined fragments
 * are drawn on the interaction, activation bars on lifelines, messages
 * connect lifelines or activation bars (also of the same lifeline).
 * Operands are part of their combined fragment.
 */
export default function SequenceRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(SequenceRules, RuleProvider);

SequenceRules.$inject = [ 'eventBus' ];

SequenceRules.prototype.init = function() {

  this.addRule('shape.create', function(context) {
    return canCreate(context.shape, context.target);
  });

  this.addRule('elements.create', function(context) {
    return context.elements.every(element => element.waypoints || canCreate(element, context.target));
  });

  this.addRule('elements.move', function(context) {
    const target = context.target;

    return context.shapes.every(shape => {
      if (isLabel(shape) || isMessage(shape) || !target) {
        return true;
      }

      return canCreate(shape, target);
    });
  });

  this.addRule('connection.create', function(context) {
    return canConnect(context.source, context.target);
  });

  this.addRule('connection.reconnect', function(context) {
    return canConnect(context.source, context.target);
  });

  this.addRule('shape.resize', function(context) {
    const shape = context.shape;

    return isLifeline(shape) || isExecution(shape) || isCombinedFragment(shape) || isOperand(shape);
  });

  this.addRule('shape.attach', function() {
    return false;
  });
};

export function canCreate(shape, target) {
  if (isLabel(shape)) {
    return true;
  }

  if (isExecution(shape)) {
    return isLifeline(target);
  }

  // frames go to the interaction wherever they are dropped (see CombinedFragmentBehavior)
  if (isCombinedFragment(shape)) {
    return !!target;
  }

  if (isOperand(shape)) {
    return isCombinedFragment(target);
  }

  return isLifeline(shape) && !!target && !target.parent;
}

export function canConnect(source, target) {
  if (!isMessageEnd(source) || !isMessageEnd(target)) {
    return false;
  }

  return { type: 'uml:Message' };
}
