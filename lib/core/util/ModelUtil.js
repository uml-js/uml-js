/**
 * @param {Element|ModdleElement} element
 *
 * @return {ModdleElement}
 */
export function getBusinessObject(element) {
  return (element && element.businessObject) || element;
}

/**
 * @param {Element} element
 *
 * @return {ModdleElement} the UML DI element
 */
export function getDi(element) {
  return element && element.di;
}

/**
 * Check whether an element (or its business object) is of the given type.
 *
 * @param {Element|ModdleElement} element
 * @param {string} type
 *
 * @return {boolean}
 */
export function is(element, type) {
  const bo = getBusinessObject(element);

  return !!bo && typeof bo.$instanceOf === 'function' && bo.$instanceOf(type);
}

/**
 * @param {Element|ModdleElement} element
 * @param {string[]} types
 *
 * @return {boolean}
 */
export function isAny(element, types) {
  return types.some(type => is(element, type));
}

/**
 * @param {Element} element
 *
 * @return {Element} the root element of the diagram the element belongs to
 */
export function getRoot(element) {
  while (element.parent) {
    element = element.parent;
  }

  return element;
}

export function isLabel(element) {
  return !!(element && element.labelTarget);
}

export function isConnection(element) {
  return !!(element && element.waypoints);
}

/**
 * @param {Element} element
 *
 * @return {boolean} whether the element is a note (UML comment), or the line
 * connecting it to an annotated element
 */
export function isComment(element) {
  return is(element, 'uml:Comment');
}
