import inherits from 'inherits-browser';

import UmlLayouter from '../../core/layout/UmlLayouter.js';

import { isComposite, isPseudostate } from '../util/ElementUtil.js';


/**
 * Lays out transitions like sequence flows in bpmn-js, with choices
 * as gateways and composite states as expanded sub-processes.
 */
export default function StateMachineLayouter() {
  UmlLayouter.call(this);
}

inherits(StateMachineLayouter, UmlLayouter);

StateMachineLayouter.prototype.isGateway = function(element) {
  return isPseudostate(element, 'choice');
};

StateMachineLayouter.prototype.isContainer = function(element) {
  return isComposite(element);
};
