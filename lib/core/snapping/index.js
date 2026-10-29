import ConnectSnapping from './ConnectSnapping.js';
import GridSnappingLayoutConnectionBehavior from './GridSnappingLayoutConnectionBehavior.js';

/**
 * Snapping of connections like in bpmn-js: new connections to the shapes they
 * connect, and their middle segments to the grid. Not for diagrams in which the
 * ends of connections are where they are drawn, like messages in sequence diagrams.
 */
export default {
  __init__: [
    'connectSnapping',
    'gridSnappingLayoutConnectionBehavior'
  ],
  connectSnapping: [ 'type', ConnectSnapping ],
  gridSnappingLayoutConnectionBehavior: [ 'type', GridSnappingLayoutConnectionBehavior ]
};
