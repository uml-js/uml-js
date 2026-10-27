import { assign } from 'min-dash';

import inherits from 'inherits-browser';

import BaseLayouter from 'diagram-js/lib/layout/BaseLayouter.js';

import {
  repairConnection,
  withoutRedundantPoints
} from 'diagram-js/lib/layout/ManhattanLayout.js';

import { getMid } from 'diagram-js/lib/layout/LayoutUtil.js';


/**
 * Lays out connections orthogonally, like sequence flows in bpmn-js:
 * straight if source and target are aligned, otherwise with right angled
 * bends. Existing bendpoints are repaired rather than discarded.
 */
export default function UmlLayouter() {}

inherits(UmlLayouter, BaseLayouter);

UmlLayouter.prototype.layoutConnection = function(connection, hints = {}) {
  const source = hints.source || connection.source;
  const target = hints.target || connection.target;

  const waypoints = hints.waypoints || connection.waypoints;

  const start = hints.connectionStart || getConnectionDocking(waypoints && waypoints[0], source);
  const end = hints.connectionEnd || getConnectionDocking(waypoints && waypoints[waypoints.length - 1], target);

  const manhattanOptions = assign({
    preferredLayouts: [ 'straight', 'h:h' ]
  }, hints);

  const updatedWaypoints = withoutRedundantPoints(
    repairConnection(source, target, start, end, waypoints, manhattanOptions)
  );

  return updatedWaypoints || [ start, end ];
};


/**
 * The original (uncropped) docking point of a waypoint, or the shape center.
 */
function getConnectionDocking(point, shape) {
  return point ? (point.original || point) : getMid(shape);
}
