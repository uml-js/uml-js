import { is, isLabel } from '../../core/util/ModelUtil.js';


export function isComponent(element) {
  return is(element, 'uml:Component') && !isLabel(element);
}

export function isInterface(element) {
  return is(element, 'uml:Interface') && !isLabel(element);
}

export function isPort(element) {
  return is(element, 'uml:Port') && !isLabel(element) && !(element && element.waypoints);
}

/**
 * The line between a port and the ball showing its type (provided interface)
 * or, if the port is conjugated, the socket around it (required interface).
 * Its model element is the port.
 */
export function isPortTyping(element) {
  return !!(element && element.waypoints) && is(element, 'uml:Port');
}

/**
 * Whether a port has an interface (provided or required) shown already.
 *
 * @param {Shape} port
 * @param {Connection} [ignore] a connection not to take into account, e.g. one being reconnected
 */
export function isTypedPort(port, ignore) {
  return port.outgoing.some(connection => connection !== ignore && isPortTyping(connection));
}

/**
 * Whether a ball is provided, by a component realizing it or by a (non-conjugated) port.
 *
 * @param {Shape} ball
 * @param {Connection} [ignore] a connection not to take into account, e.g. one being reconnected
 */
export function isProvided(ball, ignore) {
  return ball.incoming.some(connection => {
    return connection !== ignore && (
      is(connection, 'uml:InterfaceRealization') ||
      (isPortTyping(connection) && !connection.businessObject.isConjugated)
    );
  });
}

/**
 * Whether an interface is shown as a ball (lollipop) rather than a rectangle,
 * i.e. its UML DI shape is shown as icon (`UMLDiagramElement#isIcon`).
 */
export function isBall(element) {
  return isInterface(element) && !!(element.di && element.di.isIcon);
}

/**
 * Relationships between components, interfaces and ports.
 */
export function isRelationship(element) {
  return !!(element && element.waypoints) && (is(element, 'uml:Dependency') || is(element, 'uml:Connector'));
}

/**
 * Elements whose name is shown in an external label.
 */
export function hasExternalLabel(element) {
  return isPort(element) || isBall(element) || isRelationship(element);
}

/**
 * Components with nested components or interfaces show their name at the top.
 */
export function hasNestedClassifiers(element) {
  const bo = element.businessObject || element;

  return is(bo, 'uml:Component') && bo.get('packagedElement').some(e => is(e, 'uml:Component') || is(e, 'uml:Interface'));
}

const DEFAULT_SIZES = {
  'uml:Component': { width: 150, height: 80 },
  'uml:Interface': { width: 130, height: 60 },
  'uml:Port': { width: 16, height: 16 }
};

export const BALL_SIZE = { width: 20, height: 20 };

/**
 * @param {ModdleElement} bo
 * @param {ModdleElement} [di]
 *
 * @return {Dimensions}
 */
export function getDefaultSize(bo, di) {
  if (is(bo, 'uml:Interface') && di && di.isIcon) {
    return BALL_SIZE;
  }

  return DEFAULT_SIZES[bo.$type] || DEFAULT_SIZES['uml:Component'];
}

/**
 * @param {ModdleElement} element
 *
 * @return {ModdleElement[]} the components containing the element, innermost first
 */
export function getContainingComponents(element) {
  const components = [];

  let parent = element.$parent;

  while (parent) {
    if (is(parent, 'uml:Component')) {
      components.push(parent);
    }

    parent = parent.$parent;
  }

  return components;
}

/**
 * The component owning a connector between two ports: the innermost
 * component that is or contains the owners of both ports.
 *
 * @param {ModdleElement} sourcePort
 * @param {ModdleElement} targetPort
 *
 * @return {ModdleElement|null}
 */
export function getConnectorContext(sourcePort, targetPort) {
  const sourceComponents = getContainingComponents(sourcePort);
  const targetComponents = getContainingComponents(targetPort);

  return sourceComponents.find(component => targetComponents.includes(component)) || null;
}

/**
 * The component a port would attach to when hovering an element: the
 * component itself, or the component of a hovered port or port label.
 *
 * @param {Element} hover
 *
 * @return {Shape|null}
 */
export function getAttachTarget(hover) {
  if (isLabel(hover)) {
    hover = hover.labelTarget;
  }

  if (isPort(hover)) {
    hover = hover.host;
  }

  return isComponent(hover) ? hover : null;
}
