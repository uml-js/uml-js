import { isSubmachineState } from '../util/ElementUtil.js';


/**
 * Submachine states open the diagram of the state machine they refer to.
 */
export default function StateMachineDrilldownProvider(drilldownOverlays) {
  drilldownOverlays.registerProvider(this);
}

StateMachineDrilldownProvider.$inject = [ 'drilldownOverlays' ];

StateMachineDrilldownProvider.prototype.getDrilldownTarget = function(element) {
  return isSubmachineState(element) ? element.businessObject.submachine : null;
};
