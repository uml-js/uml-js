import DrilldownModule from '../../core/drilldown/index.js';

import ActivityDrilldownProvider from './ActivityDrilldownProvider.js';

export default {
  __depends__: [ DrilldownModule ],
  __init__: [ 'activityDrilldownProvider' ],
  activityDrilldownProvider: [ 'type', ActivityDrilldownProvider ]
};
