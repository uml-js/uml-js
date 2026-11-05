import { REPLACE_MENU_ID } from '../../core/popup-menu/ReplaceMenu.js';

import { is, isConnection } from '../../core/util/ModelUtil.js';

import { getAggregation, isClassifier } from '../util/ElementUtil.js';

import { getEndData, getQualifierData } from '../util/CompartmentUtil.js';

import { formatEnd, formatEndText } from '../util/MemberUtil.js';

import { getRelationshipTypes } from '../rules/ClassRules.js';

import { ICONS } from '../icons.js';

const CLASSIFIERS = [
  { id: 'class', type: 'uml:Class', label: 'Class', icon: ICONS.class },
  { id: 'abstract-class', type: 'uml:Class', isAbstract: true, label: 'Abstract class', icon: ICONS.abstractClass },
  { id: 'interface', type: 'uml:Interface', label: 'Interface', icon: ICONS.interface },
  { id: 'enumeration', type: 'uml:Enumeration', label: 'Enumeration', icon: ICONS.enumeration }
];

const RELATIONSHIPS = [
  { id: 'generalization', type: 'uml:Generalization', label: 'Generalization', icon: ICONS.generalization },
  { id: 'interface-realization', type: 'uml:InterfaceRealization', label: 'Interface realization', icon: ICONS.realization },
  { id: 'dependency', type: 'uml:Dependency', label: 'Dependency', icon: ICONS.dependency }
];

// the key of a new qualifier, edited right away
const NEW_QUALIFIER = 'key';


/**
 * Replace menu provider for class diagrams:
 *
 *   * the kind of classifiers (class, abstract class, interface, enumeration)
 *   * the kind of relationships, aggregations and compositions with their diamond
 *     at either classifier, named after it
 *   * reversing the direction of a relationship, which moves the diamond of
 *     aggregations and compositions to the other classifier
 *   * adding and removing the qualifiers of association ends
 *
 * The current kind is listed, marked and disabled.
 */
export default function ReplaceMenuProvider(popupMenu, modeling, rules, injector) {
  this._modeling = modeling;
  this._rules = rules;

  // to edit a new qualifier right away, missing in a viewer
  this._labelEditingProvider = injector.get('labelEditingProvider', false);

  popupMenu.registerProvider(REPLACE_MENU_ID, this);
}

ReplaceMenuProvider.$inject = [
  'popupMenu',
  'modeling',
  'rules',
  'injector'
];

ReplaceMenuProvider.prototype.getPopupMenuEntries = function(element) {
  if (isClassifier(element)) {
    return this._getClassifierEntries(element);
  }

  if (isConnection(element)) {
    return {
      ...this._getRelationshipEntries(element),
      ...this._getReverseEntry(element),
      ...this._getQualifierEntries(element)
    };
  }

  return {};
};

ReplaceMenuProvider.prototype._getClassifierEntries = function(element) {
  const modeling = this._modeling;

  const bo = element.businessObject;

  const entries = {};

  for (const option of CLASSIFIERS) {
    const isCurrent = is(bo, option.type) && (!is(bo, 'uml:Class') || !!bo.isAbstract === !!option.isAbstract);

    if (!isCurrent && !canChangeType(element, option.type)) {
      continue;
    }

    entries[`replace-with-${ option.id }`] = entry(option.label, option.icon, isCurrent, () => {
      modeling.replaceClassifier(element, { type: option.type, isAbstract: option.isAbstract });
    });
  }

  return entries;
};

