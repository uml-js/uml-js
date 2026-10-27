import AutoPlaceModule from 'diagram-js/lib/features/auto-place/index.js';

import UmlAutoPlace from './UmlAutoPlace.js';

export default {
  __depends__: [ AutoPlaceModule ],
  __init__: [ 'umlAutoPlace' ],
  umlAutoPlace: [ 'type', UmlAutoPlace ]
};
