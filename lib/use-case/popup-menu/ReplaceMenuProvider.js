import { REPLACE_MENU_ID } from '../../core/popup-menu/ReplaceMenu.js';

import { is, isConnection } from '../../core/util/ModelUtil.js';

import { isUseCase } from '../util/ElementUtil.js';

import { ICONS } from '../icons.js';

const RELATIONSHIPS = [
  { type: 'uml:Include', label: 'Include', icon: ICONS.include },
  { type: 'uml:Extend', label: 'Extend', icon: ICONS.include },
  { type: 'uml:Generalization', label: 'Generalization', icon: ICONS.generalization }
];


/**
 * Replace menu provider for use case diagrams: the relationships
 * between use cases (include, extend, generalization).
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

  if (!isConnection(element) || !isUseCase(element.source) || !isUseCase(element.target)) {
    return entries;
  }

  for (const { type, label, icon } of RELATIONSHIPS) {
    if (!is(element, type)) {
      entries[`replace-with-${ type.split(':')[1].toLowerCase() }`] = {
        label,
        imageUrl: icon,
        action: () => modeling.replaceConnection(element, type)
      };
    }
  }

  return entries;
};
