import { REPLACE_MENU_ID } from '../../core/popup-menu/ReplaceMenu.js';

import { is, isConnection } from '../../core/util/ModelUtil.js';

import { isBall, isComponent, isInterface, isPortTyping } from '../util/ElementUtil.js';

import { ICONS } from '../icons.js';

const RELATIONSHIP_TYPES = [
  { type: 'uml:InterfaceRealization', label: 'Interface realization (provides)' },
  { type: 'uml:Usage', label: 'Usage (requires)' },
  { type: 'uml:Dependency', label: 'Dependency' }
];


/**
 * Replace menu provider for component diagrams:
 *
 *   * interfaces: rectangle or ball notation
 *   * relationships: interface realization, usage and dependency
 *   * interfaces of ports: provided or required
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

  if (isInterface(element)) {
    if (isBall(element)) {
      entries['replace-with-interface-rectangle'] = {
        label: 'Interface (rectangle)',
        imageUrl: ICONS.interface,
        action: () => modeling.updateInterfaceNotation(element, false)
      };
    } else {
      entries['replace-with-interface-ball'] = {
        label: 'Interface (ball)',
        imageUrl: ICONS.ball,
        action: () => modeling.updateInterfaceNotation(element, true)
      };
    }
  }

  if (isPortTyping(element)) {
    const required = !!element.businessObject.isConjugated;

    entries[required ? 'replace-with-provided-interface' : 'replace-with-required-interface'] = {
      label: required ? 'Provided interface (-O)' : 'Required interface (-C)',
      imageUrl: required ? ICONS.providedInterface : ICONS.requiredInterface,
      action: () => modeling.updateProperties(element, { isConjugated: !required || undefined })
    };
  }

  if (isConnection(element) && is(element, 'uml:Dependency')) {
    for (const { type, label } of getRelationshipTypes(element)) {
      if (element.type === type) {
        continue;
      }

      entries[`replace-with-${ type.split(':')[1].toLowerCase() }`] = {
        label,
        action: () => modeling.replaceConnection(element, type)
      };
    }
  }

  return entries;
};


/**
 * Interfaces can be realized by components, otherwise
 * classifiers are related via usages or dependencies.
 */
function getRelationshipTypes(connection) {
  const realizable = isComponent(connection.source) && isInterface(connection.target);

  return RELATIONSHIP_TYPES.filter(({ type }) => realizable || type !== 'uml:InterfaceRealization');
}
