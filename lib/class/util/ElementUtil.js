import { is, isLabel } from '../../core/util/ModelUtil.js';


/**
 * Classes, interfaces and enumerations, shown as boxes with compartments.
 */
export function isClassifier(element) {
  return [ 'uml:Class', 'uml:Interface', 'uml:Enumeration' ].some(type => is(element, type)) &&
    !isLabel(element) && !(element && element.waypoints);
}

export function isInterface(element) {
  return is(element, 'uml:Interface') && isClassifier(element);
}

export function isEnumeration(element) {
  return is(element, 'uml:Enumeration') && isClassifier(element);
}

export function isAssociation(element) {
  return is(element, 'uml:Association') && !!(element && element.waypoints);
}

/**
 * @return {boolean} whether the label shows an association end
 */
export function isEndLabel(element) {
  return isLabel(element) && is(element.businessObject, 'uml:Property');
}

/**
 * @param {ModdleElement} bo
 *
 * @return {string|null} the keyword shown above the name
 */
export function getKeyword(bo) {
  if (is(bo, 'uml:Interface')) {
    return 'interface';
  }

  if (is(bo, 'uml:Enumeration')) {
    return 'enumeration';
  }

  return null;
}

/**
 * The aggregation of an association, the kind of its whole end.
 *
 * @param {ModdleElement} association
 *
 * @return {'none'|'shared'|'composite'}
 */
export function getAggregation(association) {
  const end = getEnds(association).find(end => end.aggregation && end.aggregation !== 'none');

  return end ? end.aggregation : 'none';
}

/**
 * The ends of an association, the source end (at the whole, if any) first.
 *
 * @param {ModdleElement} association
 *
 * @return {ModdleElement[]}
 */
export function getEnds(association) {
  return association.get('memberEnd');
}

export const DEFAULT_WIDTH = 160;
