import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { isSnapped, setSnapped } from 'diagram-js/lib/features/snapping/SnapUtil.js';

import {
  EXECUTION_SIZE,
  MESSAGE_MARGIN,
  getLifelineX,
  isExecution,
  isLifeline
} from '../../util/ElementUtil.js';

const HIGH_PRIORITY = 1500;


/**
 * Keeps activation bars on the dashed line of their lifeline, at their
 * width: snaps them while creating and moving, and centers them again after
 * they or their lifeline changed. Lifelines grow to hold their activation bars.
 */
export default function ExecutionBehavior(eventBus, modeling) {

  CommandInterceptor.call(this, eventBus);

  eventBus.on([
    'create.move',
    'create.end',
    'shape.move.move',
    'shape.move.end'
  ], HIGH_PRIORITY, function(event) {
    const context = event.context;
    const shape = context.shape;

    const lifeline = getHoveredLifeline(event.hover);

    if (!isExecution(shape) || !lifeline || (context.shapes && context.shapes.length !== 1) || isSnapped(event, 'x')) {
      return;
    }

    setSnapped(event, 'x', getLifelineX(lifeline));
  });

  // dropped on another bar, an activation bar goes to its lifeline
  eventBus.on([ 'create.end', 'shape.move.end' ], HIGH_PRIORITY, function(event) {
    const context = event.context;

    if (isExecution(context.shape) && isExecution(context.target)) {
      context.target = context.target.parent;
    }
  });

  this.postExecuted([ 'shape.create', 'shape.move', 'shape.resize' ], function(event) {
    const shape = event.context.shape;

    if (isExecution(shape) && shape.parent) {
      center(shape);
      fit(shape);
    }

    // lifelines resized: their bars follow the dashed line
    if (isLifeline(shape) && shape.parent) {
      shape.children.filter(isExecution).forEach(center);
    }
  });

  function fit(execution) {
    const lifeline = execution.parent;

    const bottom = execution.y + execution.height + 2 * MESSAGE_MARGIN;

    if (lifeline.y + lifeline.height < bottom) {
      modeling.resizeShape(lifeline, {
        x: lifeline.x,
        y: lifeline.y,
        width: lifeline.width,
        height: bottom - lifeline.y
      });
    }
  }

  function center(execution) {
    const x = getLifelineX(execution.parent) - EXECUTION_SIZE.width / 2;

    if (execution.x !== x || execution.width !== EXECUTION_SIZE.width) {
      modeling.resizeShape(execution, {
        x,
        y: execution.y,
        width: EXECUTION_SIZE.width,
        height: execution.height
      });
    }
  }
}

inherits(ExecutionBehavior, CommandInterceptor);

ExecutionBehavior.$inject = [
  'eventBus',
  'modeling'
];


function getHoveredLifeline(hover) {
  if (isExecution(hover)) {
    return hover.parent;
  }

  return isLifeline(hover) ? hover : null;
}
