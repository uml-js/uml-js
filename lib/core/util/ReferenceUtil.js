/**
 * Replaces all references to a model element within a model, e.g. when a
 * model element is swapped for one of another type.
 *
 * @param {ModdleElement} root the model to search
 * @param {ModdleElement} from
 * @param {ModdleElement} to
 *
 * @return {Object[]} the replaced references, see `revertReferences`
 */
export function replaceReferences(root, from, to) {
  const changes = [];

  visit(root, element => {
    for (const property of element.$descriptor.properties) {
      if (!property.isReference) {
        continue;
      }

      const value = element.get(property.name);

      if (property.isMany) {
        value.forEach((referenced, index) => {
          if (referenced === from) {
            value[index] = to;
            changes.push({ element, name: property.name, index, from, to });
          }
        });
      } else if (value === from) {
        element.set(property.name, to);
        changes.push({ element, name: property.name, from, to });
      }
    }
  });

  return changes;
}

/**
 * @param {Object[]} changes as returned by `replaceReferences`
 */
export function revertReferences(changes) {
  for (const { element, name, index, from } of [ ...changes ].reverse()) {
    if (index !== undefined) {
      element.get(name)[index] = from;
    } else {
      element.set(name, from);
    }
  }
}

/**
 * Tell whether anything outside a model element refers to it or to an element it contains.
 *
 * @param {ModdleElement[]} roots the models and diagrams to search
 * @param {ModdleElement} element
 *
 * @return {boolean}
 */
export function isReferenced(roots, element) {
  const contained = new Set();

  visit(element, child => contained.add(child));

  let referenced = false;

  for (const root of roots.filter(root => root.$descriptor)) {
    visit(root, referrer => {
      if (contained.has(referrer)) {
        return;
      }

      for (const property of referrer.$descriptor.properties) {
        if (!property.isReference) {
          continue;
        }

        const value = referrer.get(property.name);

        if ((property.isMany ? value : [ value ]).some(target => contained.has(target))) {
          referenced = true;
        }
      }
    });
  }

  return referenced;
}

/**
 * Remove those of the given model elements that nothing outside them refers to, and thereby
 * also those that only a removed element referred to.
 *
 * @param {ModdleElement[]} contents the models and diagrams of the document
 * @param {Iterable<ModdleElement>} elements
 *
 * @return {Object[]} the removals, see `restoreRemoved`
 */
export function removeUnreferenced(contents, elements) {
  const removed = [];
  const candidates = new Set(elements);

  let changed = true;

  while (changed) {
    changed = false;

    for (const element of candidates) {
      if (!isReferenced(contents, element)) {
        removed.push(removeFromOwner(contents, element));
        candidates.delete(element);
        changed = true;
      }
    }
  }

  return removed;
}

/**
 * @param {Object[]} removed as returned by `removeUnreferenced`
 */
export function restoreRemoved(removed) {
  for (const { element, elements, index } of [ ...removed ].reverse()) {
    elements.splice(index, 0, element);
  }
}

function removeFromOwner(contents, element) {
  const owner = element.$parent;

  const property = owner && owner.$descriptor.properties.find(({ isMany, isReference, name }) => {
    return isMany && !isReference && owner.get(name).includes(element);
  });

  const elements = property ? owner.get(property.name) : contents;
  const index = elements.indexOf(element);

  elements.splice(index, 1);

  return { element, elements, index };
}

/**
 * @param {ModdleElement} root
 * @param {(element: ModdleElement) => void} fn called for the root and all (transitively) contained elements
 */
export function visit(root, fn) {
  fn(root);

  for (const property of root.$descriptor.properties) {
    if (property.isReference) {
      continue;
    }

    const value = root.get(property.name);

    for (const child of (property.isMany ? value : [ value ])) {
      if (child && child.$descriptor) {
        visit(child, fn);
      }
    }
  }
}
