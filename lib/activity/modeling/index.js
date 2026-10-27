import BaseModelingModule from 'diagram-js/lib/features/modeling/index.js';
import LabelSupportModule from 'diagram-js/lib/features/label-support/index.js';

import CoreModelingModule from '../../core/modeling/index.js';
import UmlLayouter from '../../core/layout/UmlLayouter.js';

import Modeling from './Modeling.js';
import ElementFactory from './ElementFactory.js';
import ActivityUpdater from './ActivityUpdater.js';
import NodeTypeBehavior from './behavior/NodeTypeBehavior.js';

export default {
  __depends__: [
    BaseModelingModule,
    LabelSupportModule,
    CoreModelingModule
  ],
  __init__: [
    'modeling',
    'activityUpdater',
    'nodeTypeBehavior'
  ],
  modeling: [ 'type', Modeling ],
  elementFactory: [ 'type', ElementFactory ],
  layouter: [ 'type', UmlLayouter ],
  activityUpdater: [ 'type', ActivityUpdater ],
  nodeTypeBehavior: [ 'type', NodeTypeBehavior ]
};
