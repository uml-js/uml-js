import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { canReconnect } from '../../rules/ComponentRules.js';


/**
 * Replaces reconnected connections whose kind does not fit their new
 * ends, e.g. a usage moved from a component's border to one of its ports
 * becomes the port requiring the interface (and vice versa).
 */
export default function ReconnectBehavior(eventBus, modeling) {

  CommandInterceptor.call(this, eventBus);

  this.postExecuted('connection.reconnect', function(event) {
    const connection = event.context.connection;

    const attrs = canReconnect(connection, connection.source, connection.target);

    if (attrs && attrs.replace) {
      modeling.replaceConnection(connection, attrs);
    }
  });
}

inherits(ReconnectBehavior, CommandInterceptor);

ReconnectBehavior.$inject = [
  'eventBus',
  'modeling'
];
