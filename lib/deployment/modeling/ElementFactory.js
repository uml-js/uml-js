import inherits from 'inherits-browser';

import UmlElementFactory from '../../core/modeling/UmlElementFactory.js';

import { getDefaultSize } from '../util/ElementUtil.js';


/**
 * Creates deployment diagram elements.
 *
 * @example
 *
 * elementFactory.createShape({ type: 'uml:Device', name: 'Server' });
 */
export default function ElementFactory(umlFactory) {
  UmlElementFactory.call(this, umlFactory);
}

inherits(ElementFactory, UmlElementFactory);

ElementFactory.$inject = [ 'umlFactory' ];

ElementFactory.prototype.getDefaultSize = function(bo) {
  return getDefaultSize(bo);
};
