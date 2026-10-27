import BaseModelingModule from 'diagram-js/lib/features/modeling/index.js';
import LabelSupportModule from 'diagram-js/lib/features/label-support/index.js';

import CoreModelingModule from '../../core/modeling/index.js';
import UmlLayouter from '../../core/layout/UmlLayouter.js';

import Modeling from './Modeling.js';
import ElementFactory from './ElementFactory.js';
import ClassUpdater from './ClassUpdater.js';
import EndLabelBehavior from './behavior/EndLabelBehavior.js';
import ClassifierResizeBehavior from './behavior/ClassifierResizeBehavior.js';
import DeleteClassifierBehavior from './behavior/DeleteClassifierBehavior.js';

export default {
  __depends__: [
    BaseModelingModule,
    LabelSupportModule,
    CoreModelingModule
  ],
  __init__: [
    'modeling',
    'classUpdater',
    'classifierResizeBehavior',
    'deleteClassifierBehavior'
  ],
  modeling: [ 'type', Modeling ],
  elementFactory: [ 'type', ElementFactory ],
  layouter: [ 'type', UmlLayouter ],
  classUpdater: [ 'type', ClassUpdater ],
  labelBehavior: [ 'type', EndLabelBehavior ],
  classifierResizeBehavior: [ 'type', ClassifierResizeBehavior ],
  deleteClassifierBehavior: [ 'type', DeleteClassifierBehavior ]
};
