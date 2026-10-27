import BaseModelingModule from 'diagram-js/lib/features/modeling/index.js';
import LabelSupportModule from 'diagram-js/lib/features/label-support/index.js';

import CoreModelingModule from '../../core/modeling/index.js';

import Modeling from './Modeling.js';
import ElementFactory from './ElementFactory.js';
import MessageLayouter from './MessageLayouter.js';
import SequenceUpdater from './SequenceUpdater.js';
import MessageBehavior from './behavior/MessageBehavior.js';
import ExecutionBehavior from './behavior/ExecutionBehavior.js';
import CombinedFragmentBehavior from './behavior/CombinedFragmentBehavior.js';

export default {
  __depends__: [
    BaseModelingModule,
    LabelSupportModule,
    CoreModelingModule
  ],
  __init__: [
    'modeling',
    'sequenceUpdater',
    'messageBehavior',
    'executionBehavior',
    'combinedFragmentBehavior'
  ],
  modeling: [ 'type', Modeling ],
  elementFactory: [ 'type', ElementFactory ],
  layouter: [ 'type', MessageLayouter ],
  sequenceUpdater: [ 'type', SequenceUpdater ],
  messageBehavior: [ 'type', MessageBehavior ],
  executionBehavior: [ 'type', ExecutionBehavior ],
  combinedFragmentBehavior: [ 'type', CombinedFragmentBehavior ]
};