ReplaceMenuProvider.prototype._getRelationshipEntries = function(element) {
  const modeling = this._modeling;

  const types = getRelationshipTypes(element.source, element.target);

  const entries = {};

  if (types.includes('uml:Association')) {
    const isAssociation = is(element, 'uml:Association');
    const part = isAssociation ? getPart(element) : -1;
    const aggregation = isAssociation ? getAggregation(element.businessObject) : null;

    entries['replace-with-association'] = entry('Association', ICONS.association, isAssociation && aggregation === 'none', () => {
      modeling.replaceRelationship(element, { type: 'uml:Association', aggregation: 'none' });
    });

    const names = [ getName(element.source), getName(element.target) ];

    for (const [ kind, label, verb, icon ] of [
      [ 'shared', 'Aggregation', 'has', ICONS.aggregation ],
      [ 'composite', 'Composition', 'owns', ICONS.composition ]
    ]) {

      // the part at the target first, as drawn
      for (const partIndex of [ 1, 0 ]) {
        const whole = names[1 - partIndex], partName = names[partIndex];

        // self associations are told apart by the end of the line the diamond is at
        const side = whole === partName ? (partIndex === 1 ? ' (diamond at the start)' : ' (diamond at the end)') : '';

        entries[`replace-with-${ kind }-${ partIndex }`] = entry(`${ label }: ${ whole } ${ verb } ${ partName }${ side }`, icon, aggregation === kind && part === partIndex, () => {
          modeling.replaceRelationship(element, { type: 'uml:Association', aggregation: kind, part: partIndex });
        });
      }
    }
  }

  for (const option of RELATIONSHIPS) {
    if (!types.includes(option.type)) {
      continue;
    }

    entries[`replace-with-${ option.id }`] = entry(option.label, option.icon, is(element, option.type), () => {
      modeling.replaceRelationship(element, { type: option.type });
    });
  }

  return entries;
};

/**
 * Generalizations, interface realizations and dependencies are reversed where their
 * kind fits the reversed ends, aggregations and compositions move their diamond.
 */
ReplaceMenuProvider.prototype._getReverseEntry = function(element) {
  const modeling = this._modeling;

  if (is(element, 'uml:Association')) {
    if (getPart(element) === -1) {
      return {};
    }

    return {
      'reverse': {
        label: 'Reverse direction',
        title: 'Move the diamond to the other classifier',
        imageUrl: ICONS.reverse,
        action: () => modeling.reverseRelationship(element)
      }
    };
  }

  const allowed = this._rules.allowed('connection.reconnect', {
    connection: element,
    source: element.target,
    target: element.source
  });

  return {
    'reverse': {
      label: 'Reverse direction',
      imageUrl: ICONS.reverse,
      disabled: !allowed,
      title: allowed ? undefined : `A ${ getRelationshipLabel(element) } cannot point the other way between these classifiers`,
      action: () => allowed && modeling.reverseRelationship(element)
    }
  };
};

/**
 * Each end of an association is qualified, or its qualifiers removed, at the
 * classifier it is attached to.
 */
ReplaceMenuProvider.prototype._getQualifierEntries = function(element) {
  if (!is(element, 'uml:Association')) {
    return {};
  }

  const modeling = this._modeling;
  const labelEditingProvider = this._labelEditingProvider;

  const entries = {};

  element.businessObject.get('memberEnd').forEach((end, index) => {
    const name = getName(index ? element.target : element.source);
    const qualifiers = getQualifierData(end);

    if (qualifiers.length) {
      entries[`remove-qualifiers-${ index }`] = {
        label: `Remove qualifiers at ${ name }`,
        imageUrl: ICONS.qualifier,
        action: () => modeling.updateEnd(element, index, formatEnd(getEndData(end)))
      };

      return;
    }

    entries[`add-qualifier-${ index }`] = {
      label: `Add qualifier at ${ name }`,
      imageUrl: ICONS.qualifier,
      action: () => {
        modeling.updateEnd(element, index, formatEndText([ { name: NEW_QUALIFIER } ], getEndData(end)));

        if (labelEditingProvider) {
          labelEditingProvider.editQualifiers(element, index);
        }
      }
    };
  });

  return entries;
};


// helpers //////////

/**
 * A menu entry, marked and disabled if it is the current kind.
 */
function entry(label, imageUrl, isCurrent, action) {
  return {
    label: isCurrent ? `${ label } (current)` : label,
    imageUrl,
    disabled: isCurrent,
    action: () => !isCurrent && action()
  };
}

/**
 * @return {number} the end of the part of an aggregation or composition, -1 for other associations
 */
function getPart(connection) {
  return connection.businessObject.get('memberEnd').findIndex(end => end.aggregation && end.aggregation !== 'none');
}

function getName(shape) {
  return (shape && shape.businessObject.name) || 'unnamed';
}

function getRelationshipLabel(connection) {
  const option = RELATIONSHIPS.find(option => is(connection, option.type));

  return option ? option.label.toLowerCase() : 'relationship';
}

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
