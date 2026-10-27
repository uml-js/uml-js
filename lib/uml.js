import { domify, remove as domRemove } from 'min-dom';

import UmlModdle from './moddle/index.js';

import StateMachineViewer from './state-machine/viewer.js';
import StateMachineModeler from './state-machine/modeller.js';

import ComponentViewer from './component/viewer.js';
import ComponentModeler from './component/modeller.js';

import SequenceViewer from './sequence/viewer.js';
import SequenceModeler from './sequence/modeller.js';

import { createStateMachineXML } from './state-machine/new-diagram.js';
import { createComponentXML } from './component/new-diagram.js';
import { createSequenceXML } from './sequence/new-diagram.js';


/**
 * Diagram types this library can show, by UML DI diagram type.
 *
 * To add a diagram type, add a folder `lib/{diagram-type}` with a `viewer.js`,
 * a `modeller.js` and a `new-diagram.js` (XMI of a new model) and register it here.
 */
export const DIAGRAM_TYPES = [
  {
    id: 'state-machine',
    name: 'State Machine Diagram',
    diType: 'umldi:UMLStateMachineDiagram',
    Viewer: StateMachineViewer,
    Modeler: StateMachineModeler,
    createXML: createStateMachineXML
  },
  {
    id: 'component',
    name: 'Component Diagram',
    diType: 'umldi:UMLComponentDiagram',
    Viewer: ComponentViewer,
    Modeler: ComponentModeler,
    createXML: createComponentXML
  },
  {
    id: 'sequence',
    name: 'Sequence Diagram',
    diType: 'umldi:UMLInteractionDiagram',
    accepts: diagram => diagram.kind === 'sequence',
    Viewer: SequenceViewer,
    Modeler: SequenceModeler,
    createXML: createSequenceXML
  }
];


/**
 * Opens UML files (XMI with UML DI) and shows each diagram in the
 * viewer or modeler for its diagram type.
 *
 * All diagrams share the same model: changes in one diagram are
 * reflected in the others and saved together.
 *
 * @example
 *
 * const modeler = new UmlModeler({ container: '#canvas' });
 *
 * await modeler.importXML(xml);
 *
 * modeler.getViews(); // [ { id, name, type, element }, ... ]
 *
 * await modeler.open(modeler.getViews()[1]);
 *
 * const { xml } = await modeler.saveXML();
 */
export class Manager {

  /**
   * @param {Object} [options]
   * @param {HTMLElement|string} [options.container]
   * @param {Object} [options.common] options passed to every viewer
   * @param {Object} [options[diagramTypeId]] options passed to viewers of a given type, e.g. `options['state-machine']`
   */
  constructor(options = {}) {
    this._options = options;

    this._container = domify('<div class="uml-js" style="width: 100%; height: 100%; position: relative"></div>');

    this._listeners = {};

    this._moddle = null;
    this._document = null;
    this._views = [];
    this._viewers = new Map();
    this._activeView = null;

    if (options.container) {
      this.attachTo(options.container);
    }
  }

  /**
   * The class used to show diagrams of the given type.
   *
   * @param {Object} diagramType see DIAGRAM_TYPES
   */
  _getViewerClass(diagramType) {
    throw new Error('not implemented');
  }

  /**
   * Import an XMI document and open its first diagram.
   *
   * @param {string} xml
   *
   * @return {Promise<{ warnings: Array<Object> }>}
   */
  async importXML(xml) {
    const moddle = new UmlModdle();

    const { document, warnings } = await moddle.fromXML(xml);

    this._destroyViewers();

    this._moddle = moddle;
    this._document = document;
    this._views = this._createViews(document);
    this._activeView = null;

    this._emit('import.parse.complete', { document, warnings });

    const view = this._views[0];

    if (view) {
      const result = await this.open(view);

      warnings.push(...result.warnings);
    } else {
      this._emit('views.changed', { views: this._views, activeView: null });
    }

    this._emit('import.done', { warnings });

    return { warnings };
  }

  /**
   * Serialize the document, including all diagrams.
   *
   * @param {{ format?: boolean }} [options]
   *
   * @return {Promise<{ xml: string }>}
   */
  async saveXML(options = { format: true }) {
    if (!this._document) {
      throw new Error('no document imported');
    }

    return this._moddle.toXML(this._document, options);
  }

