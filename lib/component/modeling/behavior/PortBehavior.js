import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { isSnapped, setSnapped } from 'diagram-js/lib/features/snapping/SnapUtil.js';

import { getMid } from 'diagram-js/lib/layout/LayoutUtil.js';

import { getAttachTarget, isPort } from '../../util/ElementUtil.js';

import { getBorderSide } from '../../util/LabelUtil.js';

const HIGH_PRIORITY = 1500;
const LOW_PRIORITY = 500;

const APPEND_DISTANCE = 70;

const DIRECTIONS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 }
};


/**
 * Places ports on the border of their component: snaps them while creating
 * and moving, so they slide along the border (and around its corners).
 * Elements appended to ports are placed outside the component.
 *
 * Snapping follows how bpmn-js snaps boundary events (https://github.com/bpmn-io/bpmn-js).
 */
export default function PortBehavior(eventBus, modeling) {

  CommandInterceptor.call(this, eventBus);

  eventBus.on([
    'create.move',
    'create.end',
    'shape.move.move',
    'shape.move.end'
  ], HIGH_PRIORITY, function(event) {
    const context = event.context;

    const shape = context.shape;
    const target = event.hover && getAttachTarget(event.hover);

    if (!isPort(shape) || !target || (context.shapes && context.shapes.length !== 1)) {
      return;
    }

    if (isSnapped(event)) {
      return;
    }

    const snapped = snapToBorder(event, target);

    setSnapped(event, 'x', snapped.x);
    setSnapped(event, 'y', snapped.y);
  });

  // elements appended to a port are placed outside its component
  eventBus.on('autoPlace', HIGH_PRIORITY, function(context) {
    const { source, shape } = context;

    if (!isPort(source) || !source.host) {
      return;
    }

    const mid = getMid(source);
    const direction = DIRECTIONS[getBorderSide(mid, source.host)];

    return {
      x: mid.x + direction.x * (APPEND_DISTANCE + shape.width / 2),
      y: mid.y + direction.y * (APPEND_DISTANCE + shape.height / 2)
    };
  });

  // attach to the component, also when dropped on its ports or their labels
  eventBus.on([ 'create.end', 'shape.move.end' ], HIGH_PRIORITY, function(event) {
    const context = event.context;

    if (isPort(context.shape) && context.target && (!context.shapes || context.shapes.length === 1)) {
      context.target = getAttachTarget(context.target) || context.target;
    }
  });

  this.postExecuted([ 'elements.move', 'shape.create' ], LOW_PRIORITY, function(event) {
    const context = event.context;
    const shapes = context.shapes || [ context.shape ];

    shapes.filter(shape => isPort(shape) && shape.host).forEach(port => {
      const mid = getMid(port);
      const snapped = snapToBorder(mid, port.host);

      const delta = {
        x: snapped.x - mid.x,
        y: snapped.y - mid.y
      };

      if (delta.x || delta.y) {
        modeling.moveShape(port, delta);

        port.labels.forEach(label => modeling.moveShape(label, delta));
      }
    });
  });
}

inherits(PortBehavior, CommandInterceptor);

PortBehavior.$inject = [
  'eventBus',
  'modeling'
];


/**
 * The point on the border of a shape closest to the given point.
 *
 * @param {Point} point
 * @param {Bounds} shape
 *
 * @return {Point}
 */
export function snapToBorder(point, shape) {
  const left = shape.x, right = shape.x + shape.width;
  const top = shape.y, bottom = shape.y + shape.height;

  const x = Math.min(Math.max(point.x, left), right);
  const y = Math.min(Math.max(point.y, top), bottom);

  const distances = [
    { x: left, y, distance: Math.abs(point.x - left) },
    { x: right, y, distance: Math.abs(point.x - right) },
    { x, y: top, distance: Math.abs(point.y - top) },
    { x, y: bottom, distance: Math.abs(point.y - bottom) }
  ];

  const { x: snappedX, y: snappedY } = distances.reduce((a, b) => a.distance <= b.distance ? a : b);

  return {
    x: Math.round(snappedX),
    y: Math.round(snappedY)
  };
}
