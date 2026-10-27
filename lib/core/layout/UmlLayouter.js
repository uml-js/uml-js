import { assign } from 'min-dash';

import inherits from 'inherits-browser';

import BaseLayouter from 'diagram-js/lib/layout/BaseLayouter.js';

import {
  repairConnection,
  withoutRedundantPoints
} from 'diagram-js/lib/layout/ManhattanLayout.js';

import {
  getMid,
  getOrientation
} from 'diagram-js/lib/layout/LayoutUtil.js';

// like sequence flows in bpmn-js: h:h, except for
// (1) incoming/outgoing of gateway like elements -> v:h for outgoing, h:v for incoming
// (2) connections to / from containers -> straight if possible, keeping the docking
// (3) loops connect sides clockwise
const PREFERRED_LAYOUTS = {
  default: [ 'h:h' ],
  fromGateway: [ 'v:h' ],
  toGateway: [ 'h:v' ],
  container: [ 'straight', 'h:h' ],
  loop: {
    fromTop: [ 't:r' ],
    fromRight: [ 'r:b' ],
    fromLeft: [ 'l:t' ],
    fromBottom: [ 'b:l' ]
  }
};


/**
 * Lays out connections orthogonally, like sequence flows in bpmn-js.
 * Existing bendpoints are repaired rather than discarded, moved
 * connection ends keep their docking.
 *
 * Diagram types tell which elements behave like gateways or containers
 * (expanded sub-processes) by overriding `isGateway` and `isContainer`.
 *
 * Adapted from bpmn-js, BpmnLayouter (https://github.com/bpmn-io/bpmn-js).
 */
export default function UmlLayouter() {}

inherits(UmlLayouter, BaseLayouter);

UmlLayouter.prototype.layoutConnection = function(connection, hints = {}) {
  const source = hints.source || connection.source;
  const target = hints.target || connection.target;

  const waypoints = hints.waypoints || connection.waypoints;

  const start = hints.connectionStart || getConnectionDocking(waypoints && waypoints[0], source);
  const end = hints.connectionEnd || getConnectionDocking(waypoints && waypoints[waypoints.length - 1], target);

  const manhattanOptions = assign(this.getManhattanOptions(connection, source, target), hints);

  const updatedWaypoints = withoutRedundantPoints(
    repairConnection(source, target, start, end, waypoints, manhattanOptions)
  );

  return updatedWaypoints || [ start, end ];
};

/**
 * @param {Connection} connection
 * @param {Shape} source
 * @param {Shape} target
 *
 * @return {Object} options for ManhattanLayout#repairConnection
 */
UmlLayouter.prototype.getManhattanOptions = function(connection, source, target) {
  if (source === target) {
    return {
      preferredLayouts: getLoopPreferredLayout(source, connection)
    };
  }

  if (this.isContainer(source) || this.isContainer(target)) {
    return {
      preferredLayouts: PREFERRED_LAYOUTS.container,
      preserveDocking: this.isContainer(source) ? 'target' : 'source'
    };
  }

  if (this.isGateway(source)) {
    return {
      preferredLayouts: PREFERRED_LAYOUTS.fromGateway
    };
  }

  if (this.isGateway(target)) {
    return {
      preferredLayouts: PREFERRED_LAYOUTS.toGateway
    };
  }

  return {
    preferredLayouts: PREFERRED_LAYOUTS.default
  };
};

/**
 * @param {Shape} element
 *
 * @return {boolean} whether connections leave the element vertically and enter it horizontally
 */
UmlLayouter.prototype.isGateway = function(element) {
  return false;
};

/**
 * @param {Shape} element
 *
 * @return {boolean} whether the element contains other elements, like an expanded sub-process
 */
UmlLayouter.prototype.isContainer = function(element) {
  return false;
};


// helpers //////////

/**
 * The original (uncropped) docking point of a waypoint, or the shape center.
 */
function getConnectionDocking(point, shape) {
  return point ? (point.original || point) : getMid(shape);
}

function getLoopPreferredLayout(source, connection) {
  const waypoints = connection.waypoints;

  const orientation = waypoints && waypoints.length && getOrientation(waypoints[0], source);

  if (orientation === 'top') {
    return PREFERRED_LAYOUTS.loop.fromTop;
  } else if (orientation === 'right') {
    return PREFERRED_LAYOUTS.loop.fromRight;
  } else if (orientation === 'left') {
    return PREFERRED_LAYOUTS.loop.fromLeft;
  }

  return PREFERRED_LAYOUTS.loop.fromBottom;
}
