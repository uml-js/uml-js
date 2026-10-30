import UmlUpdater from './UmlUpdater.js';
import LabelBehavior from './behavior/LabelBehavior.js';
import ConnectionRules from './ConnectionRules.js';
import DockingBehavior from './behavior/DockingBehavior.js';
import DropOnConnectionBehavior from './behavior/DropOnConnectionBehavior.js';
import LabelHoverBehavior from './behavior/LabelHoverBehavior.js';

import CroppingConnectionDocking from 'diagram-js/lib/layout/CroppingConnectionDocking.js';

export default {
  __init__: [
    'umlUpdater',
    'labelBehavior',
    'connectionRules',
    'dockingBehavior',
    'dropOnConnectionBehavior',
    'labelHoverBehavior'
  ],
  umlUpdater: [ 'type', UmlUpdater ],
  labelBehavior: [ 'type', LabelBehavior ],
  connectionRules: [ 'type', ConnectionRules ],
  dockingBehavior: [ 'type', DockingBehavior ],
  dropOnConnectionBehavior: [ 'type', DropOnConnectionBehavior ],
  labelHoverBehavior: [ 'type', LabelHoverBehavior ],
  connectionDocking: [ 'type', CroppingConnectionDocking ]
};
