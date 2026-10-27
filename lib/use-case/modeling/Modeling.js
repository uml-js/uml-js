import inherits from 'inherits-browser';

import UmlModeling from '../../core/modeling/UmlModeling.js';

import UpdateLabelHandler from './cmd/UpdateLabelHandler.js';
import ReplaceConnectionHandler from '../../core/modeling/cmd/ReplaceConnectionHandler.js';


/**
 * Use case diagram modeling: UML modeling plus name editing and
 * changing the type of relationships.
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
 * Replace a relationship with one of another type, e.g. an include with an extend.
 *
 * @param {Connection} connection
 * @param {string} type
 *
 * @return {Connection} the new connection
 */
Modeling.prototype.replaceConnection = function(connection, type) {
  const context = {
    connection,
    attrs: { type }
  };

  this._commandStack.execute('connection.replace', context);

  return context.newConnection;
};

/**
 * The relationship type depends on what is connected, see UseCaseRules#canConnect.
 */
Modeling.prototype.getConnectionAttrs = function(source, target) {
  const allowed = this._rules.allowed('connection.create', { source, target });

  return allowed && allowed.type ? { ...allowed } : {};
};
