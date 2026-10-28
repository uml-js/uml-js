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

/**
 * The collection holding a model element, e.g. the packaged elements of its package or
 * the owned behaviors of its class, or else the packaged elements of the nearest package.
 * Elements added to it are siblings of the element, e.g. a behavior called by
 * the element's behavior (see CreateCalledActivityHandler).
 *
 * @param {ModdleElement} element
 *
 * @return { { owner: ModdleElement, collection: Array<ModdleElement> } }
 */
export function getSiblings(element) {
  const owner = element.$parent;

  if (owner) {
    for (const property of owner.$descriptor.properties) {
      const value = owner.get(property.name);

      if (property.isMany && !property.isReference && Array.isArray(value) && value.includes(element)) {
        return { owner, collection: value };
      }
    }
  }

  let pkg = owner;

  while (pkg && !pkg.$instanceOf('uml:Package')) {
    pkg = pkg.$parent;
  }

  if (!pkg) {
    throw new Error(`no package to place a sibling of <${ element.id }> in`);
  }

  return { owner: pkg, collection: pkg.get('packagedElement') };
}

/**
 * Whether a model element or any element it contains matches, e.g. any element
 * of a model referring to another one.
 */
export function someElement(element, matches) {
  if (matches(element)) {
    return true;
  }

  // contained elements only, not referenced ones
  return element.$descriptor.properties.some(property => {
    if (property.isReference) {
      return false;
    }

    const value = element.get(property.name);
    const values = property.isMany ? value || [] : [ value ];

    return values.some(child => child && child.$descriptor && someElement(child, matches));
  });
}

/**
 * @param {Shape} element
 *
 * @return {Shape[]} the shapes inside a shape, at any depth, parents before their children
 */
export function getDescendantShapes(element) {
  return element.children
    .filter(child => !isLabel(child) && !child.waypoints)
    .flatMap(child => [ child, ...getDescendantShapes(child) ]);
}

/**
 * Whether connections of the diagram, e.g. lines of notes, have one end inside a
 * shape and the other outside.
 *
 * @param {Shape} element
 */
export function hasCrossingConnections(element) {
  const shapes = new Set(getDescendantShapes(element));

  const connections = [];

  const collect = shape => {
    for (const child of shape.children) {
      if (child.waypoints) {
        connections.push(child);
      } else {
        collect(child);
      }
    }
  };

  collect(getRoot(element));

  return connections.some(connection => shapes.has(connection.source) !== shapes.has(connection.target));
}
