import { mid, setSnapped } from 'diagram-js/lib/features/snapping/SnapUtil.js';

import { isCmd } from 'diagram-js/lib/features/keyboard/KeyboardUtil.js';

const HIGHER_PRIORITY = 1250;

// connecting to the border of a shape snaps inside it
const TARGET_BOUNDS_PADDING = 10;

// close to the middle of a shape, connecting snaps to the middle
const TARGET_CENTER_PADDING = 20;

// shapes up to this size are connected at their center, e.g. pseudostates
const SMALL_SIZE = 50;

const AXES = [ 'x', 'y' ];


/**
 * Snaps new connections to the shapes they connect, so they are laid out
 * straight where possible: they start at the center of their source and end
 * at the center of small targets, or level with the center of larger ones when
 * close to it. Lines of notes are not snapped, nor is connecting with CMD pressed.
 *
 * Adapted from bpmn-js, BpmnConnectSnapping (https://github.com/bpmn-io/bpmn-js).
 */
export default function ConnectSnapping(eventBus) {
  eventBus.on([
    'connect.hover',
    'connect.move',
    'connect.end'
  ], HIGHER_PRIORITY, function(event) {
    const context = event.context;
    const { canExecute, start, hover } = context;

    if (event.originalEvent && isCmd(event.originalEvent)) {
      return;
    }

    if (!context.initialConnectionStart) {
      context.initialConnectionStart = context.connectionStart;
    }

    if (!canExecute || !hover || canExecute.type === 'uml:Comment') {

      // un-snap the start
      context.connectionStart = context.initialConnectionStart;

      return;
    }

    snapToShape(event, hover);

    context.connectionStart = mid(start);

    if (isSmall(hover)) {
      snapToPosition(event, mid(hover));
    } else {
      snapToTargetMid(event, hover);
    }
  });
}

ConnectSnapping.$inject = [ 'eventBus' ];


// helpers //////////

function isSmall(shape) {
  return shape.width <= SMALL_SIZE && shape.height <= SMALL_SIZE;
}

function getDimension(axis, shape) {
  return axis === 'x' ? shape.width : shape.height;
}

function snapToShape(event, target) {
  AXES.forEach(axis => {
    const dimension = getDimension(axis, target);

    if (event[ axis ] < target[ axis ] + TARGET_BOUNDS_PADDING) {
      setSnapped(event, axis, target[ axis ] + TARGET_BOUNDS_PADDING);
    } else if (event[ axis ] > target[ axis ] + dimension - TARGET_BOUNDS_PADDING) {
      setSnapped(event, axis, target[ axis ] + dimension - TARGET_BOUNDS_PADDING);
    }
  });
}

function snapToTargetMid(event, target) {
  const targetMid = mid(target);

  AXES.forEach(axis => {
    if (isMid(event, target, axis)) {
      setSnapped(event, axis, targetMid[ axis ]);
    }
  });
}

function snapToPosition(event, position) {
  setSnapped(event, 'x', position.x);
  setSnapped(event, 'y', position.y);
}

function isMid(event, target, axis) {
  return event[ axis ] > target[ axis ] + TARGET_CENTER_PADDING &&
    event[ axis ] < target[ axis ] + getDimension(axis, target) - TARGET_CENTER_PADDING;
}
