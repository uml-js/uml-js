import RulesModule from 'diagram-js/lib/features/rules/index.js';

import PackageRules from './PackageRules.js';

export default {
  __depends__: [ RulesModule ],
  __init__: [ 'packageRules' ],
  packageRules: [ 'type', PackageRules ]
};
