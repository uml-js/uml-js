import ContextPadModule from 'diagram-js/lib/features/context-pad/index.js';
import ConnectModule from 'diagram-js/lib/features/connect/index.js';
import CreateModule from 'diagram-js/lib/features/create/index.js';

import AutoPlaceModule from '../../core/auto-place/index.js';
import ReplaceMenuModule from '../../core/popup-menu/index.js';

import StateMachineContextPadProvider from './StateMachineContextPadProvider.js';

export default {
  __depends__: [
    ContextPadModule,
    ConnectModule,
    CreateModule,
    AutoPlaceModule,
    ReplaceMenuModule
  ],
  __init__: [ 'stateMachineContextPadProvider' ],
  stateMachineContextPadProvider: [ 'type', StateMachineContextPadProvider ]
};
