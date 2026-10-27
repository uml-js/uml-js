import BaseModelingModule from 'diagram-js/lib/features/modeling/index.js';
import LabelSupportModule from 'diagram-js/lib/features/label-support/index.js';

import CoreModelingModule from '../../core/modeling/index.js';
import UseCaseLayouter from '../layout/UseCaseLayouter.js';

import Modeling from './Modeling.js';
import ElementFactory from './ElementFactory.js';
import UseCaseUpdater from './UseCaseUpdater.js';
import ActorLabelBehavior from './behavior/ActorLabelBehavior.js';
import SubjectBehavior from './behavior/SubjectBehavior.js';

export default {
  __depends__: [
    BaseModelingModule,
    LabelSupportModule,
    CoreModelingModule
  ],
  __init__: [
    'modeling',
    'useCaseUpdater',
    'actorLabelBehavior',
    'subjectBehavior'
  ],
  modeling: [ 'type', Modeling ],
  elementFactory: [ 'type', ElementFactory ],
  layouter: [ 'type', UseCaseLayouter ],
  useCaseUpdater: [ 'type', UseCaseUpdater ],
  actorLabelBehavior: [ 'type', ActorLabelBehavior ],
  subjectBehavior: [ 'type', SubjectBehavior ]
};
