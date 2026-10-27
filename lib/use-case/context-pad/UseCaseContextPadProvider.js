import { isConnection, isLabel } from '../../core/util/ModelUtil.js';

import { isActor, isSubject, isUseCase } from '../util/ElementUtil.js';

import { ICONS } from '../icons.js';


/**
 * Context pad entries for use case diagrams, modeled after bpmn-js:
 *
 *   * append a use case (association from actors, include from use cases)
 *   * connect
 *   * change the type of relationships between use cases (replace menu)
 *   * delete
 */
export default function UseCaseContextPadProvider(
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

UseCaseContextPadProvider.$inject = [
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'autoPlace',
  'replaceMenu'
];

UseCaseContextPadProvider.prototype.getContextPadEntries = function(element) {
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

  if (isActor(element) || isUseCase(element)) {
    const attrs = { type: 'uml:UseCase', name: 'Use case' };

    entries['append.use-case'] = {
      group: 'model',
      title: isActor(element) ? 'Append use case (association)' : 'Append use case (include)',
      imageUrl: ICONS.useCase,
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

  if (isActor(element) || isUseCase(element) || isSubject(element) || isConnection(element)) {
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
