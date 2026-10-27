import { replaceReferences, revertReferences } from '../../../core/util/ReferenceUtil.js';


/**
 * Replaces the references to a removed classifier, e.g. attribute types,
 * with a primitive type of the same name, so that they keep their notation.
 */
export default function UnreferenceTypeHandler(umlFactory) {
  this._umlFactory = umlFactory;
}

UnreferenceTypeHandler.$inject = [ 'umlFactory' ];

UnreferenceTypeHandler.prototype.execute = function(context) {
  const { classifier, pkg } = context;

  if (!context.primitive) {
    context.primitive = this._umlFactory.create('uml:PrimitiveType', { name: classifier.name });
  }

  const primitive = context.primitive;

  context.references = replaceReferences(pkg, classifier, primitive);

  if (context.references.length) {
    primitive.$parent = pkg;
    pkg.get('packagedElement').push(primitive);
  }

  return [];
};

UnreferenceTypeHandler.prototype.revert = function(context) {
  const { pkg, primitive, references } = context;

  revertReferences(references);

  const packaged = pkg.get('packagedElement');

  if (packaged.includes(primitive)) {
    packaged.splice(packaged.indexOf(primitive), 1);
    primitive.$parent = null;
  }

  return [];
};
