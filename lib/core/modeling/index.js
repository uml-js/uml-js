import UmlUpdater from './UmlUpdater.js';
import LabelBehavior from './behavior/LabelBehavior.js';
import ConnectionRules from './ConnectionRules.js';
import DockingBehavior from './behavior/DockingBehavior.js';

import CroppingConnectionDocking from 'diagram-js/lib/layout/CroppingConnectionDocking.js';

export default {
  __init__: [
    'umlUpdater',
    'labelBehavior',
    'connectionRules',
    'dockingBehavior'
  ],
  umlUpdater: [ 'type', UmlUpdater ],
  labelBehavior: [ 'type', LabelBehavior ],
  connectionRules: [ 'type', ConnectionRules ],
  dockingBehavior: [ 'type', DockingBehavior ],
  connectionDocking: [ 'type', CroppingConnectionDocking ]
};
