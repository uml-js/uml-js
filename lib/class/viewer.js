import BaseViewer from '../core/BaseViewer.js';

import DrawModule from './draw/index.js';
import ImportModule from './import/index.js';

import ElementFactory from './modeling/ElementFactory.js';


/**
 * A viewer for UML class diagrams (`umldi:UMLClassDiagram`).
 */
export default class ClassViewer extends BaseViewer {

  static modules = [
    ...BaseViewer.modules,
    { elementFactory: [ 'type', ElementFactory ] },
    DrawModule,
    ImportModule
  ];
}
