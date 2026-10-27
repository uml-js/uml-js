import ReplaceModule from 'diagram-js/lib/features/replace/index.js';

import StateMachineReplace from './StateMachineReplace.js';

export default {
  __depends__: [ ReplaceModule ],
  stateMachineReplace: [ 'type', StateMachineReplace ]
};
