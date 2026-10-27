import inherits from 'inherits-browser';

import UmlElementFactory from '../../core/modeling/UmlElementFactory.js';

import { is } from '../../core/util/ModelUtil.js';

import { getDefaultSize } from '../util/ElementUtil.js';


/**
 * Creates use case diagram elements.
 *
 * @example
 *
 * elementFactory.createShape({ type: 'uml:UseCase', name: 'Log in' });
 */
export default function ElementFactory(umlFactory) {
  UmlElementFactory.call(this, umlFactory);
}

inherits(ElementFactory, UmlElementFactory);

ElementFactory.$inject = [ 'umlFactory' ];

ElementFactory.prototype.getDefaultSize = function(bo) {
  return getDefaultSize(bo);
};

/**
 * The system boundary is drawn below actors and use cases.
 */
ElementFactory.prototype.getLevel = function(bo) {
  return is(bo, 'uml:Class') ? 0 : 1;
};
