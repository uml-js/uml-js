import DirectEditingModule from 'diagram-js-direct-editing';
import ContextPadModule from 'diagram-js/lib/features/context-pad/index.js';
import ConnectModule from 'diagram-js/lib/features/connect/index.js';
import CreateModule from 'diagram-js/lib/features/create/index.js';
import PaletteModule from 'diagram-js/lib/features/palette/index.js';
import RulesModule from 'diagram-js/lib/features/rules/index.js';

import AutoPlaceModule from '../auto-place/index.js';

import CommentContextPadProvider from './CommentContextPadProvider.js';
import CommentLabelEditingProvider from './CommentLabelEditingProvider.js';
import CommentPaletteProvider from './CommentPaletteProvider.js';
import CommentRules from './CommentRules.js';
import CommentUpdater from './CommentUpdater.js';

/**
 * Modeling of notes (UML comments) in all diagram types.
 */
export default {
  __depends__: [
    DirectEditingModule,
    ContextPadModule,
    ConnectModule,
    CreateModule,
    PaletteModule,
    RulesModule,
    AutoPlaceModule
  ],
  __init__: [
    'commentUpdater',
    'commentRules',
    'commentPaletteProvider',
    'commentContextPadProvider',
    'commentLabelEditingProvider'
  ],
  commentUpdater: [ 'type', CommentUpdater ],
  commentRules: [ 'type', CommentRules ],
  commentPaletteProvider: [ 'type', CommentPaletteProvider ],
  commentContextPadProvider: [ 'type', CommentContextPadProvider ],
  commentLabelEditingProvider: [ 'type', CommentLabelEditingProvider ]
};
