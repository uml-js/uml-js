import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { getMid } from 'diagram-js/lib/layout/LayoutUtil.js';

const HIGH_PRIORITY = 1500;

// how far inside the shape a connection point lies at least
const INSET = 2;


/**
 * Keeps the points connections dock at, the waypoints before cropping to the shapes
 * they connect, inside those shapes: a point on or outside the border, e.g. where the
 * end of a connection is dropped dragged along the border, makes moving the segment
 * at that end keep the point and bend the connection along the border, and keeps the
 * end of the connection off the border of the shape.
 *
 *   * the end of a connection dragged to a shape docks inside it
 *   * moving the segment at an end of a connection, a point not inside the shape is
 *     replaced by its middle across the move, as without a point
 */
export default function DockingBehavior(eventBus) {

  CommandInterceptor.call(this, eventBus);

  this.preExecute('connection.reconnect', function(event) {
    const context = event.context;
    const { dockingOrPoints, hints = {} } = context;

    if (!dockingOrPoints || Array.isArray(dockingOrPoints) || !hints.docking) {
      return;
    }

    const shape = hints.docking === 'source' ? context.newSource : context.newTarget;

    if (shape) {
      context.dockingOrPoints = insideOf(shape, dockingOrPoints);
    }
  });

  eventBus.on('connectionSegment.move.start', HIGH_PRIORITY, function(event) {
    const context = event.context;
    const { connection, segmentStartIndex, segmentEndIndex, axis } = context;

    const across = axis === 'x' ? 'y' : 'x';

    if (segmentStartIndex === 0) {
      context.segmentStart = acrossInside(connection.source, context.segmentStart, across);
    }

    if (segmentEndIndex === connection.waypoints.length - 1) {
      context.segmentEnd = acrossInside(connection.target, context.segmentEnd, across);
    }
  });
}

inherits(DockingBehavior, CommandInterceptor);

DockingBehavior.$inject = [ 'eventBus' ];


// helpers //////////

/**
 * @return {Point} the point, moved inside the shape if on or outside its border
 */
function insideOf(shape, point) {
  const inset = axis => Math.min(INSET, (axis === 'x' ? shape.width : shape.height) / 2);

  return {
    x: Math.min(Math.max(point.x, shape.x + inset('x')), shape.x + shape.width - inset('x')),
    y: Math.min(Math.max(point.y, shape.y + inset('y')), shape.y + shape.height - inset('y'))
  };
}

/**
 * @return {Point} the point, with the middle of the shape across the move if not inside it there
 */
function acrossInside(shape, point, across) {
  const size = across === 'x' ? 'width' : 'height';

  if (point[across] > shape[across] && point[across] < shape[across] + shape[size]) {
    return point;
  }

  return { ...point, [across]: getMid(shape)[across] };
}
