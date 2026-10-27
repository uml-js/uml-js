import inherits from 'inherits-browser';

import UmlModeling from '../../core/modeling/UmlModeling.js';

import UpdateLabelHandler from './cmd/UpdateLabelHandler.js';
import UpdateInterfaceNotationHandler from './cmd/UpdateInterfaceNotationHandler.js';
import ReplaceConnectionHandler from './cmd/ReplaceConnectionHandler.js';


/**
 * Component diagram modeling: UML modeling plus name editing, switching
 * interfaces between rectangle and ball notation and changing connection types.
 */
export default function Modeling(eventBus, elementFactory, commandStack, rules) {
  UmlModeling.call(this, eventBus, elementFactory, commandStack);

  this._rules = rules;
}

inherits(Modeling, UmlModeling);

Modeling.$inject = [
  'eventBus',
  'elementFactory',
  'commandStack',
  'rules'
];

Modeling.prototype.getHandlers = function() {
  const handlers = UmlModeling.prototype.getHandlers.call(this);

  handlers['element.updateLabel'] = UpdateLabelHandler;
  handlers['interface.updateNotation'] = UpdateInterfaceNotationHandler;
  handlers['connection.replace'] = ReplaceConnectionHandler;

  return handlers;
};

/**
 * @param {Element} element
 * @param {string} newLabel the new name
 */
Modeling.prototype.updateLabel = function(element, newLabel) {
  this._commandStack.execute('element.updateLabel', {
    element,
    newLabel
  });
};

/**
 * Show an interface as ball (lollipop) or as rectangle.
 *
 * @param {Shape} element
 * @param {boolean} ball
 */
Modeling.prototype.updateInterfaceNotation = function(element, ball) {
  this._commandStack.execute('interface.updateNotation', {
    element,
    ball
  });
};

/**
 * Replace a connection with one of another type, e.g. a dependency with a usage.
 *
 * @param {Connection} connection
 * @param {string|Object} type the type, or the attributes of the new connection
 *
 * @return {Connection} the new connection
 */
Modeling.prototype.replaceConnection = function(connection, type) {
  const attrs = typeof type === 'string' ? { type } : { ...type };

  delete attrs.replace;

  const context = {
    connection,
    attrs
  };

  this._commandStack.execute('connection.replace', context);

  return context.newConnection;
};

/**
 * The connection type depends on what is connected, see ComponentRules#canConnect.
 */
Modeling.prototype.getConnectionAttrs = function(source, target) {
  const allowed = this._rules.allowed('connection.create', { source, target });

  return allowed && allowed.type ? { ...allowed } : {};
};
