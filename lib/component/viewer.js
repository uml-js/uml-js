import BaseViewer from '../core/BaseViewer.js';

import DrawModule from './draw/index.js';
import ImportModule from './import/index.js';

import ElementFactory from './modeling/ElementFactory.js';


/**
 * A viewer for UML component diagrams (`umldi:UMLComponentDiagram`).
 */
export default class ComponentViewer extends BaseViewer {

  static modules = [
    ...BaseViewer.modules,
    { elementFactory: [ 'type', ElementFactory ] },
    DrawModule,
    ImportModule
  ];
}
