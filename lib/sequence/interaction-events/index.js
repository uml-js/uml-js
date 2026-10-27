import InteractionEventsModule from 'diagram-js/lib/features/interaction-events/index.js';

import FrameInteractionEvents from './FrameInteractionEvents.js';

export default {
  __depends__: [ InteractionEventsModule ],
  __init__: [ 'frameInteractionEvents' ],
  frameInteractionEvents: [ 'type', FrameInteractionEvents ]
};
