import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { is } from '../../../core/util/ModelUtil.js';


/**
 * Gives an action turned into a call behavior action an activity to call,
 * as a call behavior action requires a behavior (UML 2.5.1).
 */
export default function CallBehaviorActionBehavior(eventBus, modeling) {

  CommandInterceptor.call(this, eventBus);

  this.postExecuted('node.changeType', function({ context }) {
    const { element } = context;

    if (is(element, 'uml:CallBehaviorAction') && !element.businessObject.behavior) {
      modeling.createCalledActivity(element);
    }
  });
}

inherits(CallBehaviorActionBehavior, CommandInterceptor);

CallBehaviorActionBehavior.$inject = [
  'eventBus',
  'modeling'
];
