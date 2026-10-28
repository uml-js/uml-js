import { domify, remove as domRemove } from 'min-dom';

import UmlModdle from './moddle/index.js';

import StateMachineViewer from './state-machine/viewer.js';
import StateMachineModeler from './state-machine/modeller.js';

import ClassViewer from './class/viewer.js';
import ClassModeler from './class/modeller.js';

import ComponentViewer from './component/viewer.js';
import ComponentModeler from './component/modeller.js';

import ActivityViewer from './activity/viewer.js';
import ActivityModeler from './activity/modeller.js';

import UseCaseViewer from './use-case/viewer.js';
import UseCaseModeler from './use-case/modeller.js';

import DeploymentViewer from './deployment/viewer.js';
import DeploymentModeler from './deployment/modeller.js';

import PackageViewer from './package/viewer.js';
import PackageModeler from './package/modeller.js';

import SequenceViewer from './sequence/viewer.js';
import SequenceModeler from './sequence/modeller.js';

import { createStateMachineXML } from './state-machine/new-diagram.js';
import { createClassXML } from './class/new-diagram.js';
import { createComponentXML } from './component/new-diagram.js';
import { createDeploymentXML } from './deployment/new-diagram.js';
import { createPackageXML } from './package/new-diagram.js';
import { createSequenceXML } from './sequence/new-diagram.js';
import { createActivityXML } from './activity/new-diagram.js';
import { createUseCaseXML } from './use-case/new-diagram.js';


/**
 * Diagram types this library can show, by UML DI diagram type.
 *
 * To add a diagram type, add a folder `lib/{diagram-type}` with a `viewer.js`,
 * a `modeller.js` and a `new-diagram.js` (XMI of a new model) and register it here,
 * in alphabetical order (the order of the tiles of the app).
 *
 * `modelTypes` are the types of model elements that diagrams of a type show, for
 * creating an empty diagram when drilling down into one without (see Manager#drillDown).
 */
