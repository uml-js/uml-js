import inherits from 'inherits-browser';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';

import { is, isLabel } from '../../core/util/ModelUtil.js';

import {
  getAttachTarget,
  getConnectionPointKind,
  getOtherShapes,
  getSubmachineTarget,
  isBorderVertex,
  isCollapsed,
  isConnectionPoint,
  isConnectionPointReference,
  isPseudostate,
  isState,
  isSubmachineState,
  isTransition,
  isVertex
} from '../util/ElementUtil.js';

/**
 * Maximum distance from the border of a state to attach an entry or exit point to it.
 */
const ATTACH_DISTANCE = 20;


/**
 * Modeling rules for state machine diagrams.
 */
export default function StateMachineRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(StateMachineRules, RuleProvider);

StateMachineRules.$inject = [ 'eventBus' ];

StateMachineRules.prototype.init = function() {

  this.addRule('shape.create', function(context) {
    const { shape, target } = context;

    return target && target.waypoints ? canInsert(shape, target) : canCreate(shape, target);
  });

  // vertices dropped on a transition are inserted into it
  this.addRule('shape.insert', function(context) {
    return canInsert(context.shape, context.connection);
  });

  // entry and exit points dropped on a submachine state are added to its state machine
  this.addRule('shape.attach', function(context) {
    const { shape, target, position } = context;

    return canAttach(shape, target, position) || canAddToSubmachine(shape, target, position) ? 'attach' : false;
  });

  this.addRule('elements.create', function(context) {
    const { elements, target } = context;

    if (target && target.waypoints) {
      return elements.length === 1 && canInsert(elements[0], target);
    }

    // entry and exit points and connection point references are pasted with their state
    return elements.every(element => {
      return element.waypoints || (element.host && elements.includes(element.host)) || canCreate(element, target);
    });
  });

  this.addRule('elements.move', function(context) {
    const { shapes, target, position } = context;

    if (target && target.waypoints) {
      return shapes.length === 1 && canInsert(shapes[0], target);
    }

    // entry and exit points and connection point references are moved along the border
    if (shapes.length === 1 && isBorderVertex(shapes[0])) {
      return canMoveBorderVertex(shapes[0], target, position);
    }

    return shapes.every(shape => {
      if (isLabel(shape)) {
        return true;
      }

      // attached shapes move along with their state
      if (shape.host) {
        return shapes.includes(shape.host);
      }

      // the entry and exit points of the state machine stay on the diagram
      if (isConnectionPoint(shape)) {
        return !target || !target.parent;
      }

      return !target || canContain(target);
    });
  });

  this.addRule('connection.create', function(context) {
    return canConnect(context.source, context.target);
  });

  this.addRule('connection.reconnect', function(context) {
    return canConnect(context.source, context.target);
  });

  this.addRule('shape.resize', function(context) {
    return canResize(context.shape);
  });
};

StateMachineRules.prototype.canConnect = canConnect;
StateMachineRules.prototype.canCreate = canCreate;
StateMachineRules.prototype.canInsert = canInsert;
StateMachineRules.prototype.canResize = canResize;


/**
 * Vertices may be drawn on the state machine (root) or inside states, except
 * submachine states, whose states belong to the state machine referred to,
 * and collapsed states, whose states are shown in a diagram of their own.
 */
export function canContain(target) {
  return !!target && (!target.parent || (isState(target) && !isSubmachineState(target) && !isCollapsed(target)));
}

export function canCreate(shape, target) {
  if (isLabel(shape)) {
    return true;
  }

  // connection point references are attached to submachine states only, entry
  // and exit points to composite states, or drawn on the diagram of the state machine
  if (isConnectionPointReference(shape)) {
    return false;
  }

  if (isConnectionPoint(shape)) {
    return !!target && !target.parent;
  }

  return isVertex(shape) && canContain(target);
}

/**
 * A vertex may be inserted into a transition, splitting it, if it may be drawn where
 * the transition is, and is neither of its ends; not entry and exit points or
 * references to them, which are drawn on borders.
 */
export function canInsert(shape, connection) {
  if (!isTransition(connection) || isLabel(connection) || isBorderVertex(shape)) {
    return false;
  }

  if (connection.source === shape || connection.target === shape) {
    return false;
  }

  return isVertex(shape) && canContain(connection.parent);
}

