/**
 * Hovering the label of a shape while connecting, or while moving the end of a
 * connection, is hovering the shape: external labels, e.g. of entry and exit points,
 * often lie on or next to their shape and would catch the end of the connection.
 */
export default function LabelHoverBehavior(eventBus, elementRegistry) {

  eventBus.on([
    'connect.hover',
    'connect.out',
    'connect.end',
    'connect.cleanup',
    'global-connect.hover',
    'global-connect.out',
    'global-connect.end',
    'global-connect.cleanup',
    'bendpoint.move.hover',
    'bendpoint.move.out',
    'bendpoint.move.end',
    'bendpoint.move.cleanup'
  ], HIGH_PRIORITY, function(event) {
    const hover = event.hover;
    const target = hover && hover.labelTarget;

    if (target && !target.waypoints) {
      event.hover = target;
      event.hoverGfx = elementRegistry.getGraphics(target);
    }
  });
}

const HIGH_PRIORITY = 1500;

LabelHoverBehavior.$inject = [ 'eventBus', 'elementRegistry' ];
