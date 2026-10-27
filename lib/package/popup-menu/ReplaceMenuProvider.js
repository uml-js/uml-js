import { REPLACE_MENU_ID } from '../../core/popup-menu/ReplaceMenu.js';

import { isConnection } from '../../core/util/ModelUtil.js';

import { getRelationshipKind } from '../util/ElementUtil.js';

import { ICONS } from '../icons.js';

const RELATIONSHIPS = [
  { kind: 'dependency', label: 'Dependency', attrs: { type: 'uml:Dependency' }, icon: ICONS.dependency },
  { kind: 'import', label: 'Import', attrs: { type: 'uml:PackageImport' }, icon: ICONS.keywordDependency },
  { kind: 'access', label: 'Access', attrs: { type: 'uml:PackageImport', visibility: 'private' }, icon: ICONS.keywordDependency },
  { kind: 'merge', label: 'Merge', attrs: { type: 'uml:PackageMerge' }, icon: ICONS.keywordDependency }
];


/**
 * Replace menu provider for package diagrams: the kind of relationships
 * between packages (dependency, import, access, merge).
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

  if (!isConnection(element)) {
    return entries;
  }

  const current = getRelationshipKind(element.businessObject);

  for (const { kind, label, attrs, icon } of RELATIONSHIPS) {
    if (kind !== current) {
      entries[`replace-with-${ kind }`] = {
        label,
        imageUrl: icon,
        action: () => modeling.replaceConnection(element, attrs)
      };
    }
  }

  return entries;
};
