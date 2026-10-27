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
