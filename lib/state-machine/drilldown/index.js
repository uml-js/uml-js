import DrilldownModule from '../../core/drilldown/index.js';

import StateMachineDrilldownProvider from './StateMachineDrilldownProvider.js';

export default {
  __depends__: [ DrilldownModule ],
  __init__: [ 'stateMachineDrilldownProvider' ],
  stateMachineDrilldownProvider: [ 'type', StateMachineDrilldownProvider ]
};
