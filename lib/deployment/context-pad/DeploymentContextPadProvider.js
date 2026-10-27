import { isConnection, isLabel } from '../../core/util/ModelUtil.js';

import { isArtifact, isNode } from '../util/ElementUtil.js';

import { ICONS } from '../icons.js';


/**
 * Context pad entries for deployment diagrams, modeled after bpmn-js:
 *
 *   * append a node (communication path) to nodes
 *   * connect
 *   * change the type of nodes and relationships (replace menu)
 *   * delete
 */
export default function DeploymentContextPadProvider(
    contextPad, modeling, elementFactory,
    connect, create, autoPlace, replaceMenu) {

  this._modeling = modeling;
  this._elementFactory = elementFactory;
  this._connect = connect;
  this._create = create;
  this._autoPlace = autoPlace;
  this._replaceMenu = replaceMenu;

  contextPad.registerProvider(this);
}

DeploymentContextPadProvider.$inject = [
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'autoPlace',
  'replaceMenu'
];

DeploymentContextPadProvider.prototype.getContextPadEntries = function(element) {
  const modeling = this._modeling,
        elementFactory = this._elementFactory,
        connect = this._connect,
        create = this._create,
        autoPlace = this._autoPlace,
        replaceMenu = this._replaceMenu;

  const entries = {};

  if (isLabel(element)) {
    return entries;
  }

  if (isNode(element)) {
    const attrs = { type: 'uml:Node', name: 'Node' };

    entries['append.node'] = {
      group: 'model',
      title: 'Append node (communication path)',
      imageUrl: ICONS.node,
      action: {
        dragstart: (event, element) => create.start(event, elementFactory.createShape(attrs), { source: element }),
        click: (event, element) => autoPlace.append(element, elementFactory.createShape(attrs))
      }
    };
  }

  if (isNode(element) || isArtifact(element)) {
    entries['connect'] = {
      group: 'connect',
      title: 'Connect',
      imageUrl: ICONS.connect,
      action: {
        click: (event, element) => connect.start(event, element),
        dragstart: (event, element) => connect.start(event, element)
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

  if (isNode(element) || isArtifact(element) || isConnection(element)) {
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
