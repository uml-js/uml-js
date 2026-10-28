import { getDescendantShapes, getSiblings, isLabel } from '../../../core/util/ModelUtil.js';

import { getDefaultSize } from '../../util/ElementUtil.js';

import {
  addToCanvas,
  layoutConnections,
  moveDis,
  removeFromCanvas,
  restoreDis
} from '../../../core/util/ContentMoveUtil.js';


/**
 * Turns a structured activity node into a call behavior action: its nodes and edges
 * move to a new activity next to the activity shown, which the action calls, and
 * the shapes showing them to a new diagram of that activity.
 */
export default function ExtractActivityHandler(modeling, canvas, elementRegistry, umlFactory, injector) {
  this._modeling = modeling;
  this._canvas = canvas;
  this._elementRegistry = elementRegistry;
  this._umlFactory = umlFactory;

  // the manager of all diagrams (see lib/uml.js), missing in a viewer of a single diagram
  this._umlManager = injector.get('umlManager', false);
}

ExtractActivityHandler.$inject = [ 'modeling', 'canvas', 'elementRegistry', 'umlFactory', 'injector' ];

ExtractActivityHandler.prototype.execute = function(context) {
  const { element } = context;
  const structured = element.businessObject;

  const manager = this._umlManager;

  if (!manager) {
    throw new Error('calling a new activity requires the manager of all diagrams');
  }

  // collect once, so re-doing moves the same elements
  if (!context.activity) {
    const shapes = getDescendantShapes(element);
    const contained = new Set(shapes);

    const connections = this._elementRegistry.filter(e => e.waypoints && contained.has(e.source) && contained.has(e.target));

    context.elements = [ ...shapes, ...connections, ...[ ...shapes, ...connections ].flatMap(e => e.labels) ];

    // the diagram elements of shapes inside nested ones move along with them
    context.dis = [
      ...element.children.filter(child => !isLabel(child) && !child.waypoints),
      ...connections
    ].map(e => e.di);

    const activity = context.activity = this._umlFactory.create('uml:Activity', { name: structured.name || 'Activity' });

    context.siblings = getSiblings(this._canvas.getRootElement().businessObject);

    context.diagram = this._umlFactory.create('umldi:UMLActivityDiagram', {
      name: activity.name,
      modelElement: [ activity ]
    });

    context.nodes = [ ...structured.get('node') ];
    context.edges = [ ...structured.get('edge') ];
  }

  const { activity, siblings, diagram, nodes, edges } = context;

  context.parents = removeFromCanvas(this._canvas, context.elements);
  context.moves = moveDis(context.dis, () => diagram);

  siblings.collection.push(activity);
  activity.$parent = siblings.owner;

  moveContent(structured, activity, nodes, edges);

  if (context.view) {
    manager._restoreView(context.view, context.removedView);
  } else {
    context.view = manager._addView(diagram);
  }

  manager._emitViewsChanged();

  return [ element ];
};

// a call behavior action calling the new activity, of the size of actions
ExtractActivityHandler.prototype.postExecute = function(context) {
  const { element, activity } = context;

  this._modeling.changeNodeType(element, 'uml:CallBehaviorAction', { behavior: activity });

  const size = getDefaultSize(element.businessObject);

  // keep the top left corner, so showing the activity in place again uses the space freed
  this._modeling.resizeShape(element, { x: element.x, y: element.y, ...size });

  layoutConnections(element, this._modeling);
};

ExtractActivityHandler.prototype.revert = function(context) {
  const { element, activity, siblings, nodes, edges } = context;

  const manager = this._umlManager;

  context.removedView = manager._removeView(context.view);
  manager._emitViewsChanged();

  restoreDis(context.moves);

  moveContent(activity, element.businessObject, nodes, edges);

  const collection = siblings.collection;

  collection.splice(collection.indexOf(activity), 1);
  activity.$parent = null;

  addToCanvas(this._canvas, context.elements, context.parents);

  return [ element ];
};


/**
 * Move nodes and edges between activities and structured activity nodes.
 */
export function moveContent(from, to, nodes, edges) {
  from.set('node', []);
  from.set('edge', []);

  to.set('node', [ ...nodes ]);
  to.set('edge', [ ...edges ]);

  [ ...nodes, ...edges ].forEach(element => element.$parent = to);
}
