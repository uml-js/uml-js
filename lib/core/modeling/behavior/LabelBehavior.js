import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { getWaypointsUpdatingConnections } from 'diagram-js/lib/features/space-tool/SpaceUtil.js';

import { getLabelAdjustment } from './LabelLayoutUtil.js';


/**
 * Moves connection labels along with their connection when it changes shape, like
 * bpmn-js: each with the point of the connection it is attached to, on the segment
 * or bendpoint nearest to it (see LabelLayoutUtil). Diagram types may anchor labels
 * elsewhere, e.g. at an end of the connection.
 *
 * Moving elements, a label whose connection moves only in part, one end being
 * moved and the other not, moves with its connection rather than with them.
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

  this.preExecute('elements.move', function(event) {
    const context = event.context;
    const shapes = new Set(context.shapes);

    const isMoved = element => !!element && (shapes.has(element) || isMoved(element.parent));

    context.shapes = context.shapes.filter(shape => {
      if (!isConnectionLabel(shape)) {
        return true;
      }

      const { source, target } = shape.labelTarget;

      return isMoved(source) === isMoved(target);
    });
  });

  this.postExecuted([
    'connection.layout',
    'connection.updateWaypoints',
    'connection.reconnect'
  ], function(event) {
    const context = event.context;
    const connection = context.connection;
    const hints = context.hints || {};

    if (!context.oldWaypoints || makingSpace || hints.labelBehavior === false) {
      return;
    }

    for (const label of connection.labels) {
      if (!label.parent) {
        continue;
      }

      const delta = self.getLabelDelta(label, context.oldWaypoints, connection.waypoints, hints);

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
 * @param {Point[]} oldWaypoints of the labeled connection
 * @param {Point[]} newWaypoints
 * @param {Object} hints of the change, e.g. which bendpoint or segment moved
 *
 * @return {Point} how far the label moves with its connection
 */
LabelBehavior.prototype.getLabelDelta = function(label, oldWaypoints, newWaypoints, hints) {
  const anchor = this.getLabelAnchor(label, oldWaypoints);

  if (!anchor) {
    return getLabelAdjustment(label, newWaypoints, oldWaypoints, hints);
  }

  const newAnchor = this.getLabelAnchor(label, newWaypoints);

  return {
    x: Math.round(newAnchor.x - anchor.x),
    y: Math.round(newAnchor.y - anchor.y)
  };
};

/**
 * @param {Label} label
 * @param {Point[]} waypoints of the labeled connection
 *
 * @return {Point|undefined} the point the label moves with, if not the point of
 * the connection it is attached to
 */
LabelBehavior.prototype.getLabelAnchor = function(label, waypoints) {
  return undefined;
};
