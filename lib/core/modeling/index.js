import UmlUpdater from './UmlUpdater.js';
import LabelBehavior from './behavior/LabelBehavior.js';
import ConnectionRules from './ConnectionRules.js';

import CroppingConnectionDocking from 'diagram-js/lib/layout/CroppingConnectionDocking.js';

export default {
  __init__: [
    'umlUpdater',
    'labelBehavior',
    'connectionRules'
  ],
  umlUpdater: [ 'type', UmlUpdater ],
  labelBehavior: [ 'type', LabelBehavior ],
  connectionRules: [ 'type', ConnectionRules ],
  connectionDocking: [ 'type', CroppingConnectionDocking ]
};
