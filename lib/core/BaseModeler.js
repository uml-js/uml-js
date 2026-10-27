import BaseViewer from './BaseViewer.js';

import KeyboardMoveModule from 'diagram-js/lib/navigation/keyboard-move/index.js';

import GridModule from 'diagram-js-grid';

import ModelingModule from './modeling/index.js';
import OrderingModule from './ordering/index.js';
import KeyboardModule from './keyboard/index.js';
import CommentModelingModule from './comment/modeling.js';


/**
 * Base for the modelers of all UML diagram types, with the dotted
 * background of the bpmn.io editors (diagram-js-grid) and notes.
 */
export default class BaseModeler extends BaseViewer {

  static modules = [
    ...BaseViewer.modules,
    KeyboardMoveModule,
    GridModule,
    ModelingModule,
    OrderingModule,
    KeyboardModule,
    CommentModelingModule
  ];

  /**
   * @param {string} name
   * @param {Object} [context]
   */
  execute(name, context) {
    return this.get('commandStack').execute(name, context);
  }
}
