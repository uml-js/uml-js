import inherits from 'inherits-browser';

import OrderingProvider from 'diagram-js/lib/features/ordering/OrderingProvider.js';

import { getRoot, isConnection, isLabel } from '../../core/util/ModelUtil.js';


/**
 * Connections and labels are drawn on the root, above all shapes. Shapes
 * attached to other shapes (e.g. ports) are drawn above unattached shapes,
 * shapes of a lower level (see UmlElementFactory#getLevel) below those of
 * a higher level.
 */
export default function UmlOrderingProvider(eventBus, elementFactory) {
  OrderingProvider.call(this, eventBus);

  this._elementFactory = elementFactory;

  const self = this;

  // shapes created attached to a host (e.g. ports) get their host after creation
  this.preExecute('shape.create', LOW_PRIORITY, function(event) {
    const context = event.context;

    if (context.host && context.parent) {
      context.parentIndex = self.getOrdering(context.shape, context.parent, true).index;
    }
  });
}

inherits(UmlOrderingProvider, OrderingProvider);

const LOW_PRIORITY = 500;

UmlOrderingProvider.$inject = [ 'eventBus', 'elementFactory' ];

/**
 * @param {Element} element
 * @param {Element} newParent
 * @param {boolean} [attached] whether the element is (to be) attached to a host
 */
UmlOrderingProvider.prototype.getOrdering = function(element, newParent, attached = !!element.host) {

  if (!newParent) {
    return null;
  }

  if (isConnection(element) || isLabel(element)) {
    return {
      parent: getRoot(newParent),
      index: -1
    };
  }

  const level = this._elementFactory.getLevel(element.businessObject);

  const children = newParent.children.filter(child => child !== element);
  const index = children.findIndex(child => {
    return isConnection(child) || isLabel(child) || (!attached && child.host) ||
      (!attached && !child.host && this._elementFactory.getLevel(child.businessObject) > level);
  });

  return {
    parent: newParent,
    index: index === -1 ? -1 : index
  };
};
