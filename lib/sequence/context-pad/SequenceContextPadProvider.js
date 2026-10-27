import { isLabel } from '../../core/util/ModelUtil.js';

import { getOperands, isCombinedFragment, isLifeline, isMessage, isMessageEnd, isOperand } from '../util/ElementUtil.js';

import { ICONS } from '../icons.js';


/**
 * Context pad entries for sequence diagrams, modeled after bpmn-js:
 *
 *   * append a lifeline, receiving a message (from the selected point, see LifelinePoint)
 *   * connect by a (synchronous) message, the wrench changes its sort
 *   * add an operand to a combined fragment
 *   * change the message sort or the operator of a combined fragment (replace menu)
 *   * delete
 */
export default function SequenceContextPadProvider(
    contextPad, modeling, elementFactory,
    connect, create, autoPlace, replaceMenu, lifelinePoint, eventBus) {

  this._modeling = modeling;
  this._elementFactory = elementFactory;
  this._connect = connect;
  this._create = create;
  this._autoPlace = autoPlace;
  this._replaceMenu = replaceMenu;
  this._lifelinePoint = lifelinePoint;
  this._eventBus = eventBus;

  contextPad.registerProvider(this);
}

SequenceContextPadProvider.$inject = [
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'autoPlace',
  'replaceMenu',
  'lifelinePoint',
  'eventBus'
];

SequenceContextPadProvider.prototype.getContextPadEntries = function(element) {
  const modeling = this._modeling,
        elementFactory = this._elementFactory,
        connect = this._connect,
        create = this._create,
        autoPlace = this._autoPlace,
        replaceMenu = this._replaceMenu,
        lifelinePoint = this._lifelinePoint,
        eventBus = this._eventBus;

  const entries = {};

  if (isLabel(element)) {
    return entries;
  }

  if (isLifeline(element)) {
    const attrs = { type: 'uml:Lifeline', name: 'Lifeline' };

    entries['append.lifeline'] = {
      group: 'model',
      title: 'Append lifeline (message)',
      imageUrl: ICONS.lifeline,
      action: {
        dragstart: (event, element) => create.start(event, elementFactory.createShape(attrs), { source: element }),
        click: (event, element) => {
          const point = lifelinePoint.getPoint(element);

          if (point) {
            const shape = modeling.appendLifeline(element, elementFactory.createShape(attrs), point.y);

            // as after auto place: scroll to the lifeline, edit its name
            eventBus.fire('autoPlace.end', { source: element, shape });
          } else {
            autoPlace.append(element, elementFactory.createShape(attrs));
          }
        }
      }
    };
  }

  if (isMessageEnd(element)) {
    entries['connect'] = {
      group: 'connect',
      title: 'Connect using message',
      imageUrl: ICONS.connect,
      action: {

        // from the selected point on a lifeline, if any
        click: (event, element) => connect.start(event, element, lifelinePoint.getPoint(element) || undefined),
        dragstart: (event, element) => connect.start(event, element, lifelinePoint.getPoint(element) || undefined)
      }
    };
  }

  if (isCombinedFragment(element)) {
    entries['add.operand'] = {
      group: 'model',
      title: 'Add operand',
      imageUrl: ICONS.operand,
      action: {
        click: (event, element) => modeling.addOperand(element)
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

  const removable = isMessageEnd(element) || isMessage(element) || isCombinedFragment(element) ||
    (isOperand(element) && getOperands(element.parent).length > 1);

  if (removable) {
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
