/**
 * Updates the name of a package.
 */
export default function UpdateLabelHandler() {}

UpdateLabelHandler.prototype.execute = function(context) {
  const { element, newLabel } = context;

  context.oldName = element.businessObject.name;

  element.businessObject.set('name', (newLabel || '').trim() || undefined);

  return [ element ];
};

UpdateLabelHandler.prototype.revert = function(context) {
  const { element, oldName } = context;

  element.businessObject.set('name', oldName);

  return [ element ];
};
