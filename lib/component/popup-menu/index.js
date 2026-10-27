import ReplaceMenuModule from '../../core/popup-menu/index.js';

import ReplaceMenuProvider from './ReplaceMenuProvider.js';

export default {
  __depends__: [ ReplaceMenuModule ],
  __init__: [ 'replaceMenuProvider' ],
  replaceMenuProvider: [ 'type', ReplaceMenuProvider ]
};
