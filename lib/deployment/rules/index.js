import RulesModule from 'diagram-js/lib/features/rules/index.js';

import DeploymentRules from './DeploymentRules.js';

export default {
  __depends__: [ RulesModule ],
  __init__: [ 'deploymentRules' ],
  deploymentRules: [ 'type', DeploymentRules ]
};
