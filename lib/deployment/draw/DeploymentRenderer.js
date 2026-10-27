import inherits from 'inherits-browser';

import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer.js';

import {
  append as svgAppend,
  attr as svgAttr,
  create as svgCreate
} from 'tiny-svg';

import { query as domQuery } from 'min-dom';

import { createLine } from 'diagram-js/lib/util/RenderUtil.js';

import { is, isLabel } from '../../core/util/ModelUtil.js';

import { getKeywordCenter } from '../../core/util/KeywordUtil.js';

import { DEPTH, getKeyword } from '../util/ElementUtil.js';

import { getConnectionPath } from '../../core/draw/PathUtil.js';

const STROKE = '#22242a';
const FILL = '#ffffff';
const SIDE_FILL = '#f2f2f2';
const STROKE_WIDTH = 1.5;

const CONNECTION_RADIUS = 5;
const DASH = '6 4';

const LINE_HEIGHT = 16;

const KEYWORD_WIDTH = 70;
const KEYWORD_HEIGHT = 16;

let markerCount = 0;


/**
 * Renders deployment diagram elements following the UML 2.5.1 notation.
 */
export default function DeploymentRenderer(eventBus, canvas, textRenderer) {

  BaseRenderer.call(this, eventBus, 1000);

  this._canvas = canvas;
  this._textRenderer = textRenderer;

  this._markerId = `uml-deployment-${ ++markerCount }-open`;
  this._hasMarker = false;
}

inherits(DeploymentRenderer, BaseRenderer);

DeploymentRenderer.$inject = [
  'eventBus',
  'canvas',
  'textRenderer'
];

DeploymentRenderer.prototype.canRender = function(element) {
  return [
    'uml:Node',
    'uml:Artifact',
    'uml:CommunicationPath',
    'uml:Dependency'
  ].some(type => is(element, type)) && !isLabel(element);
};

DeploymentRenderer.prototype.drawShape = function(parentGfx, element) {
  const { width, height } = element;
  const bo = element.businessObject;

  const attrs = {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    strokeLinejoin: 'round'
  };

  let shape;

  if (is(bo, 'uml:Node')) {

    // a box: the front, its top and right side
    svgAppendTo(parentGfx, svgCreate('path', {
      d: `M0,${ DEPTH }L${ DEPTH },0H${ width }L${ width - DEPTH },${ DEPTH }Z`,
      fill: SIDE_FILL,
      ...attrs
    }));

    svgAppendTo(parentGfx, svgCreate('path', {
      d: `M${ width - DEPTH },${ DEPTH }L${ width },0V${ height - DEPTH }L${ width - DEPTH },${ height }Z`,
      fill: SIDE_FILL,
      ...attrs
    }));

    shape = svgAppendTo(parentGfx, svgCreate('rect', {
      x: 0,
      y: DEPTH,
      width: width - DEPTH,
      height: height - DEPTH,
      fill: FILL,
      ...attrs
    }));

    this._drawName(parentGfx, bo, width - DEPTH, DEPTH + 4);
  } else {
    shape = svgAppendTo(parentGfx, svgCreate('rect', {
      x: 0,
      y: 0,
      width,
      height,
      fill: FILL,
      ...attrs
    }));

    // the document icon of artifacts
    svgAppendTo(parentGfx, svgCreate('path', {
      d: `M${ width - 20 },6h8l4,4v12h-12zM${ width - 12 },6v4h4`,
      fill: 'none',
      stroke: STROKE,
      strokeWidth: 1,
      strokeLinejoin: 'round'
    }));

    this._drawName(parentGfx, bo, width, Math.max(4, height / 2 - LINE_HEIGHT));
  }

  return shape;
};

/**
 * The keyword, if any, above the name, centered.
 */
DeploymentRenderer.prototype._drawName = function(parentGfx, bo, width, y) {
  const keyword = getKeyword(bo);

  const lines = [
    ...(keyword ? [ { text: `«${ keyword }»`, style: {} } ] : []),
    { text: bo.name || '', style: { fontWeight: 'bold' } }
  ];

  lines.forEach(({ text, style }, index) => {
    const textElement = this._drawText(parentGfx, text, {
      box: { width, height: LINE_HEIGHT },
      align: 'center-middle',
      padding: 0,
      style
    });

    svgAttr(textElement, { transform: `translate(0, ${ y + (keyword ? 0 : LINE_HEIGHT / 2) + index * LINE_HEIGHT })` });
  });
};

DeploymentRenderer.prototype.drawConnection = function(parentGfx, connection) {
  const bo = connection.businessObject;

  if (is(bo, 'uml:CommunicationPath')) {
    return svgAppendTo(parentGfx, createLine(connection.waypoints, {
      stroke: STROKE,
      strokeWidth: STROKE_WIDTH,
      strokeLinejoin: 'round',
      fill: 'none'
    }, CONNECTION_RADIUS));
  }

  const line = svgAppendTo(parentGfx, createLine(connection.waypoints, {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    strokeLinejoin: 'round',
    strokeDasharray: DASH,
    fill: 'none',
    markerEnd: `url(#${ this._getMarker() })`
  }, CONNECTION_RADIUS));

  if (is(bo, 'uml:Deployment')) {
    const text = this._drawText(parentGfx, '«deploy»', {
      box: { width: KEYWORD_WIDTH, height: KEYWORD_HEIGHT },
      align: 'center-middle',
      padding: 0
    });

    const center = getKeywordCenter(connection.waypoints, { width: this._textRenderer.getTextWidth('«deploy»'), height: KEYWORD_HEIGHT });

    svgAttr(text, {
      transform: `translate(${ center.x - KEYWORD_WIDTH / 2 }, ${ center.y - KEYWORD_HEIGHT / 2 })`
    });
  }

  return line;
};

DeploymentRenderer.prototype.getShapePath = function(element) {
  const { x, y, width, height } = element;

  if (is(element, 'uml:Node')) {
    return `M${ x },${ y + DEPTH }l${ DEPTH },${ -DEPTH }h${ width - DEPTH }v${ height - DEPTH }l${ -DEPTH },${ DEPTH }h${ DEPTH - width }z`;
  }

  return `M${ x },${ y }h${ width }v${ height }h${ -width }z`;
};

DeploymentRenderer.prototype.getConnectionPath = function(connection) {
  return getConnectionPath(connection);
};


// helpers //////////

DeploymentRenderer.prototype._drawText = function(parentGfx, text, options) {
  const textElement = this._textRenderer.createText(text, {
    ...options,
    style: {
      ...this._textRenderer.getDefaultStyle(),
      fill: STROKE,
      ...options.style
    }
  });

  svgAttr(textElement, { class: 'djs-label' });

  return svgAppendTo(parentGfx, textElement);
};

/**
 * The open arrow head of dependencies.
 */
DeploymentRenderer.prototype._getMarker = function() {
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

