import { getDecompositionView, isCollapsed, isSubmachineState } from '../util/ElementUtil.js';


/**
 * Submachine states open the diagram of the state machine they refer to,
 * collapsed states the diagram of their sub-states.
 */
export default function StateMachineDrilldownProvider(drilldownOverlays, injector) {

  // the manager of all diagrams (see lib/uml.js), knowing the diagrams of sub-states
  this._umlManager = injector.get('umlManager', false);

  drilldownOverlays.registerProvider(this);
}

StateMachineDrilldownProvider.$inject = [ 'drilldownOverlays', 'injector' ];

StateMachineDrilldownProvider.prototype.getDrilldownTarget = function(element) {
  if (isSubmachineState(element)) {
    return element.businessObject.submachine;
  }

  const manager = this._umlManager;

  return isCollapsed(element) && manager && getDecompositionView(manager, element.businessObject) || null;
};
