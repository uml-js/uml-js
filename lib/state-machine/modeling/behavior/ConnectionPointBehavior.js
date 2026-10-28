import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { isSnapped, setSnapped } from 'diagram-js/lib/features/snapping/SnapUtil.js';

import { getMid } from 'diagram-js/lib/layout/LayoutUtil.js';

import { getBorderSide, getShapeLabelBounds, snapToBorder } from '../../../core/util/GeometryUtil.js';

import { getAttachTarget, hasExternalLabel, isBorderVertex } from '../../util/ElementUtil.js';

import { updateExternalLabel } from '../cmd/UpdateLabelHandler.js';

const HIGH_PRIORITY = 1500;
const LOW_PRIORITY = 500;


/**
 * Places entry and exit points and connection point references on the border
 * of the state they are attached to: snaps them while creating and moving, so
 * they slide along the border, like ports of components. Named ones get their
 * external label when created, placed outside the state again when they move
 * to another side of it.
 */
export default function ConnectionPointBehavior(eventBus, modeling, textRenderer, umlFactory) {

  CommandInterceptor.call(this, eventBus);

  eventBus.on([
    'create.move',
    'create.end',
    'shape.move.move',
    'shape.move.end'
  ], HIGH_PRIORITY, function(event) {
    const context = event.context;

    const shape = context.shape;

    if (!isBorderVertex(shape) || (context.shapes && context.shapes.length !== 1)) {
      return;
    }

    const target = event.hover && getAttachTarget(shape, event.hover);

    if (!target || isSnapped(event)) {
      return;
    }

    const snapped = snapToBorder(event, target);

    setSnapped(event, 'x', snapped.x);
    setSnapped(event, 'y', snapped.y);
  });

  // attach to the state, also when dropped on its points or their labels
  eventBus.on([ 'create.end', 'shape.move.end' ], HIGH_PRIORITY, function(event) {
    const context = event.context;
    const shape = context.shape;

    if (isBorderVertex(shape) && context.target && (!context.shapes || context.shapes.length === 1)) {
      context.target = getAttachTarget(shape, context.target) || context.target;
    }
  });

  // the side of the state a moved point was on
  this.preExecute('elements.move', function(event) {
    const context = event.context;

    context.oldSides = new Map(context.shapes.filter(shape => isBorderVertex(shape) && shape.host).map(shape => {
      return [ shape, getBorderSide(getMid(shape), shape.host) ];
    }));
  });

  this.postExecuted([ 'elements.move', 'shape.create' ], LOW_PRIORITY, function(event) {
    const context = event.context;
    const shapes = context.shapes || [ context.shape ];

    shapes.filter(shape => isBorderVertex(shape) && shape.host).forEach(shape => {
      const mid = getMid(shape);
      const snapped = snapToBorder(mid, shape.host);

      const delta = {
        x: snapped.x - mid.x,
        y: snapped.y - mid.y
      };

      if (delta.x || delta.y) {
        modeling.moveShape(shape, delta);

        shape.labels.forEach(label => modeling.moveShape(label, delta));
      }

      // moved along with its state, or along its side
      const oldSide = context.oldSides && context.oldSides.get(shape);

      if (!oldSide || shapes.includes(shape.host) || oldSide === getBorderSide(getMid(shape), shape.host)) {
        return;
      }

      shape.labels.forEach(label => {
        const bounds = getShapeLabelBounds(shape, label);

        modeling.moveShape(label, { x: bounds.x - label.x, y: bounds.y - label.y });
      });
    });
  });

  this.postExecuted('shape.create', function(event) {
    const shape = event.context.shape;

    if (hasExternalLabel(shape) && !shape.labels.length) {
      updateExternalLabel(shape, modeling, textRenderer, umlFactory);
    }
  });
}

inherits(ConnectionPointBehavior, CommandInterceptor);

ConnectionPointBehavior.$inject = [
  'eventBus',
  'modeling',
  'textRenderer',
  'umlFactory'
];
