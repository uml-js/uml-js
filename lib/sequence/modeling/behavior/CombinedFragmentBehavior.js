import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import {
  MIN_OPERAND_HEIGHT,
  getOperands,
  isCombinedFragment,
  isOperand
} from '../../util/ElementUtil.js';


/**
 * Keeps the operands of combined fragments stacked: they span the width
 * of their frame and divide its height, top to bottom.
 *
 *   * frames are drawn on the interaction
 *   * a new frame gets its first operand
 *   * resizing a frame resizes its last operand
 *   * resizing an operand moves the separator below it
 *   * removing an operand gives its space to the operand above (or below)
 */
export default function CombinedFragmentBehavior(eventBus, modeling, elementFactory, canvas) {

  CommandInterceptor.call(this, eventBus);

  // frames are drawn on the interaction, also when dropped onto lifelines or other frames
  eventBus.on([ 'create.end', 'shape.move.end' ], HIGH_PRIORITY, function(event) {
    const context = event.context;

    if (isCombinedFragment(context.shape) && context.target) {
      context.target = canvas.getRootElement();
    }
  });

  // before ordering (see UmlOrderingProvider), which depends on the parent
  this.preExecute('shape.create', HIGH_PRIORITY, function(event) {
    const context = event.context;

    if (isCombinedFragment(context.shape) && context.parent && context.parent.parent) {
      context.parent = canvas.getRootElement();
    }
  });

  this.postExecuted('shape.create', function(event) {
    const shape = event.context.shape;

    if (isCombinedFragment(shape) && !getOperands(shape).length) {
      modeling.createShape(elementFactory.createShape({ type: 'uml:InteractionOperand' }), {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height
      }, shape);
    }
  });

  this.preExecute('shape.delete', function(event) {
    const shape = event.context.shape;

    // with their frame, operands go anyway
    if (!isOperand(shape) || !shape.parent || !shape.parent.parent || event.context.hints && event.context.hints.nested) {
      return;
    }

    event.context.oldOperands = getOperands(shape.parent);
  });

  this.postExecuted('shape.delete', function(event) {
    const { shape, oldOperands } = event.context;

    if (!oldOperands || oldOperands.length < 2) {
      return;
    }

    const index = oldOperands.indexOf(shape);
    const neighbor = index > 0 ? oldOperands[index - 1] : oldOperands[index + 1];

    modeling.resizeShape(neighbor, {
      x: neighbor.x,
      y: Math.min(neighbor.y, shape.y),
      width: neighbor.width,
      height: neighbor.height + shape.height
    }, null, { layoutOperands: true });
  });

  this.postExecuted('shape.resize', function(event) {
    const { shape, oldBounds, hints } = event.context;

    // resizes done here
    if (hints && hints.layoutOperands) {
      return;
    }

    if (isCombinedFragment(shape)) {
      layoutOperands(shape);
    }

    if (isOperand(shape) && shape.parent && isCombinedFragment(shape.parent)) {
      fitOperand(shape, oldBounds);
    }
  });

  /**
   * Stack the operands of a frame again after it was resized.
   */
  function layoutOperands(frame) {
    const operands = getOperands(frame);

    let y = frame.y;

    operands.forEach((operand, index) => {
      const last = index === operands.length - 1;

      const height = last
        ? frame.y + frame.height - y
        : Math.max(MIN_OPERAND_HEIGHT, Math.min(operand.height, frame.y + frame.height - y - MIN_OPERAND_HEIGHT * (operands.length - index - 1)));

      setBounds(operand, { x: frame.x, y, width: frame.width, height });

      y += height;
    });
  }

  /**
   * An operand was resized: keep its top and the frame's width, move the separator below.
   */
  function fitOperand(operand, oldBounds) {
    const frame = operand.parent;
    const operands = getOperands(frame);
    const index = operands.indexOf(operand);
    const next = operands[index + 1];

    const top = oldBounds.y;
    const bottom = next
      ? Math.min(Math.max(operand.y + operand.height, top + MIN_OPERAND_HEIGHT), next.y + next.height - MIN_OPERAND_HEIGHT)
      : frame.y + frame.height;

    setBounds(operand, { x: frame.x, y: top, width: frame.width, height: bottom - top });

    if (next) {
      setBounds(next, { x: frame.x, y: bottom, width: frame.width, height: next.y + next.height - bottom });
    }
  }

  function setBounds(shape, bounds) {
    if (shape.x !== bounds.x || shape.y !== bounds.y || shape.width !== bounds.width || shape.height !== bounds.height) {
      modeling.resizeShape(shape, bounds, null, { layoutOperands: true });
    }
  }
}

inherits(CombinedFragmentBehavior, CommandInterceptor);

CombinedFragmentBehavior.$inject = [
  'eventBus',
  'modeling',
  'elementFactory',
  'canvas'
];

const HIGH_PRIORITY = 1500;
