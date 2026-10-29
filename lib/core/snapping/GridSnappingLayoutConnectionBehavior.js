import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { pointsAligned } from 'diagram-js/lib/util/Geometry.js';

const HIGH_PRIORITY = 3000;


/**
 * Snaps the middle segments of connections to the grid when they are created
 * or laid out, not when moved along with their source or target.
 *
 * Adapted from bpmn-js, GridSnappingLayoutConnectionBehavior (https://github.com/bpmn-io/bpmn-js).
 */
export default function GridSnappingLayoutConnectionBehavior(eventBus, gridSnapping, modeling) {
  CommandInterceptor.call(this, eventBus);

  this._gridSnapping = gridSnapping;

  const self = this;

  this.postExecuted([
    'connection.create',
    'connection.layout'
  ], HIGH_PRIORITY, function(event) {
    const context = event.context;
    const connection = context.connection;
    const hints = context.hints || {};
    const waypoints = connection.waypoints;

    if (hints.connectionStart || hints.connectionEnd) {
      return;
    }

    // middle segments, not the first and last
    if (waypoints.length <= 3) {
      return;
    }

    modeling.updateWaypoints(connection, self.snapMiddleSegments(waypoints));
  });
}

inherits(GridSnappingLayoutConnectionBehavior, CommandInterceptor);

GridSnappingLayoutConnectionBehavior.$inject = [
  'eventBus',
  'gridSnapping',
  'modeling'
];

GridSnappingLayoutConnectionBehavior.prototype.snapMiddleSegments = function(waypoints) {
  waypoints = waypoints.slice();

  for (let i = 1; i < waypoints.length - 2; i++) {
    const [ start, end ] = this.snapSegment(waypoints[i], waypoints[i + 1]);

    waypoints[i] = start;
    waypoints[i + 1] = end;
  }

  return waypoints;
};

GridSnappingLayoutConnectionBehavior.prototype.snapSegment = function(start, end) {
  const aligned = pointsAligned(start, end);

  const snapped = {};

  if (aligned === 'h') {
    snapped.y = this._gridSnapping.snapValue(start.y);
  }

  if (aligned === 'v') {
    snapped.x = this._gridSnapping.snapValue(start.x);
  }

  if (!('x' in snapped || 'y' in snapped)) {
    return [ start, end ];
  }

  return [ { ...start, ...snapped }, { ...end, ...snapped } ];
};
