import inherits from 'inherits-browser';

import { assign } from 'min-dash';

import BaseModeling from 'diagram-js/lib/features/modeling/Modeling.js';

import { getRoot, isComment } from '../util/ModelUtil.js';

import ResizeShapeHandler from './cmd/ResizeShapeHandler.js';
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
  handlers['shape.resize'] = ResizeShapeHandler;

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
 * Rotate a shape by 90 degrees around its center, e.g. a fork / join bar
 * from horizontal to vertical.
 *
 * @param {Shape} shape
 */
UmlModeling.prototype.rotateShape = function(shape) {
  const center = {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2
  };

  this.resizeShape(shape, {
    x: Math.round(center.x - shape.height / 2),
    y: Math.round(center.y - shape.width / 2),
    width: shape.height,
    height: shape.width
  });
};

/**
 * Connect two elements. Connections are always drawn on the root, their
 * model element is placed by the diagram type. Without a type, the
 * diagram type's rules decide (see `connection.create`).
 *
 * Lines from or to notes show the comment of the note annotating the other end.
 */
UmlModeling.prototype.connect = function(source, target, attrs, hints) {
  const comment = isComment(source) ? source : isComment(target) ? target : null;

  if (comment) {
    attrs = { type: 'uml:Comment', businessObject: comment.businessObject };
  }

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
