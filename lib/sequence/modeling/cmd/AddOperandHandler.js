import { MIN_OPERAND_HEIGHT, getOperands } from '../../util/ElementUtil.js';


/**
 * Adds an operand to a combined fragment, splitting its last operand.
 */
export default function AddOperandHandler(modeling, elementFactory) {
  this._modeling = modeling;
  this._elementFactory = elementFactory;
}

AddOperandHandler.$inject = [
  'modeling',
  'elementFactory'
];

AddOperandHandler.prototype.preExecute = function(context) {
  const { fragment } = context;

  const operands = getOperands(fragment);
  const last = operands[operands.length - 1];

  // make room, if the last operand is too small to be split
  if (last.height < 2 * MIN_OPERAND_HEIGHT) {
    this._modeling.resizeShape(fragment, {
      x: fragment.x,
      y: fragment.y,
      width: fragment.width,
      height: fragment.height + 2 * MIN_OPERAND_HEIGHT - last.height
    });
  }

  const half = Math.round(last.height / 2);

  this._modeling.resizeShape(last, {
    x: last.x,
    y: last.y,
    width: last.width,
    height: half
  }, null, { layoutOperands: true });

  context.operand = this._modeling.createShape(this._elementFactory.createShape({ type: 'uml:InteractionOperand' }), {
    x: fragment.x,
    y: last.y + half,
    width: fragment.width,
    height: fragment.y + fragment.height - last.y - half
  }, fragment);
};

AddOperandHandler.prototype.execute = function() {};

AddOperandHandler.prototype.revert = function() {};
