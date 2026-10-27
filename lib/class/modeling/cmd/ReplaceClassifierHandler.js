import { is } from '../../../core/util/ModelUtil.js';


/**
 * Changes a classifier into a class, an abstract class, an interface or an
 * enumeration, in a single command.
 */
export default function ReplaceClassifierHandler(modeling) {
  this._modeling = modeling;
}

ReplaceClassifierHandler.$inject = [ 'modeling' ];

ReplaceClassifierHandler.prototype.preExecute = function(context) {
  const { element, type, isAbstract } = context;

  const modeling = this._modeling;

  if (!is(element.businessObject, type)) {
    modeling.changeClassifierType(element, type);
  }

  if (type === 'uml:Class' && !!element.businessObject.isAbstract !== !!isAbstract) {
    modeling.updateProperties(element, { isAbstract: isAbstract || undefined });
  }
};

ReplaceClassifierHandler.prototype.execute = function() {};

ReplaceClassifierHandler.prototype.revert = function() {};
