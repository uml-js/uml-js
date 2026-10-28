import { getSiblings, is } from '../../../core/util/ModelUtil.js';

import { getCompartmentLines } from '../../util/LabelUtil.js';

import { ACTIVITY_LINE_HEIGHT, NAME_COMPARTMENT_HEIGHT } from '../../util/ElementUtil.js';

import { moveRegions } from './ExtractSubmachineHandler.js';

import { getBox, unwrapDis, wrapDis } from './CollapseUtil.js';

// space around the sub-states in the shape of the state
const PADDING = 20;


/**
 * Turns a submachine state into a composite state: the regions of the state machine
 * it refers to move to the state, and the state machine is removed. With them, the
 * diagram of the state machine becomes the diagram of the state's sub-states, named
 * after the state, whose decomposition is hidden then (see ExpandStateHandler to show it):
 * a diagram of the state machine shown, its content inside a new shape of the state.
 *
 * Only for state machines no other state refers to.
 */
export default function InlineSubmachineHandler(commandStack, canvas, umlFactory, injector) {
  this._commandStack = commandStack;
  this._canvas = canvas;
  this._umlFactory = umlFactory;

  // the manager of all diagrams (see lib/uml.js), missing in a viewer of a single diagram
  this._umlManager = injector.get('umlManager', false);
}

InlineSubmachineHandler.$inject = [ 'commandStack', 'canvas', 'umlFactory', 'injector' ];

InlineSubmachineHandler.prototype.execute = function(context) {
  const { element } = context;
  const state = element.businessObject;

  if (!context.stateMachine) {
    const stateMachine = context.stateMachine = state.submachine;

    context.siblings = getSiblings(stateMachine);
    context.view = this._umlManager && this._umlManager.getViewOf(stateMachine);
  }

  const { stateMachine, siblings, view } = context;

  const collection = siblings.collection;

  context.index = collection.indexOf(stateMachine);
  collection.splice(context.index, 1);
  stateMachine.$parent = null;

  moveRegions(stateMachine, state);

  state.set('submachine', undefined);

  if (view) {
    const diagram = view.element;

    context.oldName = diagram.name;

    // the state, around its sub-states
    const box = getBox(diagram.get('ownedElement').filter(di => !is(di, 'umldi:UMLEdge')));
    const lines = getCompartmentLines(state).length;
    const top = NAME_COMPARTMENT_HEIGHT + (lines ? lines * ACTIVITY_LINE_HEIGHT + 8 : 0) + PADDING;

    context.wrapped = wrapDis(diagram, state, {
      x: box.x - PADDING,
      y: box.y - top,
      width: box.width + 2 * PADDING,
      height: box.height + top + PADDING
    }, this._umlFactory);

    diagram.set('modelElement', [ this._canvas.getRootElement().businessObject ]);
    setName(view, state.name || state.id);

    this._umlManager._emitViewsChanged();
  }

  return [ element ];
};

// without sub-states there is nothing to show in a diagram of them
InlineSubmachineHandler.prototype.postExecute = function(context) {
  const { element, view } = context;

  const empty = !element.businessObject.get('region').some(region => region.get('subvertex').length);

  if (view && empty) {
    this._commandStack.execute('view.delete', { manager: this._umlManager, view });
  }
};

InlineSubmachineHandler.prototype.revert = function(context) {
  const { element, stateMachine, siblings, view, index } = context;
  const state = element.businessObject;

  if (view) {
    view.element.set('modelElement', [ stateMachine ]);
    setName(view, context.oldName);

    unwrapDis(context.wrapped);

    this._umlManager._emitViewsChanged();
  }

  state.set('submachine', stateMachine);

  moveRegions(state, stateMachine);

  siblings.collection.splice(index, 0, stateMachine);
  stateMachine.$parent = siblings.owner;

  return [ element ];
};


function setName(view, name) {
  view.element.set('name', name);
  view.name = name || view.id;
}
