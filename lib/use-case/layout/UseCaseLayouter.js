import inherits from 'inherits-browser';

import BaseLayouter from 'diagram-js/lib/layout/BaseLayouter.js';

import { getMid } from 'diagram-js/lib/layout/LayoutUtil.js';


/**
 * Lays out relationships as straight lines, like associations in bpmn-js:
 * bendpoints are kept, the ends dock to source and target.
 *
 * Adapted from bpmn-js, BpmnLayouter (https://github.com/bpmn-io/bpmn-js).
 */
export default function UseCaseLayouter() {}

inherits(UseCaseLayouter, BaseLayouter);

UseCaseLayouter.prototype.layoutConnection = function(connection, hints = {}) {
  const source = hints.source || connection.source;
  const target = hints.target || connection.target;

  const waypoints = hints.waypoints || connection.waypoints;

  const start = hints.connectionStart || getConnectionDocking(waypoints && waypoints[0], source);
  const end = hints.connectionEnd || getConnectionDocking(waypoints && waypoints[waypoints.length - 1], target);

  return [ start, ...(waypoints ? waypoints.slice(1, -1) : []), end ];
};


// helpers //////////

/**
 * The original (uncropped) docking point of a waypoint, or the shape center.
 */
function getConnectionDocking(point, shape) {
  return point ? (point.original || point) : getMid(shape);
}
