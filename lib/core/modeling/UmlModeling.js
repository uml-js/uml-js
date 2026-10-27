import inherits from 'inherits-browser';

import { assign } from 'min-dash';

import BaseModeling from 'diagram-js/lib/features/modeling/Modeling.js';

import { getRoot } from '../util/ModelUtil.js';

import UpdatePropertiesHandler from './cmd/UpdatePropertiesHandler.js';


/**
 * Modeling shared by all UML diagram types: diagram-js modeling plus
 * updating model properties. Diagram types extend it.
 *
 * @param {EventBus} eventBus
 * @param {ElementFactory} elementFactory
 * @param {CommandStack} commandStack
 */
export default function UmlModeling(eventBus, elementFactory, commandStack) {
  BaseModeling.call(this, eventBus, elementFactory, commandStack);
}

inherits(UmlModeling, BaseModeling);

UmlModeling.$inject = [
  'eventBus',
  'elementFactory',
  'commandStack'
];

UmlModeling.prototype.getHandlers = function() {
  const handlers = BaseModeling.prototype.getHandlers.call(this);

  handlers['element.updateProperties'] = UpdatePropertiesHandler;

  return handlers;
};

/**
 * Set properties of the model element of a diagram element.
 *
 * @param {Element} element
 * @param {Object} properties
 */
UmlModeling.prototype.updateProperties = function(element, properties) {
  this._commandStack.execute('element.updateProperties', {
    element,
    properties
  });
};

/**
 * Connect two elements. Connections are always drawn on the root, their
 * model element is placed by the diagram type. Without a type, the
 * diagram type's rules decide (see `connection.create`).
 */
UmlModeling.prototype.connect = function(source, target, attrs, hints) {
  return this.createConnection(source, target, assign({}, this.getConnectionAttrs(source, target), attrs), getRoot(source), hints);
};

/**
 * @param {Element} source
 * @param {Element} target
 *
 * @return {Object} default attributes of a connection between source and target
 */
UmlModeling.prototype.getConnectionAttrs = function(source, target) {
  return {};
};
