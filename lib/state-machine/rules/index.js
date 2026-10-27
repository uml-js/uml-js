import RulesModule from 'diagram-js/lib/features/rules/index.js';

import StateMachineRules from './StateMachineRules.js';

export default {
  __depends__: [ RulesModule ],
  __init__: [ 'stateMachineRules' ],
  stateMachineRules: [ 'type', StateMachineRules ]
};
