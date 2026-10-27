import RulesModule from 'diagram-js/lib/features/rules/index.js';

import SequenceRules from './SequenceRules.js';

export default {
  __depends__: [ RulesModule ],
  __init__: [ 'sequenceRules' ],
  sequenceRules: [ 'type', SequenceRules ]
};
