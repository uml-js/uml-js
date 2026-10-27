import { remove as collectionRemove } from 'diagram-js/lib/util/Collections.js';

import { isLabel } from '../../../core/util/ModelUtil.js';

import { getDefaultSize, isComposite } from '../../util/ElementUtil.js';

const COMPOSITE_MIN_SIZE = { width: 300, height: 200 };


/**
 * Turns a simple state into a composite state by adding a region, or a
 * composite state into a simple state by removing its regions, including
 * sub-states and transitions.
 *
 * The state is resized to fit its new notation.
 */
export default function UpdateCompositeHandler(modeling, umlFactory) {
  this._modeling = modeling;
  this._umlFactory = umlFactory;
}

UpdateCompositeHandler.$inject = [
  'modeling',
  'umlFactory'
];

UpdateCompositeHandler.prototype.preExecute = function(context) {
  const { element, composite } = context;

  if (composite && isComposite(element)) {
    throw new Error(`<${ element.id }> is composite already`);
  }

  if (!composite && !isComposite(element)) {
    throw new Error(`<${ element.id }> is simple already`);
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

  // grow to the bottom right, shrink towards the center
  const bounds = composite ? {
    x: element.x,
    y: element.y,
    ...size
  } : {
    x: Math.round(element.x + (element.width - size.width) / 2),
    y: Math.round(element.y + (element.height - size.height) / 2),
    ...size
  };

  this._modeling.resizeShape(element, bounds);
};
