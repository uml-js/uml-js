import inherits from 'inherits-browser';

import UmlModeling from '../../core/modeling/UmlModeling.js';

import UpdateLabelHandler from './cmd/UpdateLabelHandler.js';
import RemoveCompartmentHandler from './cmd/RemoveCompartmentHandler.js';
import UpdateBehavioursCompartmentHandler from './cmd/UpdateBehavioursCompartmentHandler.js';
import UpdateCompositeHandler from './cmd/UpdateCompositeHandler.js';
import UpdateSubmachineHandler from './cmd/UpdateSubmachineHandler.js';
import CollapseStateHandler from './cmd/CollapseStateHandler.js';
import ExpandStateHandler from './cmd/ExpandStateHandler.js';
import ExtractSubmachineHandler from './cmd/ExtractSubmachineHandler.js';
import InlineSubmachineHandler from './cmd/InlineSubmachineHandler.js';

import { getStateKind } from '../util/ElementUtil.js';


/**
 * State machine modeling: UML modeling plus label editing, switching states
 * between simple, composite and submachine states, and collapsing and
 * expanding composite states.
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
  handlers['state.collapse'] = CollapseStateHandler;
  handlers['state.expand'] = ExpandStateHandler;
  handlers['state.extractSubmachine'] = ExtractSubmachineHandler;
  handlers['state.inlineSubmachine'] = InlineSubmachineHandler;
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
 * Change the kind of a state, carrying its content over where possible:
 *
 *   * simple → composite: an empty region is added
 *   * simple → submachine: a new state machine is referred to
 *   * composite → simple: regions and sub-states are removed
 *   * composite → submachine: the regions move to a new state machine referred to
 *   * submachine → simple: the state machine is no longer referred to, but kept
 *   * submachine → composite: the regions of the state machine move to the state,
 *     the state machine is removed
 *
 * @param {Shape} state
 * @param {'simple'|'composite'|'submachine'} kind
 */
Modeling.prototype.changeStateKind = function(state, kind) {
  const current = getStateKind(state);

  if (kind === current) {
    return;
  }

  if (current === 'simple') {
    return kind === 'composite' ? this.updateComposite(state, true) : this.updateSubmachine(state, true);
  }

  if (current === 'composite') {
    return kind === 'simple'
      ? this.updateComposite(state, false)
      : this._commandStack.execute('state.extractSubmachine', { element: state });
  }

  return kind === 'simple'
    ? this.updateSubmachine(state, false)
    : this._commandStack.execute('state.inlineSubmachine', { element: state });
};

/**
 * Collapse a composite state: move its sub-states to a diagram of the state.
 * Requires the manager of all diagrams (see lib/uml.js).
 *
 * @param {Shape} state
 */
Modeling.prototype.collapseState = function(state) {
  this._commandStack.execute('state.collapse', {
    element: state
  });
};

/**
 * Expand a collapsed state: move the content of its diagram into it.
 * Requires the manager of all diagrams (see lib/uml.js).
 *
 * @param {Shape} state
 */
Modeling.prototype.expandState = function(state) {
  this._commandStack.execute('state.expand', {
    element: state
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
