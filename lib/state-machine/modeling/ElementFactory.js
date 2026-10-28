import inherits from 'inherits-browser';

import UmlElementFactory from '../../core/modeling/UmlElementFactory.js';

import { is } from '../../core/util/ModelUtil.js';

import { getDefaultSize } from '../util/ElementUtil.js';


/**
 * Creates state machine diagram elements.
 *
 * @example
 *
 * elementFactory.createShape({ type: 'uml:State' });
 * elementFactory.createShape({ type: 'uml:Pseudostate', kind: 'choice' });
 * elementFactory.createShape({ type: 'uml:ConnectionPointReference', exit: [ exitPoint ] });
 */
export default function ElementFactory(umlFactory) {
  UmlElementFactory.call(this, umlFactory);
}

inherits(ElementFactory, UmlElementFactory);

ElementFactory.$inject = [ 'umlFactory' ];

ElementFactory.prototype.getSemanticAttrs = function(attrs) {
  const semanticAttrs = UmlElementFactory.prototype.getSemanticAttrs.call(this, attrs);

  if (attrs.type === 'uml:Pseudostate') {
    semanticAttrs.kind = attrs.kind || 'initial';
  }

  // the entry or exit point referred to
  if (attrs.type === 'uml:ConnectionPointReference') {
    semanticAttrs.entry = attrs.entry || [];
    semanticAttrs.exit = attrs.exit || [];
  }

  return semanticAttrs;
};

ElementFactory.prototype.getDiShapeType = function(bo) {
  return is(bo, 'uml:State') && !is(bo, 'uml:FinalState') ? 'umldi:UMLStateShape' : 'umldi:UMLShape';
};

ElementFactory.prototype.getDefaultSize = function(bo) {
  return getDefaultSize(bo);
};
