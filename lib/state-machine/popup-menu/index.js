import ReplaceMenuModule from '../../core/popup-menu/index.js';

import ReplaceModule from '../replace/index.js';

import ReplaceMenuProvider from './ReplaceMenuProvider.js';
import ConnectionPointReferenceMenu from './ConnectionPointReferenceMenu.js';

export default {
  __depends__: [
    ReplaceMenuModule,
    ReplaceModule
  ],
  __init__: [ 'replaceMenuProvider', 'connectionPointReferenceMenu' ],
  replaceMenuProvider: [ 'type', ReplaceMenuProvider ],
  connectionPointReferenceMenu: [ 'type', ConnectionPointReferenceMenu ]
};