  /**
   * Export the shown diagram as SVG image.
   *
   * @return {Promise<{ svg: string }>}
   */
  async saveSVG() {
    const viewer = this.getActiveViewer();

    if (!viewer) {
      throw new Error('no diagram shown');
    }

    return viewer.saveSVG();
  }

  /**
   * Show a view, i.e. a diagram, in the viewer for its diagram type.
   *
   * @param {Object} view one of `getViews()`
   *
   * @return {Promise<{ warnings: Array<Object> }>}
   */
  async open(view) {
    if (!this._views.includes(view)) {
      throw new Error('unknown view');
    }

    let viewer = this._viewers.get(view);
    let warnings = [];

    if (!viewer) {
      const Viewer = this._getViewerClass(view.diagramType);

      const options = this._options;

      viewer = new Viewer({
        ...options.common,
        ...options[view.type],
        moddle: this._moddle
      });

      ({ warnings } = await viewer.open(view.element));

      this._viewers.set(view, viewer);
    }

    const activeViewer = this.getActiveViewer();

    if (activeViewer && activeViewer !== viewer) {
      activeViewer.detach();
    }

    viewer.attachTo(this._container);

    // diagrams share a model, which may have changed in other views
    if (activeViewer && activeViewer !== viewer) {
      redraw(viewer);
    }

    this._activeView = view;

    this._emit('views.changed', { views: this._views, activeView: view });

    return { warnings };
  }

  /**
   * @return {Array<{ id: string, name: string, type: string, element: ModdleElement }>}
   */
  getViews() {
    return this._views;
  }

  getActiveView() {
    return this._activeView;
  }

  getActiveViewer() {
    return this._activeView ? this._viewers.get(this._activeView) : null;
  }

  /**
   * @return {XMIDocument|null}
   */
  getDocument() {
    return this._document;
  }

  getModdle() {
    return this._moddle;
  }

  attachTo(parentNode) {
    if (typeof parentNode === 'string') {
      parentNode = document.querySelector(parentNode);
    }

    if (!parentNode) {
      throw new Error('parentNode required');
    }

    this.detach();

    parentNode.appendChild(this._container);

    const viewer = this.getActiveViewer();

    if (viewer) {
      viewer.get('canvas').resized();
    }
  }

  detach() {
    domRemove(this._container);
  }

  on(event, callback) {
    (this._listeners[event] = this._listeners[event] || []).push(callback);
  }

  off(event, callback) {
    this._listeners[event] = (this._listeners[event] || []).filter(cb => cb !== callback);
  }

  destroy() {
    this._destroyViewers();
    this.detach();
  }

  _emit(event, payload) {
    (this._listeners[event] || []).forEach(callback => callback(payload));
  }

  _createViews(document) {
    const views = [];

    for (const element of document.contents) {
      const diagramType = DIAGRAM_TYPES.find(type => {
        return element.$instanceOf && element.$instanceOf(type.diType) && (!type.accepts || type.accepts(element));
      });

      if (diagramType) {
        views.push({
          id: element.id,
          name: element.name || element.id,
          type: diagramType.id,
          diagramType,
          element
        });
      }
    }

    return views;
  }

  _destroyViewers() {
    for (const viewer of this._viewers.values()) {
      viewer.destroy();
    }

    this._viewers.clear();
  }
}


/**
 * Shows UML diagrams read-only.
 */
export class UmlViewer extends Manager {
  _getViewerClass(diagramType) {
    return diagramType.Viewer;
  }
}


/**
 * Shows UML diagrams for editing.
 */
export class UmlModeler extends Manager {
  _getViewerClass(diagramType) {
    return diagramType.Modeler;
  }
}

export default UmlModeler;

export { UmlModdle };

export { createStateMachineXML, createComponentXML, createSequenceXML };


function redraw(viewer) {
  const elementRegistry = viewer.get('elementRegistry');
  const eventBus = viewer.get('eventBus');

  eventBus.fire('elements.changed', { elements: elementRegistry.filter(element => element.parent) });
}
