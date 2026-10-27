import { is } from '../../../core/util/ModelUtil.js';

import { replaceReferences, revertReferences } from '../../../core/util/ReferenceUtil.js';

import { getContentHeight, getContentWidth } from '../../util/CompartmentUtil.js';


/**
 * Changes the type of a classifier in place, e.g. a class to an interface:
 * a new model element of the given type takes the old one's ID, name,
 * members, relationships, place in the package and diagram element.
 * All references to the old model element (e.g. attribute types) are
 * moved to the new one.
 *
 * Enumeration literals and attributes are converted into each other,
 * operations of enumerations are dropped.
 */
export default function ChangeClassifierTypeHandler(umlFactory, modeling, textRenderer) {
  this._umlFactory = umlFactory;
  this._modeling = modeling;
  this._textRenderer = textRenderer;
}

ChangeClassifierTypeHandler.$inject = [ 'umlFactory', 'modeling', 'textRenderer' ];

ChangeClassifierTypeHandler.prototype.execute = function(context) {
  const { element, type } = context;

  const oldClassifier = context.oldClassifier = element.businessObject;

  // create once, so re-doing re-uses the same model element
  if (!context.newClassifier) {
    context.newClassifier = this._createClassifier(oldClassifier, type);
  }

  return this._swap(context, oldClassifier, context.newClassifier);
};

ChangeClassifierTypeHandler.prototype.revert = function(context) {
  revertReferences(context.references);

  return this._swap(context, context.newClassifier, context.oldClassifier, false);
};

ChangeClassifierTypeHandler.prototype.postExecute = function(context) {
  const { element } = context;

  const bo = element.businessObject;

  // all members shown, each on one line
  const height = getContentHeight(bo);
  const width = Math.max(element.width, getContentWidth(bo, this._textRenderer));

  if (height !== element.height || width !== element.width) {
    this._modeling.resizeShape(element, { x: element.x, y: element.y, width, height });
  }
};

ChangeClassifierTypeHandler.prototype._createClassifier = function(old, type) {
  const umlFactory = this._umlFactory;

  const classifier = umlFactory.create(type, { id: old.id });

  for (const name of [ 'name', 'visibility', 'isAbstract' ]) {
    if (old.get(name) !== undefined && classifier.$descriptor.propertiesByName[name]) {
      classifier.set(name, old.get(name));
    }
  }

  classifier.set('generalization', [ ...old.get('generalization') ]);

  if (is(old, 'uml:Class') && is(classifier, 'uml:Class')) {
    classifier.set('interfaceRealization', [ ...old.get('interfaceRealization') ]);
  }

  if (is(classifier, 'uml:Enumeration')) {
    const names = is(old, 'uml:Enumeration')
      ? old.get('ownedLiteral').map(literal => literal.name)
      : old.get('ownedAttribute').filter(attribute => !attribute.association).map(attribute => attribute.name);

    classifier.set('ownedLiteral', names.map(name => umlFactory.create('uml:EnumerationLiteral', { name })));
  } else if (is(old, 'uml:Enumeration')) {
    classifier.set('ownedAttribute', old.get('ownedLiteral').map(literal => umlFactory.create('uml:Property', { name: literal.name })));
  } else {
    classifier.set('ownedAttribute', [ ...old.get('ownedAttribute') ]);
    classifier.set('ownedOperation', [ ...old.get('ownedOperation') ]);
  }

  for (const name of [ 'generalization', 'interfaceRealization', 'ownedAttribute', 'ownedOperation', 'ownedLiteral' ]) {
    if (classifier.$descriptor.propertiesByName[name]) {
      classifier.get(name).forEach(child => {
        child.$parent = classifier;
      });
    }
  }

  return classifier;
};

ChangeClassifierTypeHandler.prototype._swap = function(context, from, to, replace = true) {
  const { element } = context;

  const owner = from.$parent;

  if (owner) {
    const elements = owner.get('packagedElement');

    elements.splice(elements.indexOf(from), 1, to);

    if (replace) {
      context.references = replaceReferences(getModel(owner), from, to);
    }
  }

  to.$parent = owner;
  from.$parent = null;

  // members are shared between both, e.g. generalizations
  for (const name of [ 'generalization', 'interfaceRealization', 'ownedAttribute', 'ownedOperation' ]) {
    if (to.$descriptor.propertiesByName[name]) {
      to.get(name).forEach(child => {
        child.$parent = to;
      });
    }
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
