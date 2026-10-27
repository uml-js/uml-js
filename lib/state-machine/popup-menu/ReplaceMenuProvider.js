import { REPLACE_MENU_ID } from '../../core/popup-menu/ReplaceMenu.js';
import { getRotateEntry } from '../../core/popup-menu/RotateEntry.js';

import { ICONS } from '../icons.js';

import { isComposite, isPseudostate, isState } from '../util/ElementUtil.js';


/**
 * Replace menu provider to change the type of a vertex, and to switch
 * states between simple and composite (like collapsed / expanded
 * sub-processes in bpmn-js), and to rotate fork / join bars.
 */
export default function ReplaceMenuProvider(popupMenu, stateMachineReplace, modeling) {
  this._stateMachineReplace = stateMachineReplace;
  this._modeling = modeling;

  popupMenu.registerProvider(REPLACE_MENU_ID, this);
}

ReplaceMenuProvider.$inject = [
  'popupMenu',
  'stateMachineReplace',
  'modeling'
];

ReplaceMenuProvider.prototype.getPopupMenuEntries = function(element) {
  const stateMachineReplace = this._stateMachineReplace;

  const modeling = this._modeling;

  const entries = {};

  if (isState(element) && !isComposite(element)) {
    entries['replace-with-composite-state'] = {
      label: 'Composite state',
      imageUrl: ICONS.compositeState,
      action: () => modeling.updateComposite(element, true)
    };
  }

  // removes sub-states, too
  if (isState(element) && isComposite(element)) {
    entries['replace-with-simple-state'] = {
      label: 'Simple state',
      imageUrl: ICONS.state,
      action: () => modeling.updateComposite(element, false)
    };
  }

  if (isPseudostate(element, 'fork') || isPseudostate(element, 'join')) {
    entries['rotate'] = getRotateEntry(element, modeling);
  }

  for (const vertexType of stateMachineReplace.getReplaceOptions(element)) {
    entries[`replace-with-${ vertexType.id }`] = {
      label: vertexType.label,
      imageUrl: vertexType.icon,
      action: () => stateMachineReplace.replaceElement(element, vertexType)
    };
  }

  return entries;
};
