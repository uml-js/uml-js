import inherits from 'inherits-browser';

import UmlElementFactory from '../../core/modeling/UmlElementFactory.js';

import { is } from '../../core/util/ModelUtil.js';

import { COMBINED_FRAGMENT_SIZE, EXECUTION_SIZE, LIFELINE_SIZE } from '../util/ElementUtil.js';


/**
 * Creates sequence diagram elements.
 *
 * @example
 *
 * elementFactory.createShape({ type: 'uml:Lifeline', name: 'Client' });
 */
export default function ElementFactory(umlFactory) {
  UmlElementFactory.call(this, umlFactory);
}

inherits(ElementFactory, UmlElementFactory);

ElementFactory.$inject = [ 'umlFactory' ];

ElementFactory.prototype.getSemanticAttrs = function(attrs) {
  const semanticAttrs = UmlElementFactory.prototype.getSemanticAttrs.call(this, attrs);

  if (attrs.messageSort) {
    semanticAttrs.messageSort = attrs.messageSort;
  }

  if (attrs.interactionOperator) {
    semanticAttrs.interactionOperator = attrs.interactionOperator;
  }

  return semanticAttrs;
};

ElementFactory.prototype.getDefaultSize = function(bo) {
  if (is(bo, 'uml:ExecutionSpecification')) {
    return EXECUTION_SIZE;
  }

  if (is(bo, 'uml:CombinedFragment') || is(bo, 'uml:InteractionOperand')) {
    return COMBINED_FRAGMENT_SIZE;
  }

  return LIFELINE_SIZE;
};