export const DIAGRAM_TYPES = [
  {
    id: 'activity',
    name: 'Activity Diagram',
    diType: 'umldi:UMLActivityDiagram',
    modelTypes: [ 'uml:Activity' ],
    Viewer: ActivityViewer,
    Modeler: ActivityModeler,
    createXML: createActivityXML
  },
  {
    id: 'class',
    name: 'Class Diagram',
    diType: 'umldi:UMLClassDiagram',
    Viewer: ClassViewer,
    Modeler: ClassModeler,
    createXML: createClassXML
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
    id: 'deployment',
    name: 'Deployment Diagram',
    diType: 'umldi:UMLDeploymentDiagram',
    Viewer: DeploymentViewer,
    Modeler: DeploymentModeler,
    createXML: createDeploymentXML
  },
  {
    id: 'package',
    name: 'Package Diagram',
    diType: 'umldi:UMLPackageDiagram',
    Viewer: PackageViewer,
    Modeler: PackageModeler,
    createXML: createPackageXML
  },
  {
    id: 'sequence',
    name: 'Sequence Diagram',
    diType: 'umldi:UMLInteractionDiagram',
    accepts: diagram => diagram.kind === 'sequence',
    Viewer: SequenceViewer,
    Modeler: SequenceModeler,
    createXML: createSequenceXML
  },
  {
    id: 'state-machine',
    name: 'State Machine Diagram',
    diType: 'umldi:UMLStateMachineDiagram',
    modelTypes: [ 'uml:StateMachine' ],
    Viewer: StateMachineViewer,
    Modeler: StateMachineModeler,
    createXML: createStateMachineXML
  },
  {
    id: 'use-case',
    name: 'Use Case Diagram',
    diType: 'umldi:UMLUseCaseDiagram',
    Viewer: UseCaseViewer,
    Modeler: UseCaseModeler,
    createXML: createUseCaseXML
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
 * // a diagram of e.g. the activity a call behavior action calls, as the
 * // drill-down buttons on such elements do; `getPath()` is the way there
 * await modeler.drillDown(activity);
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

    // viewers of deleted views, kept for undoing the deletion
    this._removedViewers = new Set();

    // the views drilled down into, from the view opened last (see #open, #drillDown)
    this._path = [];

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
    this._path = [];

    this._emit('import.parse.complete', { document, warnings });

    const view = this._views[0];

    if (view) {
      const result = await this.open(view);

      warnings.push(...result.warnings);
    } else {
      this._emit('views.changed', { views: this._views, activeView: null, path: [] });
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
   * A view on the path drilled down (see #getPath) goes back to it,
   * any other starts a new path.
   *
   * @param {Object} view one of `getViews()`
   *
   * @return {Promise<{ warnings: Array<Object> }>}
   */
  async open(view) {
    if (!this._views.includes(view)) {
      throw new Error('unknown view');
    }

    const index = this._path.indexOf(view);

    this._path = index === -1 ? [ view ] : this._path.slice(0, index + 1);

    return this._show(view);
  }

  /**
   * Show a diagram of a model element, e.g. of the activity a call behavior action
   * calls, as bpmn-js shows the content of collapsed subprocesses. Without a diagram
   * of the model element, an empty one is created and added to the document.
   *
   * @param {ModdleElement|Object} element or the view to show, e.g. of the
   * sub-states of a composite state whose decomposition is hidden
   *
   * @return {Promise<{ warnings: Array<Object> }>}
   */
  async drillDown(element) {
    let view = this._views.includes(element) ? element : this.getViewOf(element);

    if (!view) {
      view = this._createDiagram(element);
    }

    this._path = [ ...this._path, view ];

    return this._show(view);
  }

  /**
   * Delete a view, i.e. remove its diagram from the document. The model elements
   * it shows are kept. If it is shown, the view drilled down from or else the
   * one before it is shown instead.
   *
   * Deleting is a command of the view shown afterwards, so that undoing there
   * restores the deleted view.
   *
   * @param {Object} view one of `getViews()`
   *
   * @return {Promise<void>}
   */
  async deleteView(view) {
    const views = this._views;
    const index = views.indexOf(view);

    if (index === -1) {
      throw new Error('unknown view');
    }

    if (view === this._activeView) {
      const pathIndex = this._path.indexOf(view);

      const next = pathIndex > 0 ? this._path[pathIndex - 1] : views[index - 1] || views[index + 1];

      // the last view, which leaves no view to undo in
      if (!next) {
        this.getActiveViewer().detach();

        this._removeView(view);

        this._activeView = null;
        this._path = [];

        this._emit('views.changed', { views, activeView: null, path: [] });

        return;
      }

      this._path = this._path.includes(next) ? this._path.slice(0, this._path.indexOf(next) + 1) : [ next ];

      await this._show(next);
    }

    this.getActiveViewer().get('commandStack').execute('view.delete', { manager: this, view });
  }

  /**
   * Rename a view: its diagram and the model element shown, e.g. an activity,
   * whose name other diagrams show, too, e.g. in call behavior actions.
   *
   * Renaming is a command of the view shown, so that undoing there restores the name.
   *
   * @param {Object} view one of `getViews()`
   * @param {string} name
   */
  renameView(view, name) {
    if (!this._views.includes(view)) {
      throw new Error('unknown view');
    }

    this.getActiveViewer().get('commandStack').execute('view.rename', { manager: this, view, name });
  }

  /**
   * Remove a view and its diagram, keeping its viewer for restoring them (see DeleteViewHandler).
   *
   * @return {Object} where the view was, for #_restoreView
   */
  _removeView(view) {
    const contents = this._document.contents;
    const views = this._views;

    const removed = {
      contentsIndex: contents.indexOf(view.element),
      viewsIndex: views.indexOf(view),
      viewer: this._viewers.get(view)
    };

    contents.splice(removed.contentsIndex, 1);
    views.splice(removed.viewsIndex, 1);

    this._path = this._path.filter(pathView => pathView !== view);

    if (removed.viewer) {
      this._viewers.delete(view);
      this._removedViewers.add(removed.viewer);
    }

    return removed;
  }

  _restoreView(view, removed) {
    this._document.contents.splice(removed.contentsIndex, 0, view.element);
    this._views.splice(removed.viewsIndex, 0, view);

    if (removed.viewer) {
      this._removedViewers.delete(removed.viewer);
      this._viewers.set(view, removed.viewer);
    }
  }

  _emitViewsChanged() {
    this._emit('views.changed', { views: this._views, activeView: this._activeView, path: this._path });
  }

  async _show(view) {
    let viewer = this._viewers.get(view);
    let warnings = [];

    if (!viewer) {
      const Viewer = this._getViewerClass(view.diagramType);

      const options = this._options;

      const viewerOptions = { ...options.common, ...options[view.type] };

      // diagram types adding and removing diagrams, e.g. of states collapsed, do so via the manager
      viewer = new Viewer({
        ...viewerOptions,
        moddle: this._moddle,
        additionalModules: [
          ...(viewerOptions.additionalModules || []),
          { umlManager: [ 'value', this ] }
        ]
      });

      ({ warnings } = await viewer.open(view.element));

      viewer.on('drilldown.open', ({ target }) => this.drillDown(target));

      viewer.get('commandStack').registerHandler('view.delete', DeleteViewHandler);
      viewer.get('commandStack').registerHandler('view.rename', RenameViewHandler);

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

    this._emitViewsChanged();

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

  /**
   * @param {ModdleElement} element
   *
   * @return {Object|undefined} the view of a diagram of the model element, e.g. of an activity
   */
  getViewOf(element) {
    return this._views.find(view => view.element.get('modelElement')[0] === element);
  }

  /**
   * @return {Array<Object>} the views drilled down into, ending with the view shown
   */
  getPath() {
    return this._path;
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
        views.push(createView(element, diagramType));
      }
    }

    return views;
  }

  /**
   * Add an empty diagram of a model element to the document.
   *
   * @param {ModdleElement} element
   *
   * @return {Object} the view of the diagram
   */
  _createDiagram(element) {
    const diagramType = DIAGRAM_TYPES.find(type => (type.modelTypes || []).some(modelType => element.$instanceOf(modelType)));

    if (!diagramType) {
      throw new Error(`no diagram type showing <${ element.$type }>`);
    }

    const contents = this._document.contents;

    let id = `${ element.id }_diagram`;

    for (let i = 2; contents.some(content => content.id === id); i++) {
      id = `${ element.id }_diagram_${ i }`;
    }

    const diagram = this._moddle.create(diagramType.diType, {
      id,
      name: element.name || element.id,
      modelElement: [ element ]
    });

    return this._addView(diagram);
  }

  /**
   * Add a diagram to the document, e.g. of a state collapsed.
   *
   * @param {ModdleElement} diagram
   *
   * @return {Object} the view of the diagram
   */
  _addView(diagram) {
    const diagramType = DIAGRAM_TYPES.find(type => diagram.$instanceOf(type.diType) && (!type.accepts || type.accepts(diagram)));

    this._document.contents.push(diagram);

    const view = createView(diagram, diagramType);

    this._views.push(view);

    return view;
  }

  _destroyViewers() {
    for (const viewer of [ ...this._viewers.values(), ...this._removedViewers ]) {
      viewer.destroy();
    }

    this._viewers.clear();
    this._removedViewers.clear();
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

export { createStateMachineXML, createClassXML, createComponentXML, createDeploymentXML, createPackageXML, createSequenceXML, createActivityXML, createUseCaseXML };


/**
 * Deletes a view (see Manager#deleteView), as a command of the view shown,
 * so that undoing restores it.
 */
function DeleteViewHandler() {}

DeleteViewHandler.prototype.execute = function(context) {
  const { manager, view } = context;

  context.removed = manager._removeView(view);

  manager._emitViewsChanged();

  return [];
};

DeleteViewHandler.prototype.revert = function(context) {
  const { manager, view, removed } = context;

  manager._restoreView(view, removed);

  manager._emitViewsChanged();

  return [];
};

/**
 * Renames a view (see Manager#renameView), as a command of the view shown,
 * so that undoing restores the name.
 */
function RenameViewHandler() {}

RenameViewHandler.prototype.execute = function(context) {
  const { manager, view, name } = context;

  const diagram = view.element;
  const element = diagram.get('modelElement')[0];

  context.oldNames = { diagram: diagram.name, element: element && element.name };

  setViewName(view, name, element && name);

  manager._emitViewsChanged();

  return [];
};

RenameViewHandler.prototype.revert = function(context) {
  const { manager, view, oldNames } = context;

  setViewName(view, oldNames.diagram, oldNames.element);

  manager._emitViewsChanged();

  return [];
};

function setViewName(view, diagramName, elementName) {
  const diagram = view.element;
  const element = diagram.get('modelElement')[0];

  diagram.set('name', diagramName);

  if (element) {
    element.set('name', elementName);
  }

  view.name = diagramName || view.id;
}

function createView(element, diagramType) {
  return {
    id: element.id,
    name: element.name || element.id,
    type: diagramType.id,
    diagramType,
    element
  };
}

function redraw(viewer) {
  const elementRegistry = viewer.get('elementRegistry');
  const eventBus = viewer.get('eventBus');

  eventBus.fire('elements.changed', { elements: elementRegistry.filter(element => element.parent) });
}
