import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { isSnapped, setSnapped } from 'diagram-js/lib/features/snapping/SnapUtil.js';

import { getMid } from 'diagram-js/lib/layout/LayoutUtil.js';

import { getBorderSide, snapToBorder } from '../../../core/util/GeometryUtil.js';

import {
  EXPANSION_NODE_LENGTH,
  PIN_SIZE,
  isBorderNode,
  isExpansionNode
} from '../../util/ElementUtil.js';

import { getAttachTarget } from '../../rules/ActivityRules.js';

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
 * Places pins and expansion nodes on the border of their node: snaps them while
 * creating and moving, so they slide along the border (and around its corners),
 * also when moved with the keyboard. Expansion nodes lie along the border.
 *
 * Expansion nodes created on the bottom or right of their expansion region are
 * outputs, others inputs. Nodes appended to pins and expansion nodes are placed
 * outside the node they are attached to.
 *
 * Snapping follows how bpmn-js snaps boundary events (https://github.com/bpmn-io/bpmn-js).
 */
export default function BorderNodeBehavior(eventBus, modeling) {

  CommandInterceptor.call(this, eventBus);

  eventBus.on([
    'create.move',
    'create.end',
    'shape.move.move',
    'shape.move.end'
  ], HIGH_PRIORITY, function(event) {
    const context = event.context;

    const shape = context.shape;
    const target = event.hover && getAttachTarget(shape, event.hover);

    if (!isBorderNode(shape) || !target || (context.shapes && context.shapes.length !== 1)) {
      return;
    }

    if (isSnapped(event)) {
      return;
    }

    const snapped = snapToBorder(event, target);

    setSnapped(event, 'x', snapped.x);
    setSnapped(event, 'y', snapped.y);
  });

  // nodes appended to a pin or an expansion node are placed outside its node
  eventBus.on('autoPlace', HIGH_PRIORITY, function(context) {
    const { source, shape } = context;

    if (!isBorderNode(source) || !source.host) {
      return;
    }

    const mid = getMid(source);
    const direction = DIRECTIONS[getBorderSide(mid, source.host)];

    return {
      x: mid.x + direction.x * (APPEND_DISTANCE + shape.width / 2),
      y: mid.y + direction.y * (APPEND_DISTANCE + shape.height / 2)
    };
  });

  // attach to the node, also when dropped on its pins, expansion nodes or their labels
  eventBus.on([ 'create.end', 'shape.move.end' ], HIGH_PRIORITY, function(event) {
    const context = event.context;

    if (isBorderNode(context.shape) && context.target && (!context.shapes || context.shapes.length === 1)) {
      context.target = getAttachTarget(context.shape, context.target) || context.target;
    }
  });

  // expansion nodes created at the bottom or right of their region are outputs
  this.preExecute('shape.create', function(event) {
    const { shape, host, position } = event.context;

    if (!isExpansionNode(shape) || !host || shape.businessObject.regionAsInput || shape.businessObject.regionAsOutput) {
      return;
    }

    const side = getBorderSide(position, host);

    if (side === 'bottom' || side === 'right') {
      shape.businessObject.set('regionAsOutput', host.businessObject);
    }
  });

  // stay attached when moved without a target, e.g. with the keyboard, or when the move
  // ends over no element, e.g. over the shape itself, which drops the attachment
  this.preExecute('elements.move', function(event) {
    const context = event.context;
    const shape = context.shapes.length === 1 && context.shapes[0];

    if (isBorderNode(shape) && shape.host && !context.newHost) {
      context.newHost = shape.host;
    }
  });

  this.postExecuted([ 'elements.move', 'shape.create' ], LOW_PRIORITY, function(event) {
    const context = event.context;
    const shapes = context.shapes || [ context.shape ];

    shapes.filter(shape => isBorderNode(shape) && shape.host).forEach(node => {
      const mid = getMid(node);
      const snapped = snapToBorder(mid, node.host);

      const delta = {
        x: snapped.x - mid.x,
        y: snapped.y - mid.y
      };

      if (delta.x || delta.y) {
        modeling.moveShape(node, delta);

        node.labels.forEach(label => modeling.moveShape(label, delta));
      }

      if (isExpansionNode(node)) {
        orient(node);
      }
    });
  });

  /**
   * Expansion nodes lie along the border of their region.
   */
  function orient(node) {
    const side = getBorderSide(getMid(node), node.host);
    const along = side === 'top' || side === 'bottom';

    const width = along ? EXPANSION_NODE_LENGTH : PIN_SIZE;
    const height = along ? PIN_SIZE : EXPANSION_NODE_LENGTH;

    if (node.width === width && node.height === height) {
      return;
    }

    const mid = getMid(node);

    modeling.resizeShape(node, {
      x: Math.round(mid.x - width / 2),
      y: Math.round(mid.y - height / 2),
      width,
      height
    });
  }
}

inherits(BorderNodeBehavior, CommandInterceptor);

BorderNodeBehavior.$inject = [
  'eventBus',
  'modeling'
];
