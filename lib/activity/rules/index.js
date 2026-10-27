import RulesModule from 'diagram-js/lib/features/rules/index.js';

import ActivityRules from './ActivityRules.js';

export default {
  __depends__: [ RulesModule ],
  __init__: [ 'activityRules' ],
  activityRules: [ 'type', ActivityRules ]
};
