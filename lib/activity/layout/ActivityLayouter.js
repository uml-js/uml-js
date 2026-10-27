import inherits from 'inherits-browser';

import UmlLayouter from '../../core/layout/UmlLayouter.js';

import { isDecisionOrMerge } from '../util/ElementUtil.js';


/**
 * Lays out control flows like sequence flows in bpmn-js,
 * with decision and merge nodes as gateways.
 */
export default function ActivityLayouter() {
  UmlLayouter.call(this);
}

inherits(ActivityLayouter, UmlLayouter);

ActivityLayouter.prototype.isGateway = function(element) {
  return isDecisionOrMerge(element);
};
