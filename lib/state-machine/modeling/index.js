import BaseModelingModule from 'diagram-js/lib/features/modeling/index.js';
import LabelSupportModule from 'diagram-js/lib/features/label-support/index.js';

import CoreModelingModule from '../../core/modeling/index.js';

import Modeling from './Modeling.js';
import ElementFactory from './ElementFactory.js';
import StateMachineUpdater from './StateMachineUpdater.js';
import StateMachineLayouter from '../layout/StateMachineLayouter.js';
import ForkJoinBehavior from './behavior/ForkJoinBehavior.js';

export default {
  __depends__: [
    BaseModelingModule,
    LabelSupportModule,
    CoreModelingModule
  ],
  __init__: [
    'modeling',
    'stateMachineUpdater',
    'forkJoinBehavior'
  ],
  modeling: [ 'type', Modeling ],
  elementFactory: [ 'type', ElementFactory ],
  layouter: [ 'type', StateMachineLayouter ],
  stateMachineUpdater: [ 'type', StateMachineUpdater ],
  forkJoinBehavior: [ 'type', ForkJoinBehavior ]
};
