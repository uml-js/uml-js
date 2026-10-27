import inherits from 'inherits-browser';

import LabelBehavior from '../../../core/modeling/behavior/LabelBehavior.js';

import { isEndLabel } from '../../util/ElementUtil.js';

import { getEnd } from '../../util/EndLabelUtil.js';


/**
 * Moves the labels of association ends with the end of the line.
 */
export default function EndLabelBehavior(eventBus, modeling) {
  LabelBehavior.call(this, eventBus, modeling);
}

inherits(EndLabelBehavior, LabelBehavior);

EndLabelBehavior.$inject = [
  'eventBus',
  'modeling'
];

EndLabelBehavior.prototype.getLabelAnchor = function(label, waypoints) {
  if (!isEndLabel(label)) {
    return LabelBehavior.prototype.getLabelAnchor.call(this, label, waypoints);
  }

  const index = label.labelTarget.businessObject.get('memberEnd').indexOf(label.businessObject);

  return getEnd(waypoints, index).point;
};
