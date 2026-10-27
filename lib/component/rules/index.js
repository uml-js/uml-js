import RulesModule from 'diagram-js/lib/features/rules/index.js';

import ComponentRules from './ComponentRules.js';

export default {
  __depends__: [ RulesModule ],
  __init__: [ 'componentRules' ],
  componentRules: [ 'type', ComponentRules ]
};
