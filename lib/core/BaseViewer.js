import Diagram from 'diagram-js';

import SelectionModule from 'diagram-js/lib/features/selection/index.js';
import OverlaysModule from 'diagram-js/lib/features/overlays/index.js';
import MoveCanvasModule from 'diagram-js/lib/navigation/movecanvas/index.js';
import ZoomScrollModule from 'diagram-js/lib/navigation/zoomscroll/index.js';

import { domify, query as domQuery, remove as domRemove } from 'min-dom';

import { innerSVG } from 'tiny-svg';

import DrawModule from './draw/index.js';
import ImportModule from './import/index.js';
import CommentModule from './comment/index.js';


/**
 * Base for the viewers of all UML diagram types. A viewer shows a single
 * UML DI diagram of a model that is shared with other viewers.
 *
 * Subclasses provide diagram type specific modules via `static modules`.
 *
 * @param {Object} options
 * @param {UmlModdle} options.moddle the moddle instance the diagram was read with
 * @param {HTMLElement} [options.container] element to attach the viewer to
 * @param {Array<Object>} [options.additionalModules]
 */
export default class BaseViewer extends Diagram {

  static modules = [
    SelectionModule,
    OverlaysModule,
    MoveCanvasModule,
    ZoomScrollModule,
    CommentModule
  ];

  constructor(options = {}) {
    const {
      container: parentNode,
      moddle,
      additionalModules = [],
      ...config
    } = options;

    if (!moddle) {
      throw new Error('options.moddle is required');
    }

    const container = domify('<div class="uml-container" style="width: 100%; height: 100%; position: relative"></div>');

    super({
      ...config,
      canvas: { ...config.canvas, container },
      modules: [
        { moddle: [ 'value', moddle ] },
        DrawModule,
        ImportModule,
        ...new.target.modules,
        ...additionalModules
      ]
    });

    this._container = container;
    this._moddle = moddle;

    if (parentNode) {
      this.attachTo(parentNode);
    }
  }

  /**
   * Show a diagram.
   *
   * @param {ModdleElement} diagram a umldi:UMLDiagram
   *
   * @return {Promise<{ warnings: Array<Object> }>}
   */
  async open(diagram) {
    this.clear();

    const eventBus = this.get('eventBus');

    eventBus.fire('import.parse.complete', { diagram });

    let result;

    try {
      result = this.get('umlImporter').import(diagram);
    } catch (error) {
      eventBus.fire('import.done', { error, warnings: [] });

      throw error;
    }

    this._diagram = diagram;

    eventBus.fire('import.done', { error: null, warnings: result.warnings });

    return result;
  }

  /**
   * Export the shown diagram as SVG image.
   *
   * Adapted from bpmn-js, BaseViewer#saveSVG (https://github.com/bpmn-io/bpmn-js).
   *
   * @return {Promise<{ svg: string }>}
   */
  async saveSVG() {
    const canvas = this.get('canvas');

    const contentNode = canvas.getActiveLayer();
    const defsNode = domQuery('defs', canvas._svg);

    const contents = innerSVG(contentNode);
    const defs = defsNode ? `<defs>${ getExportedDefs(defsNode) }</defs>` : '';

    const bbox = contentNode.getBBox();

    const svg =
      '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
      `width="${ bbox.width }" height="${ bbox.height }" ` +
      `viewBox="${ bbox.x } ${ bbox.y } ${ bbox.width } ${ bbox.height }" version="1.1">` +
      defs + contents +
      '</svg>';

    return { svg };
  }

  /**
   * @return {ModdleElement} the currently shown umldi:UMLDiagram
   */
  getDiagram() {
    return this._diagram;
  }

  getModdle() {
    return this._moddle;
  }

  getContainer() {
    return this._container;
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

    this.get('eventBus').fire('attach');

    this.get('canvas').resized();
  }

  detach() {
    const parentNode = this._container.parentNode;

    if (!parentNode) {
      return;
    }

    this.get('eventBus').fire('detach');

    parentNode.removeChild(this._container);
  }

  on(events, priority, callback, that) {
    return this.get('eventBus').on(events, priority, callback, that);
  }

  off(events, callback) {
    this.get('eventBus').off(events, callback);
  }

  destroy() {
    super.destroy();

    domRemove(this._container);
  }
}


/**
 * The definitions used by the diagram, without the pattern of the
 * dotted background (diagram-js-grid), which is not exported.
 */
function getExportedDefs(defsNode) {
  const clone = defsNode.cloneNode(true);

  clone.querySelectorAll('pattern[id^="djs-grid-pattern"]').forEach(pattern => pattern.remove());

  return innerSVG(clone);
}
