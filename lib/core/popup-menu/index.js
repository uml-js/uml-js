import PopupMenuModule from 'diagram-js/lib/features/popup-menu/index.js';
import ContextPadModule from 'diagram-js/lib/features/context-pad/index.js';

import ReplaceMenu from './ReplaceMenu.js';

export default {
  __depends__: [
    PopupMenuModule,
    ContextPadModule
  ],
  replaceMenu: [ 'type', ReplaceMenu ]
};
