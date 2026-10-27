import BaseViewer from '../core/BaseViewer.js';

import DrawModule from './draw/index.js';
import ImportModule from './import/index.js';
import InteractionEventsModule from './interaction-events/index.js';

import ElementFactory from './modeling/ElementFactory.js';


/**
 * A viewer for UML sequence diagrams (`umldi:UMLInteractionDiagram` of kind `sequence`).
 */
export default class SequenceViewer extends BaseViewer {

  static modules = [
    ...BaseViewer.modules,
    { elementFactory: [ 'type', ElementFactory ] },
    DrawModule,
    ImportModule,
    InteractionEventsModule
  ];
}
