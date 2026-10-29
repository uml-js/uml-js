import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { getWaypointsUpdatingConnections } from 'diagram-js/lib/features/space-tool/SpaceUtil.js';

import { getPathMid } from '../../util/GeometryUtil.js';


/**
 * Moves connection labels along with their connection when it changes shape,
 * each relative to its anchor, by default the middle of the connection.
 *
 * Making space, labels move like the shapes and bendpoints beyond the line
 * space is made at, by the full distance, and stay where they are before it,
 * as the anchor of a connection whose bendpoints move only in part would move
 * them only in part.
 */
export default function LabelBehavior(eventBus, modeling) {

  CommandInterceptor.call(this, eventBus);

  const self = this;

  let makingSpace = false;

  this.preExecute('spaceTool', function(event) {
    const context = event.context;

    context.movingShapes = context.movingShapes.filter(shape => !isConnectionLabel(shape));

    makingSpace = true;
  });

  this.postExecuted('spaceTool', function(event) {
    const { movingShapes, resizingShapes, delta, direction, start } = event.context;

    makingSpace = false;

    const axis = /e|w/.test(direction) ? 'x' : 'y';
    const size = axis === 'x' ? 'width' : 'height';

    for (const connection of getWaypointsUpdatingConnections(movingShapes, resizingShapes)) {
      for (const label of connection.labels) {
        const mid = label[axis] + label[size] / 2;
        const beyond = /e|s/.test(direction) ? mid > start : mid < start;

        if (beyond && label.parent) {
          modeling.moveShape(label, { x: 0, y: 0, [axis]: delta[axis] });
        }
      }
    }
  });

  this.postExecuted([
    'connection.layout',
    'connection.updateWaypoints',
    'connection.reconnect'
  ], function(event) {
    const context = event.context;
    const connection = context.connection;

    if (!context.oldWaypoints || makingSpace) {
      return;
    }

    for (const label of connection.labels) {
      if (!label.parent) {
        continue;
      }

      const oldAnchor = self.getLabelAnchor(label, context.oldWaypoints);
      const newAnchor = self.getLabelAnchor(label, connection.waypoints);

      const delta = {
        x: newAnchor.x - oldAnchor.x,
        y: newAnchor.y - oldAnchor.y
      };

      if (delta.x || delta.y) {
        modeling.moveShape(label, delta);
      }
    }
  });
}

inherits(LabelBehavior, CommandInterceptor);

function isConnectionLabel(shape) {
  return !!shape.labelTarget && !!shape.labelTarget.waypoints;
}

LabelBehavior.$inject = [
  'eventBus',
  'modeling'
];

/**
 * @param {Label} label
 * @param {Point[]} waypoints of the labeled connection
 *
 * @return {Point} the point the label moves with
 */
LabelBehavior.prototype.getLabelAnchor = function(label, waypoints) {
  return getPathMid(waypoints);
};
