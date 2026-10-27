import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { getPathMid } from '../../util/GeometryUtil.js';


/**
 * Moves connection labels along with their connection when it changes shape.
 */
export default function LabelBehavior(eventBus, modeling) {

  CommandInterceptor.call(this, eventBus);

  this.postExecuted([
    'connection.layout',
    'connection.updateWaypoints',
    'connection.reconnect'
  ], function(event) {
    const context = event.context;
    const connection = context.connection;
    const label = connection.labels[0];

    if (!label || !context.oldWaypoints || !label.parent) {
      return;
    }

    const oldMid = getPathMid(context.oldWaypoints);
    const newMid = getPathMid(connection.waypoints);

    const delta = {
      x: newMid.x - oldMid.x,
      y: newMid.y - oldMid.y
    };

    if (delta.x || delta.y) {
      modeling.moveShape(label, delta);
    }
  });
}

inherits(LabelBehavior, CommandInterceptor);

LabelBehavior.$inject = [
  'eventBus',
  'modeling'
];
