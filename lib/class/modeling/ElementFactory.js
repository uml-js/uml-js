import inherits from 'inherits-browser';

import UmlElementFactory from '../../core/modeling/UmlElementFactory.js';

import { DEFAULT_WIDTH } from '../util/ElementUtil.js';

import { getContentHeight } from '../util/CompartmentUtil.js';


/**
 * Creates class diagram elements.
 *
 * @example
 *
 * elementFactory.createShape({ type: 'uml:Class', name: 'Account' });
 */
export default function ElementFactory(umlFactory) {
  UmlElementFactory.call(this, umlFactory);
}

inherits(ElementFactory, UmlElementFactory);

ElementFactory.$inject = [ 'umlFactory' ];

ElementFactory.prototype.getDiShapeType = function() {
  return 'umldi:UMLClassifierShape';
};

ElementFactory.prototype.getDefaultSize = function(bo) {
  return {
    width: DEFAULT_WIDTH,
    height: getContentHeight(bo)
  };
};
