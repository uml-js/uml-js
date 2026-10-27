import { REPLACE_MENU_ID } from '../../core/popup-menu/ReplaceMenu.js';
import { getRotateEntry } from '../../core/popup-menu/RotateEntry.js';

import { is, isLabel } from '../../core/util/ModelUtil.js';

import { isForkOrJoin } from '../util/ElementUtil.js';

import { ICONS } from '../icons.js';

const FINAL_NODES = [
  { type: 'uml:ActivityFinalNode', label: 'Activity final node', icon: ICONS.activityFinal },
  { type: 'uml:FlowFinalNode', label: 'Flow final node', icon: ICONS.flowFinal }
];


/**
 * Replace menu provider for activity diagrams: activity final and flow final
 * nodes, rotating fork / join bars.
 */
export default function ReplaceMenuProvider(popupMenu, modeling) {
  this._modeling = modeling;

  popupMenu.registerProvider(REPLACE_MENU_ID, this);
}

ReplaceMenuProvider.$inject = [
  'popupMenu',
  'modeling'
];

ReplaceMenuProvider.prototype.getPopupMenuEntries = function(element) {
  const modeling = this._modeling;

  const entries = {};

  if (isForkOrJoin(element)) {
    entries['rotate'] = getRotateEntry(element, modeling);

    return entries;
  }

  if (isLabel(element) || !is(element, 'uml:FinalNode')) {
    return entries;
  }

  for (const { type, label, icon } of FINAL_NODES) {
    if (!is(element, type)) {
      entries[`replace-with-${ type.split(':')[1] }`] = {
        label,
        imageUrl: icon,
        action: () => modeling.changeNodeType(element, type)
      };
    }
  }

  return entries;
};
