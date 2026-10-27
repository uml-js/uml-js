import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { isPortTyping } from '../../util/ElementUtil.js';


/**
 * Keeps the type of a port in sync with the line connecting it to a ball:
 * the port is typed by the interface (provides it) or, conjugated, requires it.
 *
 * The kind of a new port typing is given by the `conjugated` attribute of
 * the connection, see ComponentRules#canConnect.
 */
export default function PortTypingBehavior(eventBus) {

  CommandInterceptor.call(this, eventBus);

  function save(context, port) {
    context.oldPortTyping = {
      type: port.type,
      isConjugated: port.isConjugated
    };
  }

  function restore(context, port) {
    port.set('type', context.oldPortTyping.type);
    port.set('isConjugated', context.oldPortTyping.isConjugated);
  }

  this.executed('connection.create', function(event) {
    const { context } = event;
    const connection = context.connection;

    if (!isPortTyping(connection)) {
      return;
    }

    const port = connection.businessObject;

    save(context, port);

    port.set('type', connection.target.businessObject);
    port.set('isConjugated', connection.conjugated || undefined);
  });

  this.executed('connection.reconnect', function(event) {
    const { context } = event;
    const connection = context.connection;

    if (!isPortTyping(connection)) {
      return;
    }

    save(context, connection.businessObject);

    connection.businessObject.set('type', connection.target.businessObject);
  });

  this.executed('connection.delete', function(event) {
    const { context } = event;
    const connection = context.connection;

    if (!isPortTyping(connection)) {
      return;
    }

    const port = connection.businessObject;

    save(context, port);

    port.set('type', undefined);
    port.set('isConjugated', undefined);
  });

  this.reverted([
    'connection.create',
    'connection.reconnect',
    'connection.delete'
  ], function(event) {
    const { context } = event;

    if (isPortTyping(context.connection)) {
      restore(context, context.connection.businessObject);
    }
  });
}

inherits(PortTypingBehavior, CommandInterceptor);

PortTypingBehavior.$inject = [ 'eventBus' ];
