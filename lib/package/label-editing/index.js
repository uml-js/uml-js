import DirectEditingModule from 'diagram-js-direct-editing';
import ResizeModule from 'diagram-js/lib/features/resize/index.js';

import LabelEditingProvider from './LabelEditingProvider.js';

export default {
  __depends__: [
    DirectEditingModule,
    ResizeModule
  ],
  __init__: [ 'labelEditingProvider' ],
  labelEditingProvider: [ 'type', LabelEditingProvider ]
};
