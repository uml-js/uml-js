import inherits from 'inherits-browser';

import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer.js';

import {
  append as svgAppend,
  attr as svgAttr,
  create as svgCreate
} from 'tiny-svg';

import { query as domQuery } from 'min-dom';

import { createLine } from 'diagram-js/lib/util/RenderUtil.js';

import { is } from '../../core/util/ModelUtil.js';

import { getKeywordCenter } from '../../core/util/KeywordUtil.js';

import { getRelationshipKind, getTabWidth, showsContents, TAB_HEIGHT } from '../util/ElementUtil.js';

import { getConnectionPath } from '../../core/draw/PathUtil.js';

const STROKE = '#22242a';
const FILL = '#ffffff';
const STROKE_WIDTH = 1.5;

const CONNECTION_RADIUS = 5;
const DASH = '6 4';

const KEYWORD_WIDTH = 70;
const KEYWORD_HEIGHT = 16;

let markerCount = 0;


/**
 * Renders package diagram elements following the UML 2.5.1 notation.
 */
export default function PackageRenderer(eventBus, canvas, textRenderer) {

  BaseRenderer.call(this, eventBus, 1000);

  this._canvas = canvas;
  this._textRenderer = textRenderer;

  this._markerId = `uml-package-${ ++markerCount }-open`;
  this._hasMarker = false;
}

inherits(PackageRenderer, BaseRenderer);

PackageRenderer.$inject = [
  'eventBus',
  'canvas',
  'textRenderer'
];

PackageRenderer.prototype.canRender = function(element) {
  return [
    'uml:Package',
    'uml:Dependency',
    'uml:PackageImport',
    'uml:PackageMerge'
  ].some(type => is(element, type));
};

/**
 * A tab on top of the body, the name in the tab if contents are shown,
 * in the body otherwise.
 */
PackageRenderer.prototype.drawShape = function(parentGfx, element) {
  const { width, height } = element;
  const name = element.businessObject.name || '';

  const tabWidth = getTabWidth(element, this._textRenderer);

  const attrs = {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    fill: FILL
  };

  svgAppendTo(parentGfx, svgCreate('rect', { x: 0, y: 0, width: tabWidth, height: TAB_HEIGHT, ...attrs }));

  const body = svgAppendTo(parentGfx, svgCreate('rect', { x: 0, y: TAB_HEIGHT, width, height: height - TAB_HEIGHT, ...attrs }));

  const inTab = showsContents(element);

  this._drawText(parentGfx, name, {
    box: inTab ? { width: tabWidth, height: TAB_HEIGHT } : { width, height: height - TAB_HEIGHT },
    align: 'center-middle',
    padding: inTab ? 0 : 5,
    style: { fontWeight: 'bold' }
  }, inTab ? 0 : TAB_HEIGHT);

  return body;
};

PackageRenderer.prototype.drawConnection = function(parentGfx, connection) {
  const line = svgAppendTo(parentGfx, createLine(connection.waypoints, {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    strokeLinejoin: 'round',
    strokeDasharray: DASH,
    fill: 'none',
    markerEnd: `url(#${ this._getMarker() })`
  }, CONNECTION_RADIUS));

  const kind = getRelationshipKind(connection.businessObject);

  if (kind !== 'dependency') {
    const text = this._drawText(parentGfx, `«${ kind }»`, {
      box: { width: KEYWORD_WIDTH, height: KEYWORD_HEIGHT },
      align: 'center-middle',
      padding: 0
    });

    const size = { width: this._textRenderer.getTextWidth(`«${ kind }»`), height: KEYWORD_HEIGHT };
    const center = getKeywordCenter(connection.waypoints, size);

    svgAttr(text, {
      transform: `translate(${ center.x - KEYWORD_WIDTH / 2 }, ${ center.y - KEYWORD_HEIGHT / 2 })`
    });
  }

  return line;
};

/**
 * The outline of tab and body, so that connections dock to either.
 */
PackageRenderer.prototype.getShapePath = function(element) {
  const { x, y, width, height } = element;

  const tabWidth = getTabWidth(element, this._textRenderer);

  return `M${ x },${ y }h${ tabWidth }v${ TAB_HEIGHT }h${ width - tabWidth }v${ height - TAB_HEIGHT }h${ -width }z`;
};

PackageRenderer.prototype.getConnectionPath = function(connection) {
  return getConnectionPath(connection);
};


// helpers //////////

PackageRenderer.prototype._drawText = function(parentGfx, text, options, y = 0) {
  const textElement = this._textRenderer.createText(text, {
    ...options,
    style: {
      ...this._textRenderer.getDefaultStyle(),
      fill: STROKE,
      ...options.style
    }
  });

  svgAttr(textElement, { class: 'djs-label' });

  if (y) {
    svgAttr(textElement, { transform: `translate(0, ${ y })` });
  }

  return svgAppendTo(parentGfx, textElement);
};

/**
 * The open arrow head of dependencies.
 */
PackageRenderer.prototype._getMarker = function() {
  const id = this._markerId;

  if (this._hasMarker) {
    return id;
  }

  const svg = this._canvas._svg;

  let defs = domQuery('defs', svg);

  if (!defs) {
    defs = svgCreate('defs');

    svgAppend(svg, defs);
  }

  const marker = svgCreate('marker', {
    id,
    viewBox: '0 0 20 20',
    refX: 19,
    refY: 10,
    markerWidth: 14,
    markerHeight: 14,
    markerUnits: 'userSpaceOnUse',
    orient: 'auto'
  });

  svgAppend(marker, svgCreate('path', {
    d: 'M 1 3 L 19 10 L 1 17',
    fill: 'none',
    stroke: STROKE,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }));

  svgAppend(defs, marker);

  this._hasMarker = true;

  return id;
};

function svgAppendTo(parentGfx, element) {
  svgAppend(parentGfx, element);

  return element;
}
