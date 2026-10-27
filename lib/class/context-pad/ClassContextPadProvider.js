import { isConnection, isLabel } from '../../core/util/ModelUtil.js';

import { isClassifier } from '../util/ElementUtil.js';

import { ICONS } from '../icons.js';


/**
 * Context pad entries for class diagrams, modeled after bpmn-js:
 *
 *   * append a class (association)
 *   * connect
 *   * change the type of classifiers and relationships (replace menu)
 *   * delete
 */
export default function ClassContextPadProvider(
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

ClassContextPadProvider.$inject = [
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'autoPlace',
  'replaceMenu'
];

ClassContextPadProvider.prototype.getContextPadEntries = function(element) {
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

  if (isClassifier(element)) {
    const attrs = { type: 'uml:Class', name: 'Class' };

    entries['append.class'] = {
      group: 'model',
      title: 'Append class (association)',
      imageUrl: ICONS.class,
      action: {
        dragstart: (event, element) => create.start(event, elementFactory.createShape(attrs), { source: element }),
        click: (event, element) => autoPlace.append(element, elementFactory.createShape(attrs))
      }
    };

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

  if (isClassifier(element) || isConnection(element)) {
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
