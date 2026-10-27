const MIN_LENGTH = 30;

const HIGH_PRIORITY = 1500;


/**
 * Resizing bars (fork / join) changes their length only, never their thickness.
 *
 * @param {EventBus} eventBus
 * @param {(element: Element) => boolean} isBar
 */
export function constrainBarResize(eventBus, isBar) {

  eventBus.on('resize.start', HIGH_PRIORITY, function(event) {
    const context = event.context,
          shape = context.shape;

    if (!isBar(shape)) {
      return;
    }

    const top = shape.y,
          left = shape.x,
          bottom = shape.y + shape.height,
          right = shape.x + shape.width;

    // a fixed side has the same min and max
    context.resizeConstraints = shape.width >= shape.height ? {
      min: { top, bottom, left: right - MIN_LENGTH, right: left + MIN_LENGTH },
      max: { top, bottom }
    } : {
      min: { left, right, top: bottom - MIN_LENGTH, bottom: top + MIN_LENGTH },
      max: { left, right }
    };
  });
}
