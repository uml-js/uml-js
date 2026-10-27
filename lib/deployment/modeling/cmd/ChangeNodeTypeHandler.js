import { replaceReferences, revertReferences } from '../../../core/util/ReferenceUtil.js';

const OWNED = [ 'nestedNode', 'deployment', 'ownedAttribute', 'ownedOperation', 'generalization', 'interfaceRealization' ];


/**
 * Changes the type of a node in place, e.g. into a device: a new model
 * element of the given type takes the old one's ID, name, nested nodes,
 * deployments, place in the model and diagram element. All references to
 * the old model element are moved to the new one.
 */
export default function ChangeNodeTypeHandler(umlFactory) {
  this._umlFactory = umlFactory;
}

ChangeNodeTypeHandler.$inject = [ 'umlFactory' ];

ChangeNodeTypeHandler.prototype.execute = function(context) {
  const { element, type } = context;

  const oldNode = context.oldNode = element.businessObject;

  // create once, so re-doing re-uses the same model element
  if (!context.newNode) {
    const node = context.newNode = this._umlFactory.create(type, { id: oldNode.id });

    for (const name of [ 'name', 'visibility', ...OWNED ]) {
      const value = oldNode.get(name);

      node.set(name, Array.isArray(value) ? [ ...value ] : value);
    }
  }

  return this._swap(context, oldNode, context.newNode, true);
};

ChangeNodeTypeHandler.prototype.revert = function(context) {
  revertReferences(context.references);

  return this._swap(context, context.newNode, context.oldNode, false);
};

ChangeNodeTypeHandler.prototype._swap = function(context, from, to, replace) {
  const { element } = context;

  const owner = from.$parent;

  if (owner) {
    const property = owner.get('nestedNode') && owner.get('nestedNode').includes(from) ? 'nestedNode' : 'packagedElement';
    const elements = owner.get(property);

    elements.splice(elements.indexOf(from), 1, to);

    if (replace) {
      context.references = replaceReferences(getModel(owner), from, to);
    }
  }

  to.$parent = owner;
  from.$parent = null;

  // owned elements are shared between both
  for (const name of OWNED) {
    to.get(name).forEach(child => {
      child.$parent = to;
    });
  }

  element.businessObject = to;
  element.type = to.$type;
  element.di.set('modelElement', [ to ]);

  return [ element, ...element.incoming, ...element.outgoing ];
};


function getModel(element) {
  while (element.$parent) {
    element = element.$parent;
  }

  return element;
}
