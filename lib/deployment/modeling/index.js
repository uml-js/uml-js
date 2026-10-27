import BaseModelingModule from 'diagram-js/lib/features/modeling/index.js';

import CoreModelingModule from '../../core/modeling/index.js';
import UmlLayouter from '../../core/layout/UmlLayouter.js';

import Modeling from './Modeling.js';
import ElementFactory from './ElementFactory.js';
import DeploymentUpdater from './DeploymentUpdater.js';

export default {
  __depends__: [
    BaseModelingModule,
    CoreModelingModule
  ],
  __init__: [
    'modeling',
    'deploymentUpdater'
  ],
  modeling: [ 'type', Modeling ],
  elementFactory: [ 'type', ElementFactory ],
  layouter: [ 'type', UmlLayouter ],
  deploymentUpdater: [ 'type', DeploymentUpdater ]
};
