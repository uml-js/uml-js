import ConnectModule from 'diagram-js/lib/features/connect/index.js';

import RequiredInterfaceConnect from './RequiredInterfaceConnect.js';

export default {
  __depends__: [ ConnectModule ],
  requiredInterfaceConnect: [ 'type', RequiredInterfaceConnect ]
};
