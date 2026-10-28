import BaseViewer from '../core/BaseViewer.js';

import DrawModule from './draw/index.js';
import DrilldownModule from './drilldown/index.js';
import ImportModule from './import/index.js';

import ElementFactory from './modeling/ElementFactory.js';


/**
 * A viewer for UML activity diagrams (`umldi:UMLActivityDiagram`).
 */
export default class ActivityViewer extends BaseViewer {

  static modules = [
    ...BaseViewer.modules,
    { elementFactory: [ 'type', ElementFactory ] },
    DrawModule,
    DrilldownModule,
    ImportModule
  ];
}
