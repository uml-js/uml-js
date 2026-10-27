import UmlUpdater from './UmlUpdater.js';
import LabelBehavior from './behavior/LabelBehavior.js';

import CroppingConnectionDocking from 'diagram-js/lib/layout/CroppingConnectionDocking.js';

export default {
  __init__: [
    'umlUpdater',
    'labelBehavior'
  ],
  umlUpdater: [ 'type', UmlUpdater ],
  labelBehavior: [ 'type', LabelBehavior ],
  connectionDocking: [ 'type', CroppingConnectionDocking ]
};
