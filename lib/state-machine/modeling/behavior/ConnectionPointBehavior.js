import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { isSnapped, setSnapped } from 'diagram-js/lib/features/snapping/SnapUtil.js';

import { getMid } from 'diagram-js/lib/layout/LayoutUtil.js';

import { getBorderSide, getShapeLabelBounds, snapToBorder } from '../../../core/util/GeometryUtil.js';

import {
  getAttachTarget,
  getConnectionPointKind,
  getSubmachineTarget,
  hasExternalLabel,
  isBorderVertex,
  isConnectionPoint,
  NAME_COMPARTMENT_HEIGHT
} from '../../util/ElementUtil.js';

import { updateExternalLabel } from '../cmd/UpdateLabelHandler.js';

const HIGHER_PRIORITY = 2000;
const HIGH_PRIORITY = 1500;
const LOW_PRIORITY = 500;

const APPEND_DISTANCE = 70;

// searching for space for appended elements
const FREE_SPACE = 10;
const SEARCH_STEP = 20;
const MAX_SEARCH_DISTANCE = 400;

const DIRECTIONS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 }
};


/**
 * Places entry and exit points and connection point references on the border
 * of the state they are attached to: snaps them while creating and moving, so
 * they slide along the border, like ports of components, also when moved with
 * the keyboard. Named ones get their
 * external label when created, placed outside the state again when they move
 * to another side of it. Entry and exit points dropped on a submachine state are
 * added to the state machine it refers to, with a reference on its border.
 *
 * Elements appended to an entry point of a composite state are placed inside the
 * state, those appended to its exit points or to connection point references outside.
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

    const creating = event.type.startsWith('create');

    const target = event.hover && (getAttachTarget(shape, event.hover) || (creating && getSubmachineTarget(shape, event.hover)));

    if (!target || isSnapped(event)) {
      return;
    }

    const snapped = snapToBorder(event, target);

    setSnapped(event, 'x', snapped.x);
    setSnapped(event, 'y', snapped.y);
  });

  // add to the state machine of a submachine state, instead of creating the point in this
  // diagram, once creating is done
  eventBus.on('create.end', HIGHER_PRIORITY, function(event) {
    const context = event.context;
    const state = context.canExecute && getSubmachineTarget(context.shape, event.hover);

    if (!state) {
      return;
    }

    context.submachineState = state;
    context.submachinePosition = { x: event.x, y: event.y };

    return false;
  });

  eventBus.on('create.cleanup', function(event) {
    const context = event.context;
    const { shape, submachineState, submachinePosition } = context;

    if (!submachineState) {
      return;
    }

    context.submachineState = null;

    // dragging is not done cleaning up yet
    setTimeout(() => modeling.addConnectionPoint(submachineState, getConnectionPointKind(shape), submachinePosition));
  });

  eventBus.on('autoPlace', HIGH_PRIORITY, function(context) {
    const { source, shape } = context;

    if (!isBorderVertex(source) || !source.host) {
      return;
    }

    const mid = getMid(source);
    const side = DIRECTIONS[getBorderSide(mid, source.host)];

    const direction = isInward(source) ? -1 : 1;

    const position = {
      x: mid.x + direction * side.x * (APPEND_DISTANCE + shape.width / 2),
      y: mid.y + direction * side.y * (APPEND_DISTANCE + shape.height / 2)
    };

    const parent = isInward(source) ? source.host : source.parent;

    return findFreePosition(position, shape, parent, { x: side.y, y: side.x });
  });

  this.preExecute('shape.append', HIGH_PRIORITY, function(event) {
    const context = event.context;

    if (isInward(context.source)) {
      context.target = context.source.host;
    }
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

    // stay attached when moved without a target, e.g. with the keyboard
    const shape = context.shapes.length === 1 && context.shapes[0];

    if (isBorderVertex(shape) && shape.host && context.newHost === undefined) {
      context.newHost = shape.host;
    }

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


/**
 * A position for a shape among the children of a parent, moving along the given direction,
 * then the opposite one, until it overlaps none of them, inside the parent if it is a state.
 *
 * @param {Point} position the preferred position of the center of the shape
 * @param {Dimensions} shape
 * @param {Shape} parent
 * @param {Point} step the direction to move in, along the border
 *
 * @return {Point}
 */
function findFreePosition(position, shape, parent, step) {
  const children = parent.children.filter(child => !child.labelTarget && !child.waypoints);

  // inside a state, below its name
  const fits = ({ x, y }) => !parent.parent || (
    x - shape.width / 2 >= parent.x && x + shape.width / 2 <= parent.x + parent.width &&
    y - shape.height / 2 >= parent.y + NAME_COMPARTMENT_HEIGHT && y + shape.height / 2 <= parent.y + parent.height
  );

  const overlaps = ({ x, y }) => children.some(child => {
    return x - shape.width / 2 - FREE_SPACE < child.x + child.width && x + shape.width / 2 + FREE_SPACE > child.x &&
      y - shape.height / 2 - FREE_SPACE < child.y + child.height && y + shape.height / 2 + FREE_SPACE > child.y;
  });

  for (let distance = 0; distance <= MAX_SEARCH_DISTANCE; distance += SEARCH_STEP) {
    for (const sign of distance ? [ 1, -1 ] : [ 1 ]) {
      const candidate = {
        x: position.x + sign * step.x * distance,
        y: position.y + sign * step.y * distance
      };

      if (fits(candidate) && !overlaps(candidate)) {
        return candidate;
      }
    }
  }

  return position;
}

/**
 * Whether transitions from a vertex lead into the state it is attached to: from entry points of composite states.
 */
function isInward(vertex) {
  return isConnectionPoint(vertex) && !!vertex.host && getConnectionPointKind(vertex) === 'entryPoint';
}

ConnectionPointBehavior.$inject = [
  'eventBus',
  'modeling',
  'textRenderer',
  'umlFactory'
];
