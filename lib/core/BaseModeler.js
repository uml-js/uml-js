import BaseViewer from './BaseViewer.js';

import KeyboardMoveModule from 'diagram-js/lib/navigation/keyboard-move/index.js';

import ModelingModule from './modeling/index.js';
import OrderingModule from './ordering/index.js';
import KeyboardModule from './keyboard/index.js';


/**
 * Base for the modelers of all UML diagram types.
 */
export default class BaseModeler extends BaseViewer {

  static modules = [
    ...BaseViewer.modules,
    KeyboardMoveModule,
    ModelingModule,
    OrderingModule,
    KeyboardModule
  ];

  /**
   * @param {string} name
   * @param {Object} [context]
   */
  execute(name, context) {
    return this.get('commandStack').execute(name, context);
  }
}
