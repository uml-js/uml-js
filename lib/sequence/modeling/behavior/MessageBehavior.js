import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { MESSAGE_MARGIN, getLifeline, isMessage, isMessageEnd } from '../../util/ElementUtil.js';


/**
 * Keeps messages horizontal when they are dragged: after moving a message
 * (segment) or one of its points, it is laid out again at its new height.
 * Self messages keep the heights of both their ends and their width.
 *
 * Lifelines grow to hold their messages, also when an end is dragged
 * beyond the end of its lifeline.
 */
export default function MessageBehavior(eventBus, modeling) {

  CommandInterceptor.call(this, eventBus);

  // resizing lifelines and activation bars keeps the heights of their messages,
  // rather than scaling them (diagram-js ResizeShapeHandler)
  this.preExecute('shape.resize', function(event) {
    const context = event.context;

    if (isMessageEnd(context.shape)) {
      context.hints = { ...context.hints, layout: false };
    }
  });

  this.postExecute('shape.resize', function(event) {
    const shape = event.context.shape;

    if (isMessageEnd(shape)) {
      [ ...shape.incoming, ...shape.outgoing ].forEach(connection => modeling.layoutConnection(connection));
    }
  });

  // an end dragged off its lifeline (e.g. below its end) stays at the lifeline,
  // at the new height, see diagram-js BendpointMove
  eventBus.on('bendpoint.move.hover', LOW_PRIORITY, function(event) {
    const { context, hover } = event;
    const connection = context.connection;

    if (!isMessage(connection) || context.type === 'updateWaypoints' || context.allowed) {
      return;
    }

    if (hover && !hover.parent) {
      context.allowed = { type: connection.type };
      context.source = connection.source;
      context.target = connection.target;
    }
  });

  this.postExecuted('connection.updateWaypoints', function(event) {
    const { connection } = event.context;

    if (!isMessage(connection)) {
      return;
    }

    const waypoints = connection.waypoints;

    if (getLifeline(connection.source) === getLifeline(connection.target)) {
      const first = waypoints[0], last = waypoints[waypoints.length - 1];

      modeling.layoutConnection(connection, {
        connectionStart: { x: first.x, y: first.y },
        connectionEnd: { x: last.x, y: last.y }
      });

      return;
    }

    // the height the user dragged the message to: its middle segment
    const middle = waypoints[Math.floor((waypoints.length - 1) / 2)];

    modeling.layoutConnection(connection, {
      connectionStart: { x: middle.x, y: middle.y }
    });
  });

  this.postExecuted([
    'connection.create',
    'connection.layout',
    'connection.updateWaypoints',
    'connection.reconnect'
  ], function(event) {
    const { connection } = event.context;

    if (!isMessage(connection) || !connection.parent) {
      return;
    }

    const waypoints = connection.waypoints;

    fit(getLifeline(connection.source), waypoints[0].y);
    fit(getLifeline(connection.target), waypoints[waypoints.length - 1].y);
  });

  function fit(lifeline, y) {
    const bottom = y + 2 * MESSAGE_MARGIN;

    if (lifeline && lifeline.y + lifeline.height < bottom) {
      modeling.resizeShape(lifeline, {
        x: lifeline.x,
        y: lifeline.y,
        width: lifeline.width,
        height: bottom - lifeline.y
      });
    }
  }
}

inherits(MessageBehavior, CommandInterceptor);

const LOW_PRIORITY = 500;

MessageBehavior.$inject = [
  'eventBus',
  'modeling'
];
