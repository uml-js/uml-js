import { is } from '../../core/util/ModelUtil.js';

import { visit } from '../../core/util/ReferenceUtil.js';

const TYPES = [ 'uml:Class', 'uml:Interface', 'uml:DataType' ];


/**
 * The type of the given name in a package, for attributes, parameters and
 * qualifiers written as text: classifiers before primitive types of the same
 * name, an unknown type created as a primitive type of the package.
 *
 * @param {ModdleElement} pkg
 * @param {string} name
 * @param {UmlFactory} umlFactory
 *
 * @return {ModdleElement}
 */
export function getType(pkg, name, umlFactory) {
  const candidates = pkg.get('packagedElement').filter(element => TYPES.some(type => is(element, type)) && element.name === name);
  const existing = candidates.find(element => !is(element, 'uml:PrimitiveType')) || candidates[0];

  if (existing) {
    return existing;
  }

  const type = umlFactory.create('uml:PrimitiveType', { name });

  type.$parent = pkg;
  pkg.get('packagedElement').push(type);

  return type;
}

/**
 * @param {ModdleElement} pkg
 *
 * @return {Set<ModdleElement>} the types of properties and parameters in the package, qualifiers included
 */
export function getUsedTypes(pkg) {
  const used = new Set();

  visit(pkg, element => {
    if ((is(element, 'uml:Property') || is(element, 'uml:Parameter')) && element.type) {
      used.add(element.type);
    }
  });

  return used;
}

/**
 * Remove the primitive types of a package that were used before an update and no longer are.
 *
 * @param {ModdleElement} pkg
 * @param {Set<ModdleElement>} usedBefore as returned by `getUsedTypes` before the update
 */
export function removeUnusedPrimitiveTypes(pkg, usedBefore) {
  const usedAfter = getUsedTypes(pkg);

  pkg.set('packagedElement', pkg.get('packagedElement').filter(packaged => {
    return !is(packaged, 'uml:PrimitiveType') || usedAfter.has(packaged) || !usedBefore.has(packaged);
  }));
}