/**
 * Entry and exit points are attached to composite states, connection point
 * references to submachine states, close to their border.
 */
export function canAttach(shape, target, position) {
  if (!isBorderVertex(shape) || !position) {
    return false;
  }

  const host = getAttachTarget(shape, target);

  return !!host && isCloseToBorder(host, position);
}

/**
 * Entry and exit points dropped close to the border of a submachine state are
 * added to the state machine it refers to, with a reference on the border.
 */
export function canAddToSubmachine(shape, target, position) {
  const state = getSubmachineTarget(shape, target);

  return !!state && !!position && isCloseToBorder(state, position);
}

function isCloseToBorder(state, position) {
  const distance = Math.min(
    Math.abs(position.x - state.x),
    Math.abs(position.x - (state.x + state.width)),
    Math.abs(position.y - state.y),
    Math.abs(position.y - (state.y + state.height))
  );

  return distance <= ATTACH_DISTANCE;
}

/**
 * Attached entry and exit points move along the border of their state or to another
 * composite state, connection point references along the border of their state only.
 * The entry and exit points of the state machine move on the diagram.
 */
function canMoveBorderVertex(shape, target, position) {

  // move start
  if (!target) {
    return true;
  }

  if (isConnectionPointReference(shape)) {
    return getAttachTarget(shape, target) === shape.host && canAttach(shape, target, position) ? 'attach' : false;
  }

  if (shape.host) {

    // a point shown more than once stays on its state, the owner of the point
    if (getAttachTarget(shape, target) !== shape.host && getOtherShapes(shape).length) {
      return false;
    }

    return canAttach(shape, target, position) ? 'attach' : false;
  }

  return !target.parent;
}

export function canConnect(source, target) {
  if (!isVertex(source) || !isVertex(target) || source === target) {
    return false;
  }

  if (!canConnectBorderVertex(source, 'source', target) || !canConnectBorderVertex(target, 'target', source)) {
    return false;
  }

  // nothing leaves a final state or a terminate pseudostate
  if (is(source, 'uml:FinalState') || isPseudostate(source, 'terminate')) {
    return false;
  }

  // nothing enters an initial pseudostate
  if (isPseudostate(target, 'initial')) {
    return false;
  }

  return { type: 'uml:Transition' };
}

/**
 * Transitions enter a composite state through its entry points and leave it
 * through its exit points (UML 2.5.1): from outside to an entry point, from there
 * inside; from inside to an exit point, from there outside. The entry points of the
 * state machine lead inside, its exit points are reached from inside. Connection
 * point references of submachine states are entered (entry points) or left (exit
 * points) from outside, the transitions inside belonging to the state machine referred to.
 *
 * @param {Shape} vertex
 * @param {'source'|'target'} end the end of the transition the vertex is at
 * @param {Shape} other the vertex at the other end
 *
 * @return {boolean}
 */
function canConnectBorderVertex(vertex, end, other) {
  if (!isBorderVertex(vertex)) {
    return true;
  }

  const kind = getConnectionPointKind(vertex);

  // entry points are targets from outside, exit points sources to outside
  const fromOutside = (kind === 'entryPoint') === (end === 'target');

  const state = vertex.host;

  if (isConnectionPointReference(vertex)) {
    return fromOutside && !!state && isOutside(other, state);
  }

  // the entry and exit points of the state machine
  if (!state) {
    return !fromOutside && !(isConnectionPoint(other) && !other.host);
  }

  return fromOutside ? isOutside(other, state) : isInside(other, state);
}

/**
 * Whether a vertex is drawn inside a state, at any depth.
 */
function isInside(vertex, state) {
  for (let parent = vertex.parent; parent; parent = parent.parent) {
    if (parent === state) {
      return true;
    }
  }

  return false;
}

/**
 * Whether a vertex is drawn outside a state: neither the state, nor inside it, nor on its border.
 */
function isOutside(vertex, state) {
  return vertex !== state && vertex.host !== state && !isInside(vertex, state);
}

export function canResize(shape) {
  return isState(shape) || isPseudostate(shape, 'fork') || isPseudostate(shape, 'join');
}
