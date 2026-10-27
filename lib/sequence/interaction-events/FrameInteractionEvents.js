import { OPERATOR_TAB_HEIGHT, isCombinedFragment, isOperand } from '../util/ElementUtil.js';

const LOW_PRIORITY = 500;


/**
 * Frames of combined fragments and their operands are hit at their border
 * and their top (operator tab, guard) only, so that the lifelines and
 * messages inside them can be clicked.
 *
 * As bpmn-js does for groups (https://github.com/bpmn-io/bpmn-js).
 */
export default function FrameInteractionEvents(eventBus, interactionEvents) {

  eventBus.on([ 'shape.added', 'shape.changed' ], LOW_PRIORITY, function(event) {
    const { element, gfx } = event;

    if (!isCombinedFragment(element) && !isOperand(element)) {
      return;
    }

    interactionEvents.removeHits(gfx);

    interactionEvents.createBoxHit(gfx, 'stroke', {
      width: element.width,
      height: element.height
    });

    interactionEvents.createBoxHit(gfx, 'all', {
      width: Math.min(element.width, 120),
      height: OPERATOR_TAB_HEIGHT
    });
  });
}

FrameInteractionEvents.$inject = [
  'eventBus',
  'interactionEvents'
];
