import { is } from '../../../core/util/ModelUtil.js';

import { getDecompositionShape, getDecompositionView, isShapeDi } from '../../util/ElementUtil.js';

import {
  addToCanvas,
  getBounds,
  layoutConnections,
  makeSpace,
  moveDis,
  removeFromCanvas,
  restoreDis,
  setBounds,
  translateDis
} from '../../../core/util/ContentMoveUtil.js';


/**
 * Expands a collapsed state, showing its decomposition: moves its sub-states from
 * the diagram showing them (see ElementUtil#getDecompositionView) into the state,
 * which takes the size it has there, and removes that diagram, as bpmn-js does
 * when expanding a collapsed subprocess. The model is not changed.
 */
export default function ExpandStateHandler(canvas, umlFactory, umlImporter, injector) {
  this._canvas = canvas;
  this._umlFactory = umlFactory;
  this._umlImporter = umlImporter;

  // the manager of all diagrams (see lib/uml.js), missing in a viewer of a single diagram
  this._umlManager = injector.get('umlManager', false);

  this._injector = injector;
}

ExpandStateHandler.$inject = [ 'canvas', 'umlFactory', 'umlImporter', 'injector' ];

ExpandStateHandler.prototype.execute = function(context) {
  const { element } = context;
  const bo = element.businessObject;

  const manager = this._umlManager;

  if (!manager) {
    throw new Error('expanding states requires the manager of all diagrams');
  }

  // computed once, so re-doing moves the same elements
  if (!context.view) {
    const view = context.view = getDecompositionView(manager, bo);
    const diagram = view.element;

    const stateShape = getDecompositionShape(diagram, bo);

    const shapes = stateShape.get('ownedElement').filter(isShapeDi);
    const contained = new Set(getNestedDis(shapes));

    // the transitions between the sub-states
    const edges = diagram.get('ownedElement').filter(di => is(di, 'umldi:UMLEdge') && contained.has(di.source) && contained.has(di.target));

    context.dis = [ ...shapes, ...edges ];

    // sub-states keep their place in the state, which keeps its size
    context.delta = {
      x: element.x - stateShape.bounds.x,
      y: element.y - stateShape.bounds.y
    };

    context.oldBounds = getBounds(element);
    context.newBounds = {
      x: element.x,
      y: element.y,
      width: stateShape.bounds.width,
      height: stateShape.bounds.height
    };
  }

  const { dis, delta } = context;

  translateDis(dis, delta);

  // shapes are owned by the state, edges by the diagram shown
  const rootDi = this._canvas.getRootElement().di;

  context.moves = moveDis(dis, di => is(di, 'umldi:UMLEdge') ? rootDi : element.di);

  context.removedView = manager._removeView(context.view);
  manager._emitViewsChanged();

  setBounds(element, context.newBounds, this._umlFactory);

  if (context.elements) {
    addToCanvas(this._canvas, context.elements, context.parents);
  } else {
    context.elements = this._umlImporter.importElements(dis, element);
  }

  return [ element ];
};

// space for the state, whose transitions end at its new border
ExpandStateHandler.prototype.postExecute = function(context) {
  makeSpace(context.element, context.oldBounds, this._injector);

  layoutConnections(context.element, this._injector.get('modeling'));
};

ExpandStateHandler.prototype.revert = function(context) {
  const { element, dis, delta } = context;

  const manager = this._umlManager;

  context.parents = removeFromCanvas(this._canvas, context.elements);

  restoreDis(context.moves);
  translateDis(dis, { x: -delta.x, y: -delta.y });

  setBounds(element, context.oldBounds, this._umlFactory);

  manager._restoreView(context.view, context.removedView);
  manager._emitViewsChanged();

  return [ element ];
};


/**
 * Diagram elements and the shapes they contain, at any depth.
 */
function getNestedDis(dis) {
  return dis.flatMap(di => [ di, ...getNestedDis(di.get('ownedElement').filter(isShapeDi)) ]);
}
