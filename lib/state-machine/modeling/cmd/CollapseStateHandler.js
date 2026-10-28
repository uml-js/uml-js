import { is, isLabel } from '../../../core/util/ModelUtil.js';

import { getCompartmentLines } from '../../util/LabelUtil.js';

import {
  ACTIVITY_LINE_HEIGHT,
  getDefaultSize,
  getDescendantShapes,
  NAME_COMPARTMENT_HEIGHT
} from '../../util/ElementUtil.js';

import {
  addToCanvas,
  getBounds,
  layoutConnections,
  moveDis,
  removeFromCanvas,
  restoreDis,
  setBounds
} from './CollapseUtil.js';


/**
 * Collapses a composite state, hiding its decomposition: moves its sub-states with
 * the transitions between them to a new diagram, as bpmn-js moves the content of
 * collapsed subprocesses to a plane of their own. The model is not changed.
 *
 * As UML DI allows state machine diagrams of state machines only, the new diagram
 * is one of the state machine shown, with the state shown expanded in it.
 */
export default function CollapseStateHandler(canvas, elementRegistry, umlFactory, injector) {
  this._canvas = canvas;
  this._elementRegistry = elementRegistry;
  this._umlFactory = umlFactory;

  // the manager of all diagrams (see lib/uml.js), missing in a viewer of a single diagram
  this._umlManager = injector.get('umlManager', false);

  this._injector = injector;
}

CollapseStateHandler.$inject = [ 'canvas', 'elementRegistry', 'umlFactory', 'injector' ];

CollapseStateHandler.prototype.execute = function(context) {
  const { element } = context;
  const bo = element.businessObject;

  const manager = this._umlManager;

  if (!manager) {
    throw new Error('collapsing states requires the manager of all diagrams');
  }

  // collect once, so re-doing moves the same elements
  if (!context.elements) {
    const shapes = getDescendantShapes(element);
    const contained = new Set(shapes);

    const connections = this._elementRegistry.filter(e => e.waypoints && contained.has(e.source) && contained.has(e.target));

    context.elements = [ ...shapes, ...connections, ...[ ...shapes, ...connections ].flatMap(e => e.labels) ];

    // the diagram elements of shapes inside nested ones move along with them
    context.dis = [
      ...element.children.filter(child => !isLabel(child) && !child.waypoints),
      ...connections
    ].map(e => e.di);

    const diagram = context.diagram = this._umlFactory.create('umldi:UMLStateMachineDiagram', {
      name: bo.name || bo.id,
      modelElement: [ this._canvas.getRootElement().businessObject ]
    });

    // the state expanded, at the size it has here
    const stateShape = context.stateShape = this._umlFactory.create('umldi:UMLStateShape', {
      modelElement: [ bo ],
      bounds: this._umlFactory.createBounds(element)
    });

    stateShape.bounds.$parent = stateShape;
    stateShape.$parent = diagram;
    diagram.get('ownedElement').push(stateShape);

    const lines = getCompartmentLines(bo).length;
    const { width, height } = getDefaultSize(bo);

    context.oldBounds = getBounds(element);
    context.newBounds = {
      x: element.x,
      y: element.y,
      width,
      height: lines ? Math.max(height, NAME_COMPARTMENT_HEIGHT + lines * ACTIVITY_LINE_HEIGHT + 8) : height
    };
  }

  const { diagram, stateShape } = context;

  context.parents = removeFromCanvas(this._canvas, context.elements);

  // shapes inside the state, edges owned by the diagram
  context.moves = moveDis(context.dis, di => is(di, 'umldi:UMLEdge') ? diagram : stateShape);

  setBounds(element, context.newBounds, this._umlFactory);

  if (context.view) {
    manager._restoreView(context.view, context.removedView);
  } else {
    context.view = manager._addView(diagram);
  }

  manager._emitViewsChanged();

  return [ element ];
};

// transitions of the state end at its new border
CollapseStateHandler.prototype.postExecute = function(context) {
  layoutConnections(context.element, this._injector.get('modeling'));
};

CollapseStateHandler.prototype.revert = function(context) {
  const { element } = context;

  const manager = this._umlManager;

  context.removedView = manager._removeView(context.view);
  manager._emitViewsChanged();

  restoreDis(context.moves);

  setBounds(element, context.oldBounds, this._umlFactory);

  addToCanvas(this._canvas, context.elements, context.parents);

  return [ element ];
};
