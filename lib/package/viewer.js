import BaseViewer from '../core/BaseViewer.js';

import DrawModule from './draw/index.js';
import ImportModule from './import/index.js';

import ElementFactory from './modeling/ElementFactory.js';


/**
 * A viewer for UML package diagrams (`umldi:UMLPackageDiagram`).
 */
export default class PackageViewer extends BaseViewer {

  static modules = [
    ...BaseViewer.modules,
    { elementFactory: [ 'type', ElementFactory ] },
    DrawModule,
    ImportModule
  ];
}
