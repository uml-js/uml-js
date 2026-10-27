import BaseModelingModule from 'diagram-js/lib/features/modeling/index.js';
import LabelSupportModule from 'diagram-js/lib/features/label-support/index.js';
import AttachSupportModule from 'diagram-js/lib/features/attach-support/index.js';

import CoreModelingModule from '../../core/modeling/index.js';
import UmlLayouter from '../../core/layout/UmlLayouter.js';

import Modeling from './Modeling.js';
import ElementFactory from './ElementFactory.js';
import ComponentUpdater from './ComponentUpdater.js';
import PortBehavior from './behavior/PortBehavior.js';
import ExternalLabelBehavior from './behavior/ExternalLabelBehavior.js';
import PortTypingBehavior from './behavior/PortTypingBehavior.js';
import ReconnectBehavior from './behavior/ReconnectBehavior.js';

export default {
  __depends__: [
    BaseModelingModule,
    LabelSupportModule,
    AttachSupportModule,
    CoreModelingModule
  ],
  __init__: [
    'modeling',
    'componentUpdater',
    'portBehavior',
    'externalLabelBehavior',
    'portTypingBehavior',
    'reconnectBehavior'
  ],
  modeling: [ 'type', Modeling ],
  elementFactory: [ 'type', ElementFactory ],
  layouter: [ 'type', UmlLayouter ],
  componentUpdater: [ 'type', ComponentUpdater ],
  portBehavior: [ 'type', PortBehavior ],
  externalLabelBehavior: [ 'type', ExternalLabelBehavior ],
  portTypingBehavior: [ 'type', PortTypingBehavior ],
  reconnectBehavior: [ 'type', ReconnectBehavior ]
};
