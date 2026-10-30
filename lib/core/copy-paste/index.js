import CopyPasteModule from 'diagram-js/lib/features/copy-paste/index.js';

import CopyPasteRules from './CopyPasteRules.js';
import UmlCopyPaste from './UmlCopyPaste.js';

export default {
  __depends__: [
    CopyPasteModule
  ],
  __init__: [ 'copyPasteRules', 'umlCopyPaste' ],
  copyPasteRules: [ 'type', CopyPasteRules ],
  umlCopyPaste: [ 'type', UmlCopyPaste ]
};
