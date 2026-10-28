import { ICONS } from '../icons.js';

import { getReferencedPoint, isSubmachineState } from '../util/ElementUtil.js';

/**
 * ID of the popup menu to add connection point references to submachine states.
 */
export const CONNECTION_POINT_REFERENCE_MENU_ID = 'uml-connection-point-reference';


/**
 * Popup menu to add references to the entry and exit points of the state machine
 * a submachine state refers to, one per point, on the border of the state.
 */
export default function ConnectionPointReferenceMenu(popupMenu, replaceMenu, modeling) {
  this._popupMenu = popupMenu;
  this._replaceMenu = replaceMenu;
  this._modeling = modeling;

  popupMenu.registerProvider(CONNECTION_POINT_REFERENCE_MENU_ID, this);
}

ConnectionPointReferenceMenu.$inject = [
  'popupMenu',
  'replaceMenu',
  'modeling'
];

/**
 * @param {Element} element
 *
 * @return {boolean} whether points of the state machine of a submachine state are not referred to yet
 */
ConnectionPointReferenceMenu.prototype.isAvailable = function(element) {
  return getUnreferencedPoints(element).length > 0;
};

/**
 * @param {Element} element a submachine state
 */
ConnectionPointReferenceMenu.prototype.open = function(element) {
  if (!this.isAvailable(element)) {
    return;
  }

  this._popupMenu.open(element, CONNECTION_POINT_REFERENCE_MENU_ID, this._replaceMenu._getPosition(element), {
    title: 'Add connection point reference',
    width: 300,
    search: true
  });
};

ConnectionPointReferenceMenu.prototype.getPopupMenuEntries = function(element) {
  const modeling = this._modeling;

  return Object.fromEntries(getUnreferencedPoints(element).map(point => {
    const entry = point.kind === 'entryPoint';

    return [ `reference-${ point.id }`, {
      label: `${ entry ? 'Entry point' : 'Exit point' } ${ point.name || '' }`.trim(),
      imageUrl: entry ? ICONS.entryPoint : ICONS.exitPoint,
      action: () => modeling.addConnectionPointReference(element, point)
    } ];
  }));
};


/**
 * @param {Element} element
 *
 * @return {ModdleElement[]} the entry and exit points of the state machine a submachine
 * state refers to which it has no connection point reference for yet
 */
function getUnreferencedPoints(element) {
  if (!isSubmachineState(element)) {
    return [];
  }

  const state = element.businessObject;

  const referenced = new Set(state.get('connection').map(getReferencedPoint));

  return state.submachine.get('connectionPoint').filter(point => {
    return [ 'entryPoint', 'exitPoint' ].includes(point.kind) && !referenced.has(point);
  });
}
