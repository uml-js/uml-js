import { REPLACE_MENU_ID } from '../../core/popup-menu/ReplaceMenu.js';

import { is, isConnection } from '../../core/util/ModelUtil.js';

import { isNode } from '../util/ElementUtil.js';

import { getRelationshipTypes } from '../rules/DeploymentRules.js';

import { ICONS } from '../icons.js';

const NODES = [
  { id: 'node', type: 'uml:Node', label: 'Node', icon: ICONS.node },
  { id: 'device', type: 'uml:Device', label: 'Device', icon: ICONS.keywordNode },
  { id: 'execution-environment', type: 'uml:ExecutionEnvironment', label: 'Execution environment', icon: ICONS.keywordNode }
];

const RELATIONSHIPS = [
  { id: 'deployment', type: 'uml:Deployment', label: 'Deployment', icon: ICONS.deployment },
  { id: 'dependency', type: 'uml:Dependency', label: 'Dependency', icon: ICONS.dependency }
];


/**
 * Replace menu provider for deployment diagrams: the type of nodes
 * (node, device, execution environment) and of relationships
 * between artifacts and nodes (deployment, dependency).
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

  if (isNode(element)) {
    for (const { id, type, label, icon } of NODES) {
      if (element.type !== type) {
        entries[`replace-with-${ id }`] = {
          label,
          imageUrl: icon,
          action: () => modeling.changeNodeType(element, type)
        };
      }
    }
  }

  if (isConnection(element) && !is(element, 'uml:CommunicationPath')) {
    const types = getRelationshipTypes(element.source, element.target);

    for (const { id, type, label, icon } of RELATIONSHIPS) {
      if (element.type !== type && types.includes(type)) {
        entries[`replace-with-${ id }`] = {
          label,
          imageUrl: icon,
          action: () => modeling.replaceConnection(element, type)
        };
      }
    }
  }

  return entries;
};
