import inherits from 'inherits-browser';

import UmlModeling from '../../core/modeling/UmlModeling.js';

import UpdateLabelHandler from './cmd/UpdateLabelHandler.js';
import ChangeNodeTypeHandler from './cmd/ChangeNodeTypeHandler.js';
import CreateCalledActivityHandler from './cmd/CreateCalledActivityHandler.js';


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
 */
Modeling.prototype.changeNodeType = function(node, type) {
  this._commandStack.execute('node.changeType', {
    element: node,
    type
  });
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
