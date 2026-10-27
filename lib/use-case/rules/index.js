import RulesModule from 'diagram-js/lib/features/rules/index.js';

import UseCaseRules from './UseCaseRules.js';

export default {
  __depends__: [ RulesModule ],
  __init__: [ 'useCaseRules' ],
  useCaseRules: [ 'type', UseCaseRules ]
};
