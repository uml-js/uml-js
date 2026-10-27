import inherits from 'inherits-browser';

import { assign } from 'min-dash';

import BaseElementFactory from 'diagram-js/lib/core/ElementFactory.js';

import { is } from '../util/ModelUtil.js';

const COMMENT_SIZE = { width: 140, height: 60 };


/**
 * Creates diagram elements along with their UML model element and UML DI.
 * Diagram types override the `get*` hooks.
 *
 * @example
 *
 * elementFactory.createShape({ type: 'uml:State' });
 */
export default function UmlElementFactory(umlFactory) {
  BaseElementFactory.call(this);

  this._umlFactory = umlFactory;
}

inherits(UmlElementFactory, BaseElementFactory);

UmlElementFactory.$inject = [ 'umlFactory' ];

UmlElementFactory.prototype._baseCreate = BaseElementFactory.prototype.create;

UmlElementFactory.prototype.create = function(elementType, attrs) {
  attrs = assign({}, attrs || {});

  if (elementType === 'root' || elementType === 'label') {
    return this._baseCreate(elementType, assign({ width: 90, height: 20 }, attrs));
  }

  let bo = attrs.businessObject;

  if (!bo) {
    if (!attrs.type) {
      throw new Error('no type specified');
    }

    bo = this._umlFactory.create(attrs.type, attrs.type === 'uml:Comment' ? { body: attrs.body } : this.getSemanticAttrs(attrs));
  }

  // notes, the same in all diagram types
  const comment = is(bo, 'uml:Comment');

  let di = attrs.di;

  if (!di) {
    di = elementType === 'connection'
      ? this._umlFactory.createDiEdge(bo)
      : this._umlFactory.createDiShape(bo, comment ? {} : this.getDiAttrs(bo, attrs), comment ? 'umldi:UMLShape' : this.getDiShapeType(bo));
  }

  const size = elementType === 'shape' ? (comment ? COMMENT_SIZE : this.getDefaultSize(bo, di)) : {};

  // lines from notes share the model element of the note
  const id = comment && elementType === 'connection' ? di.id : this.getElementId(elementType, bo, di);

  return this._baseCreate(elementType, assign({
    id,
    type: bo.$type,
    businessObject: bo,
    di
  }, size, attrs, {
    type: bo.$type
  }));
};

/**
 * @return {string} the ID of a new diagram element, by default its model element's ID
 */
UmlElementFactory.prototype.getElementId = function(elementType, bo, di) {
  return bo.id;
};

/**
 * @param {Object} attrs as passed to `create`
 *
 * @return {Object} properties of a new model element
 */
UmlElementFactory.prototype.getSemanticAttrs = function(attrs) {
  return attrs.name ? { name: attrs.name } : {};
};

/**
 * @return {Object} properties of a new DI shape
 */
UmlElementFactory.prototype.getDiAttrs = function(bo, attrs) {
  return {};
};

/**
 * @return {string} the type of a new DI shape
 */
UmlElementFactory.prototype.getDiShapeType = function(bo) {
  return 'umldi:UMLShape';
};

/**
 * Shapes of a lower level are drawn below shapes of a higher level
 * with the same parent, e.g. the system boundary below actors.
 *
 * @param {ModdleElement} bo
 *
 * @return {number}
 */
UmlElementFactory.prototype.getLevel = function(bo) {
  return 1;
};

/**
 * @return {Dimensions}
 */
UmlElementFactory.prototype.getDefaultSize = function(bo, di) {
  return { width: 100, height: 80 };
};
