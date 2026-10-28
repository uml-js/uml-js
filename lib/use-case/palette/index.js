import PaletteModule from 'diagram-js/lib/features/palette/index.js';
import CreateModule from 'diagram-js/lib/features/create/index.js';
import HandToolModule from 'diagram-js/lib/features/hand-tool/index.js';
import LassoToolModule from 'diagram-js/lib/features/lasso-tool/index.js';

import UseCasePaletteProvider from './UseCasePaletteProvider.js';

export default {
  __depends__: [
    PaletteModule,
    CreateModule,
    HandToolModule,
    LassoToolModule
  ],
  __init__: [ 'useCasePaletteProvider' ],
  useCasePaletteProvider: [ 'type', UseCasePaletteProvider ]
};
