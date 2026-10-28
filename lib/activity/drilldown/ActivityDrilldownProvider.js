import { isAction, isCallingActivity } from '../util/ElementUtil.js';


/**
 * Call behavior actions calling an activity open the activity's diagram.
 */
export default function ActivityDrilldownProvider(drilldownOverlays) {
  drilldownOverlays.registerProvider(this);
}

ActivityDrilldownProvider.$inject = [ 'drilldownOverlays' ];

ActivityDrilldownProvider.prototype.getDrilldownTarget = function(element) {
  return isAction(element) && isCallingActivity(element.businessObject) ? element.businessObject.behavior : null;
};
