import inherits from 'inherits-browser';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';


/**
 * Elements of all diagram types may be copied, as in bpmn-js (BpmnRules); diagram types
 * decide where they may be pasted with the rule `elements.create`.
 */
export default function CopyPasteRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(CopyPasteRules, RuleProvider);

CopyPasteRules.$inject = [ 'eventBus' ];

CopyPasteRules.prototype.init = function() {
  this.addRule('element.copy', function() {
    return true;
  });
};
