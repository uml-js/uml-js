import OutlineModule from 'diagram-js/lib/features/outline/index.js';
import ContextPadModule from 'diagram-js/lib/features/context-pad/index.js';
import SelectionModule from 'diagram-js/lib/features/selection/index.js';
import ConnectModule from 'diagram-js/lib/features/connect/index.js';

import LifelinePoint from './LifelinePoint.js';

export default {
  __depends__: [
    OutlineModule,
    ContextPadModule,
    SelectionModule,
    ConnectModule
  ],
  __init__: [ 'lifelinePoint' ],
  lifelinePoint: [ 'type', LifelinePoint ]
};
