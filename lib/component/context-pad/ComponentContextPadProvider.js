import { isConnection, isLabel } from '../../core/util/ModelUtil.js';

import { isBall, isComponent, isInterface, isPort, isProvided, isTypedPort } from '../util/ElementUtil.js';

import { ICONS } from '../icons.js';

const PORT_DISTANCE = 30;

const BALL_ATTRS = {
  type: 'uml:Interface',
  name: 'Interface',
  isIcon: true
};


/**
 * Context pad entries for component diagrams, modeled after bpmn-js:
 *
 *   * append a component (dependency) or a provided interface (-O)
 *   * append a component providing or requiring a ball
 *   * add a port to a component
 *   * connect, or connect to a provided interface as required interface (-C)
 *   * change notation or relationship type (replace menu)
 *   * delete
 */
export default function ComponentContextPadProvider(
    contextPad, modeling, elementFactory,
    connect, create, autoPlace, replaceMenu,
    requiredInterfaceConnect) {

  this._modeling = modeling;
  this._elementFactory = elementFactory;
  this._connect = connect;
  this._create = create;
  this._autoPlace = autoPlace;
  this._replaceMenu = replaceMenu;
  this._requiredInterfaceConnect = requiredInterfaceConnect;

  contextPad.registerProvider(this);
}

ComponentContextPadProvider.$inject = [
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'autoPlace',
  'replaceMenu',
  'requiredInterfaceConnect'
];

ComponentContextPadProvider.prototype.getContextPadEntries = function(element) {
  const modeling = this._modeling,
        elementFactory = this._elementFactory,
        connect = this._connect,
        create = this._create,
        autoPlace = this._autoPlace,
        replaceMenu = this._replaceMenu,
        requiredInterfaceConnect = this._requiredInterfaceConnect;

  const entries = {};

  if (isLabel(element)) {
    return entries;
  }

  /**
   * @param {boolean} [reverse] connect the new element to the source instead of vice versa
   */
  function appendAction(title, imageUrl, attrs, reverse) {
    return {
      group: 'model',
      title,
      imageUrl,
      action: {
        dragstart: (event, element) => create.start(event, elementFactory.createShape(attrs), {
          source: element,
          hints: reverse ? { connectionTarget: element } : {}
        }),
        click: (event, element) => autoPlace.append(element, elementFactory.createShape(attrs), reverse ? { connectionTarget: element } : {})
      }
    };
  }

  if (isComponent(element)) {
    entries['append.component'] = appendAction('Append component (dependency)', ICONS.component, { type: 'uml:Component', name: 'Component' });

    entries['append.provided-interface'] = appendAction('Append provided interface (-O)', ICONS.providedInterface, BALL_ATTRS);

    entries['add.port'] = {
      group: 'model',
      title: 'Add port',
      imageUrl: ICONS.port,
      action: {
        click: (event, element) => this._addPort(element)
      }
    };
  }

  // ports show at most one interface, as their type
  if (isPort(element) && !isTypedPort(element)) {
    entries['append.provided-interface'] = appendAction('Provide an interface (-O)', ICONS.providedInterface, BALL_ATTRS);
  }

  if (isBall(element)) {
    const provided = isProvided(element);

    entries['append.component'] = appendAction(
      provided ? 'Append component requiring the interface' : 'Append component providing the interface',
      ICONS.component,
      { type: 'uml:Component', name: 'Component' },
      true
    );
  }

  if (isComponent(element) || isPort(element) || isInterface(element)) {
    entries['connect'] = {
      group: 'connect',
      title: isPort(element) ? 'Connect ports' : (isBall(element) ? 'Connect component' : 'Connect (dependency / realization)'),
      imageUrl: ICONS.connect,
      action: {
        click: (event, element) => connect.start(event, element),
        dragstart: (event, element) => connect.start(event, element)
      }
    };
  }

  if (isComponent(element) || (isPort(element) && !isTypedPort(element))) {
    entries['connect.required-interface'] = {
      group: 'connect',
      title: 'Require a provided interface (-C)',
      imageUrl: ICONS.requiredInterface,
      action: {
        click: (event, element) => requiredInterfaceConnect.start(event, element),
        dragstart: (event, element) => requiredInterfaceConnect.start(event, element)
      }
    };
  }

  if (replaceMenu.isAvailable(element)) {
    entries['replace'] = {
      group: 'edit',
      title: 'Change element',
      imageUrl: ICONS.replace,
      action: {
        click: (event, element) => replaceMenu.open(element)
      }
    };
  }

  if (isComponent(element) || isInterface(element) || isPort(element) || isConnection(element)) {
    entries['delete'] = {
      group: 'edit',
      title: 'Delete',
      imageUrl: ICONS.remove,
      action: {
        click: (event, element) => modeling.removeElements([ element ])
      }
    };
  }

  return entries;
};

/**
 * Add a port to the right border of a component, below existing ports.
 *
 * @param {Shape} component
 *
 * @return {Shape} the port
 */
ComponentContextPadProvider.prototype._addPort = function(component) {
  const port = this._elementFactory.createShape({ type: 'uml:Port' });

  const x = component.x + component.width;

  const taken = component.attachers
    .filter(attacher => Math.abs(attacher.x + attacher.width / 2 - x) < 1)
    .map(attacher => attacher.y + attacher.height / 2);

  let y = component.y + Math.min(PORT_DISTANCE, component.height / 2);

  while (taken.some(other => Math.abs(other - y) < PORT_DISTANCE) && y < component.y + component.height) {
    y += PORT_DISTANCE;
  }

  return this._modeling.createShape(port, { x, y: Math.min(y, component.y + component.height) }, component, { attach: true });
};
