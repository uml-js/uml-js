import inherits from 'inherits-browser';

import UmlElementFactory from '../../core/modeling/UmlElementFactory.js';

import { is } from '../../core/util/ModelUtil.js';

import { getDefaultSize } from '../util/ElementUtil.js';


/**
 * Creates component diagram elements.
 *
 * @example
 *
 * elementFactory.createShape({ type: 'uml:Component', name: 'Shop' });
 * elementFactory.createShape({ type: 'uml:Interface', isIcon: true }); // ball notation
 */
export default function ElementFactory(umlFactory) {
  UmlElementFactory.call(this, umlFactory);
}

inherits(ElementFactory, UmlElementFactory);

ElementFactory.$inject = [ 'umlFactory' ];

/**
 * Port typings show a port as a line, use the DI's ID to not clash with the port's shape.
 */
ElementFactory.prototype.getElementId = function(elementType, bo, di) {
  return elementType === 'connection' && is(bo, 'uml:Port') ? di.id : bo.id;
};

ElementFactory.prototype.getDiShapeType = function(bo) {
  return is(bo, 'uml:Component') || is(bo, 'uml:Interface') ? 'umldi:UMLClassifierShape' : 'umldi:UMLShape';
};

ElementFactory.prototype.getDiAttrs = function(bo, attrs) {
  return attrs.isIcon ? { isIcon: true } : {};
};

ElementFactory.prototype.getDefaultSize = function(bo, di) {
  return getDefaultSize(bo, di);
};
