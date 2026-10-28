import { remove as collectionRemove } from 'diagram-js/lib/util/Collections.js';

import { isLabel } from '../../../core/util/ModelUtil.js';

import { getDecompositionView, getDefaultSize, isCollapsed, isComposite } from '../../util/ElementUtil.js';

import { getBounds, makeSpace } from '../../../core/util/ContentMoveUtil.js';

const COMPOSITE_MIN_SIZE = { width: 300, height: 200 };


/**
 * Turns a simple state into a composite state by adding a region, or a
 * composite state into a simple state by removing its regions, including
 * sub-states and transitions.
 *
 * The state is resized to fit its new notation.
 */
export default function UpdateCompositeHandler(modeling, umlFactory, commandStack, injector) {
  this._modeling = modeling;
  this._umlFactory = umlFactory;
  this._commandStack = commandStack;

  // the manager of all diagrams (see lib/uml.js), missing in a viewer of a single diagram
  this._umlManager = injector.get('umlManager', false);

  this._injector = injector;
}

UpdateCompositeHandler.$inject = [
  'modeling',
  'umlFactory',
  'commandStack',
  'injector'
];

UpdateCompositeHandler.prototype.preExecute = function(context) {
  const { element, composite } = context;

  if (composite && isComposite(element)) {
    throw new Error(`<${ element.id }> is composite already`);
  }

  if (!composite && !isComposite(element)) {
    throw new Error(`<${ element.id }> is simple already`);
  }

  // delete the diagram of sub-states not shown in the state
  const view = !composite && isCollapsed(element) && this._umlManager && getDecompositionView(this._umlManager, element.businessObject);

  if (view) {
    this._commandStack.execute('view.delete', { manager: this._umlManager, view });
  }

  // delete sub-states shown in the diagram, along with their transitions
  if (!composite) {
    const children = element.children.filter(child => !isLabel(child));

    if (children.length) {
      this._modeling.removeElements(children);
    }
  }
};

UpdateCompositeHandler.prototype.execute = function(context) {
  const { element, composite } = context;
  const bo = element.businessObject;

  if (composite) {
    const region = context.region = context.region || this._umlFactory.create('uml:Region');

    region.$parent = bo;
    bo.get('region').push(region);
  } else {
    context.oldRegions = [ ...bo.get('region') ];

    bo.set('region', []);
    context.oldRegions.forEach(region => region.$parent = null);
  }

  return [ element ];
};

UpdateCompositeHandler.prototype.revert = function(context) {
  const { element, composite } = context;
  const bo = element.businessObject;

  if (composite) {
    collectionRemove(bo.get('region'), context.region);

    context.region.$parent = null;
  } else {
    bo.set('region', [ ...context.oldRegions ]);
    context.oldRegions.forEach(region => region.$parent = bo);
  }

  return [ element ];
};

UpdateCompositeHandler.prototype.postExecute = function(context) {
  const { element, composite } = context;

  const size = composite ? {
    width: Math.max(element.width, COMPOSITE_MIN_SIZE.width),
    height: Math.max(element.height, COMPOSITE_MIN_SIZE.height)
  } : getDefaultSize(element.businessObject);

  if (size.width === element.width && size.height === element.height) {
    return;
  }

  // grow to the bottom right, making space, shrink towards the top left, leaving
  // the space for growing again
  const oldBounds = getBounds(element);

  this._modeling.resizeShape(element, { x: element.x, y: element.y, ...size });

  makeSpace(element, oldBounds, this._injector);
};
