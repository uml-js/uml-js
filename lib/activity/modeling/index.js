import BaseModelingModule from 'diagram-js/lib/features/modeling/index.js';
import LabelSupportModule from 'diagram-js/lib/features/label-support/index.js';
import AttachSupportModule from 'diagram-js/lib/features/attach-support/index.js';

import CoreModelingModule from '../../core/modeling/index.js';
import ActivityLayouter from '../layout/ActivityLayouter.js';

import Modeling from './Modeling.js';
import ElementFactory from './ElementFactory.js';
import ActivityUpdater from './ActivityUpdater.js';
import NodeTypeBehavior from './behavior/NodeTypeBehavior.js';
import CallBehaviorActionBehavior from './behavior/CallBehaviorActionBehavior.js';
import BorderNodeBehavior from './behavior/BorderNodeBehavior.js';
import ExternalLabelBehavior from './behavior/ExternalLabelBehavior.js';
import GroupBehavior from './behavior/GroupBehavior.js';

export default {
  __depends__: [
    BaseModelingModule,
    LabelSupportModule,
    AttachSupportModule,
    CoreModelingModule
  ],
  __init__: [
    'modeling',
    'activityUpdater',
    'nodeTypeBehavior',
    'callBehaviorActionBehavior',
    'borderNodeBehavior',
    'externalLabelBehavior',
    'groupBehavior'
  ],
  modeling: [ 'type', Modeling ],
  elementFactory: [ 'type', ElementFactory ],
  layouter: [ 'type', ActivityLayouter ],
  activityUpdater: [ 'type', ActivityUpdater ],
  nodeTypeBehavior: [ 'type', NodeTypeBehavior ],
  callBehaviorActionBehavior: [ 'type', CallBehaviorActionBehavior ],
  borderNodeBehavior: [ 'type', BorderNodeBehavior ],
  externalLabelBehavior: [ 'type', ExternalLabelBehavior ],
  groupBehavior: [ 'type', GroupBehavior ]
};
