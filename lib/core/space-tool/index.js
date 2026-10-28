import SpaceToolModule from 'diagram-js/lib/features/space-tool/index.js';

import SpaceToolPaletteProvider from './SpaceToolPaletteProvider.js';

/**
 * The space tool of diagram-js in the palettes of all diagram types.
 */
export default {
  __depends__: [ SpaceToolModule ],
  __init__: [ 'spaceToolPaletteProvider' ],
  spaceToolPaletteProvider: [ 'type', SpaceToolPaletteProvider ]
};
