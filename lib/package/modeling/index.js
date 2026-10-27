import BaseModelingModule from 'diagram-js/lib/features/modeling/index.js';

import CoreModelingModule from '../../core/modeling/index.js';
import UmlLayouter from '../../core/layout/UmlLayouter.js';

import Modeling from './Modeling.js';
import ElementFactory from './ElementFactory.js';
import PackageUpdater from './PackageUpdater.js';

export default {
  __depends__: [
    BaseModelingModule,
    CoreModelingModule
  ],
  __init__: [
    'modeling',
    'packageUpdater'
  ],
  modeling: [ 'type', Modeling ],
  elementFactory: [ 'type', ElementFactory ],
  layouter: [ 'type', UmlLayouter ],
  packageUpdater: [ 'type', PackageUpdater ]
};
