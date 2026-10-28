import { getSiblings } from '../../../core/util/ModelUtil.js';

import { getDecompositionShape, getDecompositionView, getDescendantShapes, isCollapsed } from '../../util/ElementUtil.js';

import { rewrapShape, unwrapShape } from './CollapseUtil.js';


/**
 * Turns a composite state into a submachine state: its regions move to a new state
 * machine next to the one shown, which the state refers to. With them, the diagram
 * of its sub-states becomes the diagram of the state machine, without the shape of
 * the state, the sub-states shown in the state being moved to such a diagram first
 * (see CollapseStateHandler).
 */
export default function ExtractSubmachineHandler(modeling, umlFactory, canvas, injector) {
  this._modeling = modeling;
  this._umlFactory = umlFactory;
  this._canvas = canvas;

  // the manager of all diagrams (see lib/uml.js), missing in a viewer of a single diagram
  this._umlManager = injector.get('umlManager', false);
}

ExtractSubmachineHandler.$inject = [ 'modeling', 'umlFactory', 'canvas', 'injector' ];

ExtractSubmachineHandler.prototype.preExecute = function(context) {
  const { element } = context;

  if (!isCollapsed(element) && getDescendantShapes(element).length) {
    this._modeling.collapseState(element);
  }
};

ExtractSubmachineHandler.prototype.execute = function(context) {
  const { element } = context;
  const state = element.businessObject;

  // create once, so re-doing re-uses the same model elements
  if (!context.stateMachine) {
    context.stateMachine = this._umlFactory.create('uml:StateMachine', { name: state.name || 'StateMachine' });
    context.siblings = getSiblings(this._canvas.getRootElement().businessObject);
    context.view = this._umlManager && getDecompositionView(this._umlManager, state);
  }

  const { stateMachine, siblings, view } = context;

  siblings.collection.push(stateMachine);
  stateMachine.$parent = siblings.owner;

  moveRegions(state, stateMachine);

  state.set('submachine', stateMachine);

  if (view) {
    const diagram = view.element;

    context.unwrapped = unwrapShape(diagram, getDecompositionShape(diagram, state));
    context.oldModelElement = diagram.modelElement[0];

    diagram.set('modelElement', [ stateMachine ]);
  }

  return [ element ];
};

ExtractSubmachineHandler.prototype.revert = function(context) {
  const { element, stateMachine, siblings, view } = context;
  const state = element.businessObject;

  if (view) {
    view.element.set('modelElement', [ context.oldModelElement ]);

    rewrapShape(context.unwrapped);
  }

  state.set('submachine', undefined);

  moveRegions(stateMachine, state);

  const collection = siblings.collection;

  collection.splice(collection.indexOf(stateMachine), 1);
  stateMachine.$parent = null;

  return [ element ];
};


/**
 * Move the regions of a state or state machine to another one.
 */
export function moveRegions(from, to) {
  const regions = [ ...from.get('region') ];

  from.set('region', []);

  to.set('region', regions);
  regions.forEach(region => region.$parent = to);
}
