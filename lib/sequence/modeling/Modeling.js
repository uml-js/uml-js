import inherits from 'inherits-browser';

import UmlModeling from '../../core/modeling/UmlModeling.js';

import UpdateLabelHandler from './cmd/UpdateLabelHandler.js';
import AddOperandHandler from './cmd/AddOperandHandler.js';
import AppendLifelineHandler from './cmd/AppendLifelineHandler.js';
import UpdateGuardHandler from './cmd/UpdateGuardHandler.js';


/**
 * Sequence diagram modeling: UML modeling plus name editing, appending
 * lifelines and adding operands to combined fragments.
 */
export default function Modeling(eventBus, elementFactory, commandStack) {
  UmlModeling.call(this, eventBus, elementFactory, commandStack);
}

inherits(Modeling, UmlModeling);

Modeling.$inject = [
  'eventBus',
  'elementFactory',
  'commandStack'
];

Modeling.prototype.getHandlers = function() {
  const handlers = UmlModeling.prototype.getHandlers.call(this);

  handlers['element.updateLabel'] = UpdateLabelHandler;
  handlers['fragment.addOperand'] = AddOperandHandler;
  handlers['lifeline.append'] = AppendLifelineHandler;
  handlers['operand.updateGuard'] = UpdateGuardHandler;

  return handlers;
};

/**
 * @param {Element} element
 * @param {string} newLabel the new name
 */
Modeling.prototype.updateLabel = function(element, newLabel) {
  this._commandStack.execute('element.updateLabel', {
    element,
    newLabel
  });
};

/**
 * Append a lifeline to another one, connected by a message sent at the given height.
 *
 * @param {Shape} source
 * @param {Shape} shape the lifeline to append
 * @param {number} y
 *
 * @return {Shape} the appended lifeline
 */
Modeling.prototype.appendLifeline = function(source, shape, y) {
  const context = { source, shape, y };

  this._commandStack.execute('lifeline.append', context);

  return context.shape;
};

/**
 * Add an operand to a combined fragment, splitting its last operand.
 *
 * @param {Shape} fragment
 *
 * @return {Shape} the operand
 */
Modeling.prototype.addOperand = function(fragment) {
  const context = { fragment };

  this._commandStack.execute('fragment.addOperand', context);

  return context.operand;
};

/**
 * @param {Shape} operand
 * @param {string} guard the guard, without brackets
 */
Modeling.prototype.updateGuard = function(operand, guard) {
  this._commandStack.execute('operand.updateGuard', {
    element: operand,
    guard
  });
};

/**
 * Lifelines are connected by (synchronous) messages.
 */
Modeling.prototype.getConnectionAttrs = function() {
  return { type: 'uml:Message' };
};
