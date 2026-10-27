import KeyboardModule from 'diagram-js/lib/features/keyboard/index.js';
import EditorActionsModule from 'diagram-js/lib/features/editor-actions/index.js';
import HandToolModule from 'diagram-js/lib/features/hand-tool/index.js';
import LassoToolModule from 'diagram-js/lib/features/lasso-tool/index.js';
import GlobalConnectModule from 'diagram-js/lib/features/global-connect/index.js';
import DirectEditingModule from 'diagram-js-direct-editing';

import ReplaceMenuModule from '../popup-menu/index.js';

import UmlKeyboardBindings from './UmlKeyboardBindings.js';

export default {
  __depends__: [
    KeyboardModule,
    EditorActionsModule,
    HandToolModule,
    LassoToolModule,
    GlobalConnectModule,
    DirectEditingModule,
    ReplaceMenuModule
  ],
  __init__: [ 'umlKeyboardBindings' ],
  umlKeyboardBindings: [ 'type', UmlKeyboardBindings ]
};
