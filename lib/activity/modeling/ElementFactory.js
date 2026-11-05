import inherits from 'inherits-browser';

import UmlElementFactory from '../../core/modeling/UmlElementFactory.js';

import { is } from '../../core/util/ModelUtil.js';

import { getDefaultSize } from '../util/ElementUtil.js';


/**
 * Creates activity diagram elements.
 *
 * @example
 *
 * elementFactory.createShape({ type: 'uml:OpaqueAction', name: 'Pay' });
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
 * Partitions and interruptible regions are drawn below the nodes they group.
 */
ElementFactory.prototype.getLevel = function(bo) {
  return is(bo, 'uml:ActivityGroup') ? 0 : 1;
};
