import { getDefaultSize, isComposite } from '../../util/ElementUtil.js';


/**
 * Removes the compartment of a state with its content, sub-states and
 * entry / do / exit, in a single command. The state gets its default size,
 * shrinking towards its center.
 */
export default function RemoveCompartmentHandler(modeling) {
  this._modeling = modeling;
}

RemoveCompartmentHandler.$inject = [ 'modeling' ];

RemoveCompartmentHandler.prototype.preExecute = function(context) {
  const { element } = context;

  if (isComposite(element.businessObject)) {
    this._modeling.updateComposite(element, false);
  }

  this._modeling.updateBehavioursCompartment(element, false);
};

RemoveCompartmentHandler.prototype.execute = function() {};

RemoveCompartmentHandler.prototype.revert = function() {};

RemoveCompartmentHandler.prototype.postExecute = function(context) {
  const { element } = context;

  const size = getDefaultSize(element.businessObject);

  if (size.width === element.width && size.height === element.height) {
    return;
  }

  this._modeling.resizeShape(element, {
    x: Math.round(element.x + (element.width - size.width) / 2),
    y: Math.round(element.y + (element.height - size.height) / 2),
    ...size
  });
};
