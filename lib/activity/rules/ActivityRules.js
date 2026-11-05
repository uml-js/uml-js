import inherits from 'inherits-browser';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';

import { is, isLabel } from '../../core/util/ModelUtil.js';

import {
  isAction,
  isActivityNode,
  isBorderNode,
  isExpansionNode,
  isExpansionRegion,
  isForkOrJoin,
  isGroup,
  isInput,
  isObjectNode,
  isPin,
  isStructured
} from '../util/ElementUtil.js';

/**
 * Maximum distance from the border of a node to attach a pin or an expansion node.
 */
const ATTACH_DISTANCE = 20;


/**
 * Modeling rules for activity diagrams: nodes are drawn on the activity or
 * inside structured activity nodes, pins attached to actions and expansion
 * nodes to expansion regions, partitions and interruptible regions on the
 * activity. Nodes are connected by object flows where an object node is
 * involved, by control flows otherwise.
 */
export default function ActivityRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(ActivityRules, RuleProvider);

ActivityRules.$inject = [ 'eventBus' ];

ActivityRules.prototype.init = function() {

  this.addRule('shape.create', function(context) {
    const { shape, target } = context;

    return target && target.waypoints ? canInsert(shape, target) : canCreate(shape, target);
  });

  this.addRule('shape.attach', function(context) {
    return canAttach(context.shape, getAttachTarget(context.shape, context.target), context.position);
  });

  // nodes dropped on a control flow are inserted into it
  this.addRule('shape.insert', function(context) {
    return canInsert(context.shape, context.connection);
  });

  // pins and expansion nodes are pasted with their node
  this.addRule('elements.create', function(context) {
    const { elements, target } = context;

    if (target && target.waypoints) {
      return elements.length === 1 && canInsert(elements[0], target);
    }

    return elements.every(element => {
      return element.waypoints || (element.host && elements.includes(element.host)) || canCreate(element, target);
    });
  });

  this.addRule('elements.move', function(context) {
    const { shapes, target, position } = context;

    // pins and expansion nodes are moved along the border, or to another node
    if (shapes.length === 1 && isBorderNode(shapes[0])) {

      // move start
      if (!target) {
        return true;
      }

      return canAttach(shapes[0], getAttachTarget(shapes[0], target), position) ? 'attach' : false;
    }

    if (target && target.waypoints) {
      return shapes.length === 1 && canInsert(shapes[0], target);
    }

    return shapes.every(shape => {
      if (isLabel(shape)) {
        return true;
      }

      if (isBorderNode(shape)) {
        return !!shape.host && shapes.includes(shape.host);
      }

      if (isGroup(shape)) {
        return !target || !target.parent;
      }

      return !target || canContain(target);
    });
  });

  this.addRule('connection.create', function(context) {
    return canConnect(context.source, context.target);
  });

  this.addRule('connection.reconnect', function(context) {
    const { connection, source, target } = context;

    const allowed = canConnect(source, target);

    // the kind of flow stays
    return !!allowed && allowed.type === connection.type;
  });

  this.addRule('shape.resize', function(context) {
    const shape = context.shape;

    return is(shape, 'uml:Action') || isForkOrJoin(shape) || isGroup(shape) || (isObjectNode(shape) && !isBorderNode(shape));
  });
};

export function canCreate(shape, target) {
  if (isLabel(shape)) {
    return true;
  }

  // attached only
  if (isBorderNode(shape)) {
    return false;
  }

  // on the activity
  if (isGroup(shape)) {
    return !!target && !target.parent;
  }

  return isActivityNode(shape) && canContain(target);
}

/**
 * A node may be inserted into a control flow, splitting it, if it may be drawn where
 * the control flow is, and is neither of its ends.
 */
export function canInsert(shape, connection) {
  if (!is(connection, 'uml:ControlFlow') || isLabel(connection)) {
    return false;
  }

  if (connection.source === shape || connection.target === shape) {
    return false;
  }

  return isActivityNode(shape) && !isObjectNode(shape) && canContain(connection.parent);
}

/**
 * Nodes are shown on the activity (root) or inside structured activity nodes.
 */
export function canContain(target) {
  return !!target && (!target.parent || isStructured(target));
}

/**
 * Pins attach to actions, expansion nodes to expansion regions, near their border.
 */
export function canAttach(shape, target, position) {
  if (!target || !position) {
    return false;
  }

  if (isPin(shape) ? !isAction(target) : !(isExpansionNode(shape) && isExpansionRegion(target))) {
    return false;
  }

  const distance = Math.min(
    Math.abs(position.x - target.x),
    Math.abs(position.x - (target.x + target.width)),
    Math.abs(position.y - target.y),
    Math.abs(position.y - (target.y + target.height))
  );

  return distance <= ATTACH_DISTANCE;
}

/**
 * The node a pin or expansion node would attach to when hovering an element: the
 * node itself, or the node of a hovered pin, expansion node or label.
 *
 * @param {Shape} shape
 * @param {Element} hover
 *
 * @return {Shape|null}
 */
export function getAttachTarget(shape, hover) {
  if (!hover) {
    return null;
  }

  if (isLabel(hover)) {
    hover = hover.labelTarget;
  }

  if (isBorderNode(hover)) {
    hover = hover.host;
  }

  if (isPin(shape)) {
    return isAction(hover) ? hover : null;
  }

  return isExpansionNode(shape) && isExpansionRegion(hover) ? hover : null;
}

/**
 * @param {Shape} source
 * @param {Shape} target
 *
 * @return {false|Object} whether and with which type of flow the nodes can be connected:
 *   object flows where an object node is involved, control flows otherwise
 */
export function canConnect(source, target) {
  if (!isActivityNode(source) || !isActivityNode(target) || source === target) {
    return false;
  }

  // nothing leaves a final node, nothing enters an initial node
  if (is(source, 'uml:FinalNode') || is(target, 'uml:InitialNode')) {
    return false;
  }

  // objects flow from the outputs of actions into their inputs, and only the
  // pins of structured activity nodes connect to their content as well
  if (isPin(source) && isInput(source) && !isStructured(source.host)) {
    return false;
  }

  if (isPin(target) && !isInput(target) && !isStructured(target.host)) {
    return false;
  }

  if (!isObjectNode(source) && !isObjectNode(target)) {
    return { type: 'uml:ControlFlow' };
  }

  // objects pass object nodes and control nodes other than initial nodes,
  // actions take and give them through their pins
  const passesObjects = node => isObjectNode(node) || (is(node, 'uml:ControlNode') && !is(node, 'uml:InitialNode'));

  return passesObjects(source) && passesObjects(target) ? { type: 'uml:ObjectFlow' } : false;
}
