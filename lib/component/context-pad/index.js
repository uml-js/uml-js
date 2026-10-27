import ContextPadModule from 'diagram-js/lib/features/context-pad/index.js';
import ConnectModule from 'diagram-js/lib/features/connect/index.js';
import CreateModule from 'diagram-js/lib/features/create/index.js';

import ReplaceMenuModule from '../../core/popup-menu/index.js';
import AutoPlaceModule from '../../core/auto-place/index.js';
import RequiredInterfaceConnectModule from '../connect/index.js';

import ComponentContextPadProvider from './ComponentContextPadProvider.js';

export default {
  __depends__: [
    ContextPadModule,
    ConnectModule,
    CreateModule,
    AutoPlaceModule,
    ReplaceMenuModule,
    RequiredInterfaceConnectModule
  ],
  __init__: [ 'componentContextPadProvider' ],
  componentContextPadProvider: [ 'type', ComponentContextPadProvider ]
};
