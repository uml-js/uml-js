import inherits from 'inherits-browser';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';


/**
 * Rules for connections of all diagram types: their bendpoints and segments
 * may be moved, previewed as connections of the same type.
 *
 * Like BpmnRules in bpmn-js (https://github.com/bpmn-io/bpmn-js).
 */
export default function ConnectionRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(ConnectionRules, RuleProvider);

ConnectionRules.$inject = [ 'eventBus' ];

ConnectionRules.prototype.init = function() {
  this.addRule('connection.updateWaypoints', function(context) {
    return { type: context.connection.type };
  });
};
