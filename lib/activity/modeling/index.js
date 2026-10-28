import BaseModelingModule from 'diagram-js/lib/features/modeling/index.js';
import LabelSupportModule from 'diagram-js/lib/features/label-support/index.js';

import CoreModelingModule from '../../core/modeling/index.js';
import ActivityLayouter from '../layout/ActivityLayouter.js';

import Modeling from './Modeling.js';
import ElementFactory from './ElementFactory.js';
import ActivityUpdater from './ActivityUpdater.js';
import NodeTypeBehavior from './behavior/NodeTypeBehavior.js';
import CallBehaviorActionBehavior from './behavior/CallBehaviorActionBehavior.js';

export default {
  __depends__: [
    BaseModelingModule,
    LabelSupportModule,
    CoreModelingModule
  ],
  __init__: [
    'modeling',
    'activityUpdater',
    'nodeTypeBehavior',
    'callBehaviorActionBehavior'
  ],
  modeling: [ 'type', Modeling ],
  elementFactory: [ 'type', ElementFactory ],
  layouter: [ 'type', ActivityLayouter ],
  activityUpdater: [ 'type', ActivityUpdater ],
  nodeTypeBehavior: [ 'type', NodeTypeBehavior ],
  callBehaviorActionBehavior: [ 'type', CallBehaviorActionBehavior ]
};
