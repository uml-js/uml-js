import { REPLACE_MENU_ID } from '../../core/popup-menu/ReplaceMenu.js';
import { getRotateEntry } from '../../core/popup-menu/RotateEntry.js';

import { ICONS } from '../icons.js';

import { hasCompartment, isComposite, isPseudostate, isState, isSubmachineState } from '../util/ElementUtil.js';


/**
 * Replace menu provider to change the type of a vertex, to turn simple states
 * into submachine states and back, to add or remove the separator line of states
 * (below which entry / do / exit and sub-states are shown), and to rotate fork / join bars.
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

  // submachine states refer to a state machine instead of having sub-states
  if (isSubmachineState(element)) {
    entries['simple-state'] = {
      label: 'State',
      imageUrl: ICONS.state,
      action: () => modeling.updateSubmachine(element, false)
    };
  } else if (isState(element) && !isComposite(element)) {
    entries['submachine-state'] = {
      label: 'Submachine state',
      imageUrl: ICONS.submachineState,
      action: () => modeling.updateSubmachine(element, true)
    };
  }

  // the compartment below the separator line, with entry / do / exit and sub-states
  if (isState(element)) {
    if (hasCompartment(element)) {
      entries['remove-compartment'] = {
        label: 'Remove compartment',
        imageUrl: ICONS.state,
        action: () => modeling.setCompartment(element, false)
      };
    } else {
      entries['add-compartment'] = {
        label: 'Add compartment',
        imageUrl: ICONS.compartmentState,
        action: () => modeling.setCompartment(element, true)
      };
    }
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
