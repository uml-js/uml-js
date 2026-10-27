import { isBall, isComponent, isPort, isProvided, isTypedPort } from '../util/ElementUtil.js';

import { getPortTypingAttrs } from '../rules/ComponentRules.js';

const LOW_PRIORITY = 500;


/**
 * Connects a component or a port to a provided interface (ball) as
 * required interface, drawn as socket (-C). Only balls that are provided
 * by another component or port can be connected.
 */
export default function RequiredInterfaceConnect(eventBus, connect) {
  this._connect = connect;

  const self = this;

  // mark the connect operation started via #start
  eventBus.on('connect.init', function(event) {
    if (self._starting) {
      event.context.requiredInterface = true;
    }
  });

  // override the connection rules while hovering
  eventBus.on('connect.hover', LOW_PRIORITY, function(event) {
    const context = event.context;

    if (!context.requiredInterface) {
      return;
    }

    const allowed = canRequire(context.start, event.hover);

    context.canExecute = allowed && (isPort(context.start) ? getPortTypingAttrs(context.start, true) : { type: 'uml:Usage' });
    context.source = allowed ? context.start : null;
    context.target = allowed ? event.hover : null;
  });
}

RequiredInterfaceConnect.$inject = [
  'eventBus',
  'connect'
];

/**
 * @param {Event} event
 * @param {Shape} source component or port
 */
RequiredInterfaceConnect.prototype.start = function(event, source) {
  this._starting = true;

  try {
    this._connect.start(event, source);
  } finally {
    this._starting = false;
  }
};


/**
 * A component, or a port without interface, can require a ball provided by another element.
 *
 * @param {Shape} source
 * @param {Shape} ball
 *
 * @return {boolean}
 */
export function canRequire(source, ball) {
  if (!ball || !isBall(ball)) {
    return false;
  }

  if (!isComponent(source) && !(isPort(source) && !isTypedPort(source))) {
    return false;
  }

  const connected = ball.incoming.some(connection => connection.source === source);

  return isProvided(ball) && !connected;
}
