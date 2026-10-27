import { getGuardText } from '../../util/ElementUtil.js';


/**
 * Sets the guard of an operand: an interaction constraint with an opaque expression.
 */
export default function UpdateGuardHandler(umlFactory) {
  this._umlFactory = umlFactory;
}

UpdateGuardHandler.$inject = [ 'umlFactory' ];

UpdateGuardHandler.prototype.execute = function(context) {
  const { element, guard } = context;
  const operand = element.businessObject;

  context.oldGuard = operand.guard;

  // compute once, so re-doing re-uses the same model elements
  if (!('newGuard' in context)) {
    const text = (guard || '').trim();

    context.newGuard = text === getGuardText(operand) ? operand.guard : (text ? this._createGuard(operand, text) : undefined);
  }

  operand.set('guard', context.newGuard);

  return [ element ];
};

UpdateGuardHandler.prototype.revert = function(context) {
  context.element.businessObject.set('guard', context.oldGuard);

  return [ context.element ];
};

UpdateGuardHandler.prototype._createGuard = function(operand, text) {
  const guard = this._umlFactory.create('uml:InteractionConstraint');
  const specification = this._umlFactory.create('uml:OpaqueExpression', { body: [ text ] });

  guard.specification = specification;
  specification.$parent = guard;
  guard.$parent = operand;

  return guard;
};
