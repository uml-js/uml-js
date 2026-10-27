import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { getPathMid } from '../../util/GeometryUtil.js';


/**
 * Moves connection labels along with their connection when it changes shape,
 * each relative to its anchor, by default the middle of the connection.
 */
export default function LabelBehavior(eventBus, modeling) {

  CommandInterceptor.call(this, eventBus);

  const self = this;

  this.postExecuted([
    'connection.layout',
    'connection.updateWaypoints',
    'connection.reconnect'
  ], function(event) {
    const context = event.context;
    const connection = context.connection;

    if (!context.oldWaypoints) {
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
