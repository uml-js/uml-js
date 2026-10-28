import { getSiblings } from '../../../core/util/ModelUtil.js';


/**
 * Turns a simple state into a submachine state, referring to a new state machine,
 * or a submachine state into a simple state.
 *
 * Like a BPMN call activity calls a process, the state machine is not part of the
 * one shown but placed next to it (in the same package or class), so other states
 * can refer to it, too. It is kept when the state becomes a simple state again.
 */
export default function UpdateSubmachineHandler(umlFactory, canvas) {
  this._umlFactory = umlFactory;
  this._canvas = canvas;
}

UpdateSubmachineHandler.$inject = [ 'umlFactory', 'canvas' ];

UpdateSubmachineHandler.prototype.execute = function(context) {
  const { element, submachine } = context;
  const state = element.businessObject;

  context.oldSubmachine = state.get('submachine');

  if (!submachine) {
    state.set('submachine', undefined);

    return [ element ];
  }

  // create once, so re-doing re-uses the same model elements
  if (!context.stateMachine) {
    const stateMachine = context.stateMachine = this._umlFactory.create('uml:StateMachine', { name: state.name || 'StateMachine' });

    // a state machine has at least one region (UML 2.5.1)
    const region = this._umlFactory.create('uml:Region');

    region.$parent = stateMachine;
    stateMachine.set('region', [ region ]);

    context.siblings = getSiblings(this._canvas.getRootElement().businessObject);
  }

  const { stateMachine, siblings } = context;

  siblings.collection.push(stateMachine);
  stateMachine.$parent = siblings.owner;

  state.set('submachine', stateMachine);

  return [ element ];
};

UpdateSubmachineHandler.prototype.revert = function(context) {
  const { element, submachine, stateMachine, siblings, oldSubmachine } = context;

  if (submachine) {
    const collection = siblings.collection;

    collection.splice(collection.indexOf(stateMachine), 1);
    stateMachine.$parent = null;
  }

  element.businessObject.set('submachine', oldSubmachine);

  return [ element ];
};
