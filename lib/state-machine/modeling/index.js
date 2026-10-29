import BaseModelingModule from 'diagram-js/lib/features/modeling/index.js';
import LabelSupportModule from 'diagram-js/lib/features/label-support/index.js';
import AttachSupportModule from 'diagram-js/lib/features/attach-support/index.js';

import CoreModelingModule from '../../core/modeling/index.js';

import Modeling from './Modeling.js';
import ElementFactory from './ElementFactory.js';
import StateMachineUpdater from './StateMachineUpdater.js';
import StateMachineLayouter from '../layout/StateMachineLayouter.js';
import ForkJoinBehavior from './behavior/ForkJoinBehavior.js';
import CompartmentBehavior from './behavior/CompartmentBehavior.js';
import ConnectionPointBehavior from './behavior/ConnectionPointBehavior.js';
import ConnectionPointNameBehavior from './behavior/ConnectionPointNameBehavior.js';

export default {
  __depends__: [
    BaseModelingModule,
    LabelSupportModule,
    AttachSupportModule,
    CoreModelingModule
  ],
  __init__: [
    'modeling',
    'stateMachineUpdater',
    'forkJoinBehavior',
    'compartmentBehavior',
    'connectionPointBehavior',
    'connectionPointNameBehavior'
  ],
  modeling: [ 'type', Modeling ],
  elementFactory: [ 'type', ElementFactory ],
  layouter: [ 'type', StateMachineLayouter ],
  stateMachineUpdater: [ 'type', StateMachineUpdater ],
  forkJoinBehavior: [ 'type', ForkJoinBehavior ],
  compartmentBehavior: [ 'type', CompartmentBehavior ],
  connectionPointBehavior: [ 'type', ConnectionPointBehavior ],
  connectionPointNameBehavior: [ 'type', ConnectionPointNameBehavior ]
};
