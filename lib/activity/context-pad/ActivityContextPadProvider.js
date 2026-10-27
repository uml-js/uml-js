import { is, isConnection, isLabel } from '../../core/util/ModelUtil.js';

import { isActivityNode } from '../util/ElementUtil.js';

import { NODE_TYPES, getShapeAttrs } from '../util/NodeTypes.js';

import { ICONS } from '../icons.js';

/**
 * One representative per class of nodes, like in bpmn-js.
 */
const QUICK_APPEND = [ 'activity-final', 'action', 'decision-merge', 'fork-join' ];


/**
 * Context pad entries for activity diagrams, modeled after bpmn-js:
 *
 *   * append a final node, an action, a decision / merge or a fork / join
 *   * connect using a control flow
 *   * change the type of final nodes (replace menu)
 *   * delete
 */
export default function ActivityContextPadProvider(
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

ActivityContextPadProvider.$inject = [
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'autoPlace',
  'replaceMenu'
];

ActivityContextPadProvider.prototype.getContextPadEntries = function(element) {
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

  if (isActivityNode(element) && !is(element, 'uml:FinalNode')) {
    for (const id of QUICK_APPEND) {
      const nodeType = NODE_TYPES.find(t => t.id === id);

      entries[`append.${ id }`] = {
        group: 'model',
        title: `Append ${ nodeType.label.toLowerCase() }`,
        imageUrl: nodeType.icon,
        action: {
          dragstart: (event, element) => create.start(event, elementFactory.createShape(getShapeAttrs(nodeType)), { source: element }),
          click: (event, element) => autoPlace.append(element, elementFactory.createShape(getShapeAttrs(nodeType)))
        }
      };
    }

    entries['connect'] = {
      group: 'connect',
      title: 'Connect using control flow',
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

  if (isActivityNode(element) || isConnection(element)) {
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
