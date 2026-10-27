import { isClassifier } from '../../util/ElementUtil.js';

import { getContentWidth } from '../../util/CompartmentUtil.js';

const HIGH_PRIORITY = 1500;


/**
 * The height of classifier boxes follows their members, so that resizing
 * changes their width only, down to the width of the widest member.
 */
export default function ClassifierResizeBehavior(eventBus, textRenderer) {

  eventBus.on('resize.start', HIGH_PRIORITY, function(event) {
    const context = event.context,
          shape = context.shape;

    if (!isClassifier(shape)) {
      return;
    }

    const top = shape.y,
          left = shape.x,
          bottom = shape.y + shape.height,
          right = shape.x + shape.width;

    const minWidth = getContentWidth(shape.businessObject, textRenderer);

    // a fixed side has the same min and max
    context.resizeConstraints = {
      min: { top, bottom, left: right - minWidth, right: left + minWidth },
      max: { top, bottom }
    };
  });
}

ClassifierResizeBehavior.$inject = [ 'eventBus', 'textRenderer' ];
