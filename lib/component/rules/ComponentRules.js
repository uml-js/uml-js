import inherits from 'inherits-browser';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';

import { is, isLabel } from '../../core/util/ModelUtil.js';

import {
  getAttachTarget,
  getConnectorContext,
  isBall,
  isComponent,
  isInterface,
  isPort,
  isPortTyping,
  isProvided,
  isTypedPort
} from '../util/ElementUtil.js';

/**
 * Maximum distance from a component's border to attach a port.
 */
const ATTACH_DISTANCE = 20;


/**
 * Modeling rules for component diagrams.
 */
export default function ComponentRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(ComponentRules, RuleProvider);

ComponentRules.$inject = [ 'eventBus' ];

ComponentRules.prototype.init = function() {

  this.addRule('shape.create', function(context) {
    return canCreate(context.shape, context.target);
  });

  this.addRule('shape.attach', function(context) {
    return canAttach(context.shape, getAttachTarget(context.target), context.position);
  });

  // ports are pasted with their component
  this.addRule('elements.create', function(context) {
    const { elements, target } = context;

    return elements.every(element => {
      return element.waypoints || (element.host && elements.includes(element.host)) || canCreate(element, target);
    });
  });

  this.addRule('elements.move', function(context) {
    const { shapes, target, position } = context;

    // ports are moved along the border, or to another component
    if (shapes.length === 1 && isPort(shapes[0])) {

      // move start
      if (!target) {
        return true;
      }

      return canAttach(shapes[0], getAttachTarget(target), position) ? 'attach' : false;
    }

    return shapes.every(shape => {
      if (isLabel(shape)) {
        return true;
      }

      if (isPort(shape)) {
        return false;
      }

      return !target || canContain(target);
    });
  });

  this.addRule('connection.create', function(context) {
    return canConnect(context.source, context.target);
  });

  this.addRule('connection.reconnect', function(context) {
    return canReconnect(context.connection, context.source, context.target);
  });

  this.addRule('shape.resize', function(context) {
    return canResize(context.shape);
  });
};

ComponentRules.prototype.canConnect = canConnect;


/**
 * Components and interfaces can be drawn on the diagram or inside components.
 */
export function canContain(target) {
  return !!target && (!target.parent || isComponent(target));
}

export function canCreate(shape, target) {
  if (isLabel(shape)) {
    return true;
  }

  if (isPort(shape)) {
    return false;
  }

  return (isComponent(shape) || isInterface(shape)) && canContain(target);
}

export function canAttach(shape, target, position) {
  if (!isPort(shape) || !isComponent(target) || !position) {
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
 * @param {Shape} source
 * @param {Shape} target
 * @param {Connection} [ignore] a connection being reconnected, not to take into account
 *
 * @return {false|Object} whether and with which type of relationship the elements can be connected
 */
export function canConnect(source, target, ignore) {
  if (!source || !target || source === target || isLabel(source) || isLabel(target)) {
    return false;
  }

  if (isPort(source) || isPort(target)) {
    if (isPort(source) && isPort(target) && getConnectorContext(source.businessObject, target.businessObject)) {
      return { type: 'uml:Connector' };
    }

    // a port provides a ball, or requires it if it is provided already
    if (isPort(source) && isBall(target) && !isTypedPort(source, ignore)) {
      return getPortTypingAttrs(source, isProvided(target, ignore));
    }

    return false;
  }

  if (!isClassifier(source) || !isClassifier(target) || isBall(source)) {
    return false;
  }

  if (isComponent(source) && isInterface(target)) {
    return { type: getInterfaceRelationshipType(target, ignore) };
  }

  return { type: 'uml:Dependency' };
}

/**
 * Components provide interfaces (realization), except for balls that are
 * provided already: further components connected to them require them (usage).
 *
 * @param {Shape} target interface
 * @param {Connection} [ignore]
 *
 * @return {string}
 */
function getInterfaceRelationshipType(target, ignore) {
  if (!isBall(target)) {
    return 'uml:InterfaceRealization';
  }

  return isProvided(target, ignore) ? 'uml:Usage' : 'uml:InterfaceRealization';
}

/**
 * @param {Shape} port
 * @param {boolean} conjugated whether the port requires the interface
 *
 * @return {Object} attributes of the line showing the type of the port
 */
export function getPortTypingAttrs(port, conjugated) {
  return {
    type: 'uml:Port',
    businessObject: port.businessObject,
    conjugated
  };
}

const DEPENDENCY_TYPES = [ 'uml:Dependency', 'uml:Usage', 'uml:InterfaceRealization' ];

/**
 * Connections can be reconnected wherever a new connection could be created.
 * They keep their kind where it fits their new ends, otherwise they are to be
 * replaced (`replace: true`) by the kind of connection a new one would be,
 * e.g. a usage of a component moved to one of its ports becomes the port
 * requiring the interface.
 *
 * @param {Connection} connection
 * @param {Shape} source
 * @param {Shape} target
 *
 * @return {false|Object} attributes of the reconnected connection
 */
export function canReconnect(connection, source, target) {
  const allowed = canConnect(source, target, connection);

  if (!allowed) {
    return false;
  }

  if (keepsKind(connection, allowed, source, target)) {
    return isPortTyping(connection)
      ? { type: connection.type, businessObject: connection.businessObject }
      : { type: connection.type };
  }

  return { ...allowed, replace: true };
}

function keepsKind(connection, allowed, source, target) {
  if (isPortTyping(connection)) {
    return allowed.type === 'uml:Port' && source === connection.source;
  }

  if (is(connection, 'uml:Connector')) {
    return allowed.type === 'uml:Connector';
  }

  if (!DEPENDENCY_TYPES.includes(allowed.type)) {
    return false;
  }

  if (is(connection, 'uml:InterfaceRealization')) {
    return isComponent(source) && isInterface(target);
  }

  return true;
}

export function canResize(shape) {
  return isComponent(shape) || (isInterface(shape) && !isBall(shape));
}


function isClassifier(element) {
  return isComponent(element) || isInterface(element);
}
