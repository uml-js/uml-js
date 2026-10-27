import RulesModule from 'diagram-js/lib/features/rules/index.js';

import ClassRules from './ClassRules.js';

export default {
  __depends__: [ RulesModule ],
  __init__: [ 'classRules' ],
  classRules: [ 'type', ClassRules ]
};
