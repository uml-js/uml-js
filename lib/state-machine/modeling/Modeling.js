import inherits from 'inherits-browser';

import UmlModeling from '../../core/modeling/UmlModeling.js';

import UpdateLabelHandler from './cmd/UpdateLabelHandler.js';
import RemoveCompartmentHandler from './cmd/RemoveCompartmentHandler.js';
import UpdateBehavioursCompartmentHandler from './cmd/UpdateBehavioursCompartmentHandler.js';
import UpdateCompositeHandler from './cmd/UpdateCompositeHandler.js';
import UpdateSubmachineHandler from './cmd/UpdateSubmachineHandler.js';


/**
 * State machine modeling: UML modeling plus label editing and
 * switching states between simple, composite and submachine states.
 */
export default function Modeling(eventBus, elementFactory, commandStack) {
  UmlModeling.call(this, eventBus, elementFactory, commandStack);
}

inherits(Modeling, UmlModeling);

Modeling.$inject = [
  'eventBus',
  'elementFactory',
  'commandStack'
];

Modeling.prototype.getHandlers = function() {
  const handlers = UmlModeling.prototype.getHandlers.call(this);

  handlers['element.updateLabel'] = UpdateLabelHandler;
  handlers['state.updateComposite'] = UpdateCompositeHandler;
  handlers['state.updateSubmachine'] = UpdateSubmachineHandler;
  handlers['state.updateBehavioursCompartment'] = UpdateBehavioursCompartmentHandler;
  handlers['state.removeCompartment'] = RemoveCompartmentHandler;

  return handlers;
};

/**
 * Update the textual notation of an element, i.e. the name and internal
 * activities of a state or the trigger, guard and effect of a transition.
 *
 * @param {Element} element
 * @param {string} newLabel
 */
Modeling.prototype.updateLabel = function(element, newLabel) {
  this._commandStack.execute('element.updateLabel', {
    element,
    newLabel
  });
};

/**
 * Turn a simple state into a composite state (adding a region) or a
 * composite state into a simple state (removing regions and sub-states).
 *
 * @param {Shape} state
 * @param {boolean} composite
 */
Modeling.prototype.updateComposite = function(state, composite) {
  this._commandStack.execute('state.updateComposite', {
    element: state,
    composite
  });
};

/**
 * Turn a simple state into a submachine state, referring to a new state machine
 * next to the one shown, or a submachine state into a simple state.
 *
 * @param {Shape} state
 * @param {boolean} submachine
 */
Modeling.prototype.updateSubmachine = function(state, submachine) {
  this._commandStack.execute('state.updateSubmachine', {
    element: state,
    submachine
  });
};

/**
 * Show the compartment for internal behaviours (entry, do, exit) of a simple
 * state, or remove it along with the behaviours.
 *
 * @param {Shape} state
 * @param {boolean} show
 */
Modeling.prototype.updateBehavioursCompartment = function(state, show) {
  this._commandStack.execute('state.updateBehavioursCompartment', {
    element: state,
    show
  });
};

/**
 * Add the compartment of a state (below its separator line), or remove it
 * with its content: sub-states and entry / do / exit.
 *
 * @param {Shape} state
 * @param {boolean} show
 */
Modeling.prototype.setCompartment = function(state, show) {
  if (show) {
    return this.updateBehavioursCompartment(state, true);
  }

  this._commandStack.execute('state.removeCompartment', {
    element: state
  });
};

/**
 * Vertices are connected with transitions.
 */
Modeling.prototype.getConnectionAttrs = function() {
  return { type: 'uml:Transition' };
};
