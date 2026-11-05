import InteractionEventsModule from 'diagram-js/lib/features/interaction-events/index.js';

import GroupInteractionEvents from './GroupInteractionEvents.js';

export default {
  __depends__: [ InteractionEventsModule ],
  __init__: [ 'groupInteractionEvents' ],
  groupInteractionEvents: [ 'type', GroupInteractionEvents ]
};
