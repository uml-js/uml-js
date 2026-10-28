import { getSiblings, is } from '../../../core/util/ModelUtil.js';

import { getDefaultSize, STRUCTURED_HEADER_HEIGHT } from '../../util/ElementUtil.js';

import {
  addToCanvas,
  getBounds,
  getBox,
  layoutConnections,
  makeSpace,
  moveDis,
  removeFromCanvas,
  restoreDis,
  setBounds,
  translateDis
} from '../../../core/util/ContentMoveUtil.js';

import { moveContent } from './ExtractActivityHandler.js';

// space around the nodes inside a structured activity node
const PADDING = 20;


/**
 * Turns a call behavior action into a structured activity node: the nodes and edges
 * of the activity it calls move into it, the shapes showing them from the diagram
 * of the activity, and the activity with its diagram is removed. The structured
 * activity node grows to fit its content.
 *
 * Only for activities no other action calls.
 */
export default function InlineActivityHandler(modeling, canvas, umlFactory, umlImporter, injector) {
  this._modeling = modeling;
  this._injector = injector;
  this._canvas = canvas;
  this._umlFactory = umlFactory;
  this._umlImporter = umlImporter;

  // the manager of all diagrams (see lib/uml.js), missing in a viewer of a single diagram
  this._umlManager = injector.get('umlManager', false);
}

InlineActivityHandler.$inject = [ 'modeling', 'canvas', 'umlFactory', 'umlImporter', 'injector' ];

InlineActivityHandler.prototype.preExecute = function(context) {
  const { element } = context;

  context.activity = element.businessObject.behavior;

  this._modeling.changeNodeType(element, 'uml:StructuredActivityNode');
};

InlineActivityHandler.prototype.execute = function(context) {
  const { element, activity } = context;
  const structured = element.businessObject;

  const manager = this._umlManager;

  // computed once, so re-doing moves the same elements
  if (!context.siblings) {
    context.siblings = getSiblings(activity);
    context.nodes = [ ...activity.get('node') ];
    context.edges = [ ...activity.get('edge') ];

    const view = context.view = manager && manager.getViewOf(activity);

    const size = getDefaultSize(structured);

    context.oldBounds = getBounds(element);
    context.newBounds = { x: element.x, y: element.y, ...size };

    if (view) {
      const dis = context.dis = [ ...view.element.get('ownedElement') ];

      const box = getBox(dis);

      context.delta = {
        x: element.x + PADDING - box.x,
        y: element.y + STRUCTURED_HEADER_HEIGHT + PADDING - box.y
      };

      context.newBounds.width = Math.max(size.width, box.width + 2 * PADDING);
      context.newBounds.height = Math.max(size.height, STRUCTURED_HEADER_HEIGHT + box.height + 2 * PADDING);
    }
  }

  const { siblings, nodes, edges, view, dis, delta } = context;

  const collection = siblings.collection;

  context.index = collection.indexOf(activity);
  collection.splice(context.index, 1);
  activity.$parent = null;

  moveContent(activity, structured, nodes, edges);

  setBounds(element, context.newBounds, this._umlFactory);

  if (!view) {
    return [ element ];
  }

  translateDis(dis, delta);

  // shapes are owned by the structured activity node, edges by the diagram shown
  const rootDi = this._canvas.getRootElement().di;

  context.moves = moveDis(dis, di => is(di, 'umldi:UMLEdge') ? rootDi : element.di);

  context.removedView = manager._removeView(view);
  manager._emitViewsChanged();

  if (context.elements) {
    addToCanvas(this._canvas, context.elements, context.parents);
  } else {
    context.elements = this._umlImporter.importElements(dis, element);
  }

  return [ element ];
};

// space for the structured activity node, whose edges end at its new border
InlineActivityHandler.prototype.postExecute = function(context) {
  makeSpace(context.element, context.oldBounds, this._injector);

  layoutConnections(context.element, this._modeling);
};

InlineActivityHandler.prototype.revert = function(context) {
  const { element, activity, siblings, nodes, edges, view, dis, delta, index } = context;

  const manager = this._umlManager;

  if (view) {
    context.parents = removeFromCanvas(this._canvas, context.elements);

    restoreDis(context.moves);
    translateDis(dis, { x: -delta.x, y: -delta.y });

    manager._restoreView(view, context.removedView);
    manager._emitViewsChanged();
  }

  setBounds(element, context.oldBounds, this._umlFactory);

  moveContent(element.businessObject, activity, nodes, edges);

  siblings.collection.splice(index, 0, activity);
  activity.$parent = siblings.owner;

  return [ element ];
};
