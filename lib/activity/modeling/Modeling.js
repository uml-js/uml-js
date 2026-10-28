import inherits from 'inherits-browser';

import UmlModeling from '../../core/modeling/UmlModeling.js';

import UpdateLabelHandler from './cmd/UpdateLabelHandler.js';
import ChangeNodeTypeHandler from './cmd/ChangeNodeTypeHandler.js';
import CreateCalledActivityHandler from './cmd/CreateCalledActivityHandler.js';
import ChangeActionKindHandler from './cmd/ChangeActionKindHandler.js';
import ExtractActivityHandler from './cmd/ExtractActivityHandler.js';
import InlineActivityHandler from './cmd/InlineActivityHandler.js';

import { getActionKind } from '../util/ElementUtil.js';


/**
 * Activity diagram modeling: UML modeling plus editing names and guards,
 * and changing the type of nodes in place.
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
  handlers['node.changeType'] = ChangeNodeTypeHandler;
  handlers['callBehaviorAction.createActivity'] = CreateCalledActivityHandler;
  handlers['action.changeKind'] = ChangeActionKindHandler;
  handlers['action.extractActivity'] = ExtractActivityHandler;
  handlers['action.inlineActivity'] = InlineActivityHandler;

  return handlers;
};

/**
 * @param {Element} element an action (name) or a control flow (`name [guard]`)
 * @param {string} newLabel
 */
Modeling.prototype.updateLabel = function(element, newLabel) {
  this._commandStack.execute('element.updateLabel', {
    element,
    newLabel
  });
};

/**
 * Change the type of a node, keeping its ID, name, flows and diagram element,
 * e.g. a decision into a merge node.
 *
 * @param {Shape} node
 * @param {string} type
 * @param {Object} [attrs] of the new model element, e.g. the behavior of a call behavior action
 */
Modeling.prototype.changeNodeType = function(node, type, attrs) {
  this._commandStack.execute('node.changeType', {
    element: node,
    type,
    attrs
  });
};

/**
 * Change the kind of an action, carrying its content over where possible:
 *
 *   * action ↔ call behavior action: a new activity is called, or no longer called but kept
 *   * action → structured activity node: an empty one
 *   * structured activity node → action: its nodes and edges are removed
 *   * structured activity node → call behavior action: its nodes and edges move to a
 *     new activity called, with a diagram of their own (requires the manager of all diagrams)
 *   * call behavior action → structured activity node: the nodes and edges of the
 *     activity called move into it, the activity and its diagram are removed
 *
 * @param {Shape} action
 * @param {'opaque'|'call'|'structured'} kind
 */
Modeling.prototype.changeActionKind = function(action, kind) {
  const current = getActionKind(action);

  if (kind === current) {
    return;
  }

  if (current === 'structured' && kind === 'call') {
    return this._commandStack.execute('action.extractActivity', { element: action });
  }

  if (current === 'call' && kind === 'structured') {
    return this._commandStack.execute('action.inlineActivity', { element: action });
  }

  this._commandStack.execute('action.changeKind', { element: action, kind });
};

/**
 * Create the activity a call behavior action calls, next to the activity shown.
 *
 * @param {Shape} action a call behavior action
 */
Modeling.prototype.createCalledActivity = function(action) {
  this._commandStack.execute('callBehaviorAction.createActivity', {
    element: action
  });
};

/**
 * Nodes are connected by control flows.
 */
Modeling.prototype.getConnectionAttrs = function() {
  return { type: 'uml:ControlFlow' };
};
