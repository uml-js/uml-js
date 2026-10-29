import { is, isConnection, isLabel } from '../../core/util/ModelUtil.js';

import {
  getConnectionPointKind,
  isBorderVertex,
  isConnectionPoint,
  isPseudostate,
  isSubmachineState,
  isVertex
} from '../util/ElementUtil.js';

import { getShapeAttrs, VERTEX_TYPES } from '../util/VertexTypes.js';

import { ICONS } from '../icons.js';

/**
 * One representative per class of vertices, like in bpmn-js. Users change
 * the type within a class (e.g. choice to junction) via the replace menu.
 */
const QUICK_APPEND = [ 'final-state', 'state', 'choice', 'fork-join', 'shallow-history' ];


/**
 * Context pad entries for state machine diagrams, modeled after bpmn-js:
 *
 *   * append a final state, state, choice, fork / join or history
 *   * connect using a transition
 *   * change the type of a vertex (replace menu)
 *   * add entry and exit points to submachine states, created in the state
 *     machine they refer to, and references to existing ones
 *   * delete, except entry and exit points referred to
 */
export default function StateMachineContextPadProvider(
    contextPad, modeling, elementFactory,
    connect, create, autoPlace, replaceMenu, connectionPointReferenceMenu) {

  this._contextPad = contextPad;
  this._modeling = modeling;
  this._elementFactory = elementFactory;
  this._connect = connect;
  this._create = create;
  this._autoPlace = autoPlace;
  this._replaceMenu = replaceMenu;
  this._connectionPointReferenceMenu = connectionPointReferenceMenu;

  contextPad.registerProvider(this);
}

StateMachineContextPadProvider.$inject = [
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'autoPlace',
  'replaceMenu',
  'connectionPointReferenceMenu'
];

StateMachineContextPadProvider.prototype.getContextPadEntries = function(element) {
  const modeling = this._modeling,
        elementFactory = this._elementFactory,
        connect = this._connect,
        create = this._create,
        autoPlace = this._autoPlace;

  const entries = {};

  if (isLabel(element)) {
    return entries;
  }

  const self = this;

  function appendAction(vertexType) {

    function appendStart(event, element) {
      create.start(event, elementFactory.createShape(getShapeAttrs(vertexType)), { source: element });
    }

    function append(event, element) {
      autoPlace.append(element, elementFactory.createShape(getShapeAttrs(vertexType)));
    }

    return {
      group: 'model',
      title: `Append ${ vertexType.replaceGroup === 'history' ? 'history' : vertexType.label.toLowerCase() }`,
      imageUrl: vertexType.icon,
      action: {
        dragstart: appendStart,
        click: append
      }
    };
  }

  if (canBeSource(element)) {
    for (const id of QUICK_APPEND) {
      entries[`append.${ id }`] = appendAction(VERTEX_TYPES.find(v => v.id === id));
    }

    entries['connect'] = {
      group: 'connect',
      title: 'Connect using transition',
      imageUrl: ICONS.connect,
      action: {
        click: (event, element) => connect.start(event, element),
        dragstart: (event, element) => connect.start(event, element)
      }
    };
  }

  if (isVertex(element) && this._replaceMenu.isAvailable(element)) {
    entries['replace'] = {
      group: 'edit',
      title: 'Change element',
      imageUrl: ICONS.replace,
      action: {
        click: (event, element) => self._replaceMenu.open(element)
      }
    };
  }

  if (isSubmachineState(element)) {
    entries['add.entry-point'] = {
      group: 'edit',
      title: 'Add entry point',
      imageUrl: ICONS.entryPoint,
      action: {
        click: (event, element) => modeling.addConnectionPoint(element, 'entryPoint')
      }
    };

    entries['add.exit-point'] = {
      group: 'edit',
      title: 'Add exit point',
      imageUrl: ICONS.exitPoint,
      action: {
        click: (event, element) => modeling.addConnectionPoint(element, 'exitPoint')
      }
    };
  }

  if (this._connectionPointReferenceMenu.isAvailable(element)) {
    entries['add.connection-point-reference'] = {
      group: 'edit',
      title: 'Add connection point reference',
      imageUrl: ICONS.connectionPointReference,
      action: {
        click: (event, element) => self._connectionPointReferenceMenu.open(element)
      }
    };
  }

  if (isVertex(element) || isConnection(element)) {
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
 * Transitions leave any vertex but final states and terminate pseudostates, entry
 * points of the state machine or composite states (leading inside), exit points of
 * composite states (leading outside) and references to exit points.
 */
function canBeSource(element) {
  if (!isVertex(element) || is(element, 'uml:FinalState') || isPseudostate(element, 'terminate')) {
    return false;
  }

  if (!isBorderVertex(element)) {
    return true;
  }

  const entry = getConnectionPointKind(element) === 'entryPoint';

  return isConnectionPoint(element) ? entry || !!element.host : !entry;
}
