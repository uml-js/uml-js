import { getDiCompartments, setDiCompartments } from '../../util/ElementUtil.js';

const BEHAVIOURS = [ 'entry', 'doActivity', 'exit' ];


/**
 * Adds the compartment for internal behaviours (entry, do, exit) to a simple
 * state, or removes it along with the behaviours. The compartment is kept
 * as `UMLCompartment` of the state's DI, so that it is shown while empty
 * (see ElementUtil#getDiCompartments).
 */
export default function UpdateBehavioursCompartmentHandler(umlFactory) {
  this._umlFactory = umlFactory;
}

UpdateBehavioursCompartmentHandler.$inject = [ 'umlFactory' ];

UpdateBehavioursCompartmentHandler.prototype.execute = function(context) {
  const { element, show } = context;

  const bo = element.businessObject;
  const di = element.di;

  context.oldCompartments = [ ...getDiCompartments(di) ];
  context.oldBehaviours = BEHAVIOURS.map(name => bo.get(name));

  if (show) {
    if (!context.compartment) {
      context.compartment = this._umlFactory.create('umldi:UMLCompartment');
    }

    setDiCompartments(di, [ context.compartment ]);
  } else {
    setDiCompartments(di, []);

    BEHAVIOURS.forEach(name => bo.set(name, undefined));
  }

  return [ element ];
};

UpdateBehavioursCompartmentHandler.prototype.revert = function(context) {
  const { element, oldCompartments, oldBehaviours } = context;

  setDiCompartments(element.di, oldCompartments);

  BEHAVIOURS.forEach((name, index) => element.businessObject.set(name, oldBehaviours[index]));

  return [ element ];
};
