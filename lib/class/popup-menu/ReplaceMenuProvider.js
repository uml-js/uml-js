import { REPLACE_MENU_ID } from '../../core/popup-menu/ReplaceMenu.js';

import { is, isConnection } from '../../core/util/ModelUtil.js';

import { getAggregation, isClassifier } from '../util/ElementUtil.js';

import { getRelationshipTypes } from '../rules/ClassRules.js';

import { ICONS } from '../icons.js';

const CLASSIFIERS = [
  { id: 'class', type: 'uml:Class', label: 'Class', icon: ICONS.class },
  { id: 'abstract-class', type: 'uml:Class', isAbstract: true, label: 'Abstract class', icon: ICONS.abstractClass },
  { id: 'interface', type: 'uml:Interface', label: 'Interface', icon: ICONS.interface },
  { id: 'enumeration', type: 'uml:Enumeration', label: 'Enumeration', icon: ICONS.enumeration }
];

const RELATIONSHIPS = [
  { id: 'association', type: 'uml:Association', aggregation: 'none', label: 'Association', icon: ICONS.association },
  { id: 'aggregation', type: 'uml:Association', aggregation: 'shared', label: 'Aggregation', icon: ICONS.aggregation },
  { id: 'composition', type: 'uml:Association', aggregation: 'composite', label: 'Composition', icon: ICONS.composition },
  { id: 'generalization', type: 'uml:Generalization', label: 'Generalization', icon: ICONS.generalization },
  { id: 'interface-realization', type: 'uml:InterfaceRealization', label: 'Interface realization', icon: ICONS.realization },
  { id: 'dependency', type: 'uml:Dependency', label: 'Dependency', icon: ICONS.dependency }
];


/**
 * Replace menu provider for class diagrams: the kind of classifiers
 * (class, abstract class, interface, enumeration) and of relationships.
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
  if (isClassifier(element)) {
    return this._getClassifierEntries(element);
  }

  if (isConnection(element)) {
    return this._getRelationshipEntries(element);
  }

  return {};
};

ReplaceMenuProvider.prototype._getClassifierEntries = function(element) {
  const modeling = this._modeling;

  const bo = element.businessObject;

  const entries = {};

  for (const option of CLASSIFIERS) {
    const isCurrent = is(bo, option.type) && (!is(bo, 'uml:Class') || !!bo.isAbstract === !!option.isAbstract);

    if (isCurrent || !canChangeType(element, option.type)) {
      continue;
    }

    entries[`replace-with-${ option.id }`] = {
      label: option.label,
      imageUrl: option.icon,
      action: () => modeling.replaceClassifier(element, { type: option.type, isAbstract: option.isAbstract })
    };
  }

  return entries;
};

ReplaceMenuProvider.prototype._getRelationshipEntries = function(element) {
  const modeling = this._modeling;

  const types = getRelationshipTypes(element.source, element.target);

  const entries = {};

  for (const option of RELATIONSHIPS) {
    if (!types.includes(option.type)) {
      continue;
    }

    const isCurrent = is(element, option.type) && (!option.aggregation || getAggregation(element.businessObject) === option.aggregation);

    if (isCurrent) {
      continue;
    }

    entries[`replace-with-${ option.id }`] = {
      label: option.label,
      imageUrl: option.icon,
      action: () => modeling.replaceRelationship(element, { type: option.type, aggregation: option.aggregation })
    };
  }

  return entries;
};


/**
 * Interfaces realized by classes stay interfaces, classes realizing
 * interfaces stay classes; generalizations connect classifiers of
 * the same kind only.
 */
function canChangeType(element, type) {
  const realizes = element.outgoing.some(connection => is(connection, 'uml:InterfaceRealization'));
  const realized = element.incoming.some(connection => is(connection, 'uml:InterfaceRealization'));
  const generalizes = [ ...element.incoming, ...element.outgoing ].some(connection => is(connection, 'uml:Generalization'));

  if (realizes && type !== 'uml:Class') {
    return false;
  }

  if (realized && type !== 'uml:Interface') {
    return false;
  }

  return !generalizes || is(element, type);
}
