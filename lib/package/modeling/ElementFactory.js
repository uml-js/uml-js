import inherits from 'inherits-browser';

import UmlElementFactory from '../../core/modeling/UmlElementFactory.js';


/**
 * Creates package diagram elements.
 *
 * @example
 *
 * elementFactory.createShape({ type: 'uml:Package', name: 'model' });
 */
export default function ElementFactory(umlFactory) {
  UmlElementFactory.call(this, umlFactory);
}

inherits(ElementFactory, UmlElementFactory);

ElementFactory.$inject = [ 'umlFactory' ];

/**
 * Package imports are public (import) or private (access).
 */
ElementFactory.prototype.getSemanticAttrs = function(attrs) {
  return {
    ...UmlElementFactory.prototype.getSemanticAttrs.call(this, attrs),
    ...(attrs.visibility ? { visibility: attrs.visibility } : {})
  };
};

ElementFactory.prototype.getDefaultSize = function() {
  return { width: 200, height: 140 };
};
