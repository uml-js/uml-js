import { PARTITION_HEADER_SIZE, isGroup, isHorizontal, isPartition } from '../util/ElementUtil.js';

const LOW_PRIORITY = 500;


/**
 * Partitions and interruptible regions are hit at their border, partitions also
 * at their header, so that the nodes and flows they group can be clicked and
 * nodes can be drawn within them.
 *
 * As bpmn-js does for groups (https://github.com/bpmn-io/bpmn-js).
 */
export default function GroupInteractionEvents(eventBus, interactionEvents) {

  eventBus.on([ 'shape.added', 'shape.changed' ], LOW_PRIORITY, function(event) {
    const { element, gfx } = event;

    if (!isGroup(element)) {
      return;
    }

    interactionEvents.removeHits(gfx);

    interactionEvents.createBoxHit(gfx, 'stroke', {
      width: element.width,
      height: element.height
    });

    if (isPartition(element)) {
      const horizontal = isHorizontal(element);

      interactionEvents.createBoxHit(gfx, 'all', {
        width: horizontal ? PARTITION_HEADER_SIZE : element.width,
        height: horizontal ? element.height : PARTITION_HEADER_SIZE
      });
    }
  });
}

GroupInteractionEvents.$inject = [
  'eventBus',
  'interactionEvents'
];
