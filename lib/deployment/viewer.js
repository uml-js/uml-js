import BaseViewer from '../core/BaseViewer.js';

import DrawModule from './draw/index.js';

import ElementFactory from './modeling/ElementFactory.js';


/**
 * A viewer for UML deployment diagrams (`umldi:UMLDeploymentDiagram`).
 */
export default class DeploymentViewer extends BaseViewer {

  static modules = [
    ...BaseViewer.modules,
    { elementFactory: [ 'type', ElementFactory ] },
    DrawModule
  ];
}
