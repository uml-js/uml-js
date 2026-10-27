/**
 * Sets properties of an element's model element.
 */
export default function UpdatePropertiesHandler() {}

UpdatePropertiesHandler.prototype.execute = function(context) {
  const { element, properties } = context;
  const bo = element.businessObject;

  context.oldProperties = Object.fromEntries(Object.keys(properties).map(name => [ name, bo.get(name) ]));

  setProperties(bo, properties);

  return [ element ];
};

UpdatePropertiesHandler.prototype.revert = function(context) {
  const { element, oldProperties } = context;

  setProperties(element.businessObject, oldProperties);

  return [ element ];
};

function setProperties(bo, properties) {
  for (const [ name, value ] of Object.entries(properties)) {
    bo.set(name, value);
  }
}
