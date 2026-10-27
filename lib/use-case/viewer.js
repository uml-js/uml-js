import BaseViewer from '../core/BaseViewer.js';

import DrawModule from './draw/index.js';
import ImportModule from './import/index.js';

import ElementFactory from './modeling/ElementFactory.js';


/**
 * A viewer for UML use case diagrams (`umldi:UMLUseCaseDiagram`).
 */
export default class UseCaseViewer extends BaseViewer {

  static modules = [
    ...BaseViewer.modules,
    { elementFactory: [ 'type', ElementFactory ] },
    DrawModule,
    ImportModule
  ];
}
