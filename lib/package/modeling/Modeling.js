import inherits from 'inherits-browser';

import UmlModeling from '../../core/modeling/UmlModeling.js';

import UpdateLabelHandler from './cmd/UpdateLabelHandler.js';
import ReplaceConnectionHandler from '../../core/modeling/cmd/ReplaceConnectionHandler.js';


/**
 * Package diagram modeling: UML modeling plus name editing and
 * changing the kind of relationships.
 */
export default function Modeling(eventBus, elementFactory, commandStack) {
  UmlModeling.call(this, eventBus, elementFactory, commandStack);
}

inherits(Modeling, UmlModeling);

Modeling.$inject = [
  'eventBus',
  'elementFactory',
  'commandStack'
];

Modeling.prototype.getHandlers = function() {
  const handlers = UmlModeling.prototype.getHandlers.call(this);

  handlers['element.updateLabel'] = UpdateLabelHandler;
  handlers['connection.replace'] = ReplaceConnectionHandler;

  return handlers;
};

/**
 * @param {Element} element a package
 * @param {string} newLabel the new name
 */
Modeling.prototype.updateLabel = function(element, newLabel) {
  this._commandStack.execute('element.updateLabel', {
    element,
    newLabel
  });
};

/**
 * Replace a relationship with one of another kind.
 *
 * @param {Connection} connection
 * @param {{ type: string, visibility?: string }} attrs
 *
 * @return {Connection} the new connection
 */
Modeling.prototype.replaceConnection = function(connection, attrs) {
  const context = {
    connection,
    attrs
  };

  this._commandStack.execute('connection.replace', context);

  return context.newConnection;
};

/**
 * Packages depend on each other by default.
 */
Modeling.prototype.getConnectionAttrs = function() {
  return { type: 'uml:Dependency' };
};
