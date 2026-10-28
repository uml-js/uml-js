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

import { getConnectionPath } from '../../core/draw/PathUtil.js';

const STROKE = '#22242a';
const FILL = '#ffffff';
const STROKE_WIDTH = 1.5;

const CONNECTION_RADIUS = 5;
const DASH = '6 4';

const SUBJECT_HEADER_HEIGHT = 30;

const KEYWORD_WIDTH = 70;
const KEYWORD_HEIGHT = 16;

// width of the longest keyword, «include»
const KEYWORD_TEXT_WIDTH = 52;

let markerCount = 0;


/**
 * Renders use case diagram elements following the UML 2.5.1 notation.
 */
export default function UseCaseRenderer(eventBus, canvas, textRenderer) {

  BaseRenderer.call(this, eventBus, 1000);

  this._canvas = canvas;
  this._textRenderer = textRenderer;

  this._markerPrefix = `uml-use-case-${ ++markerCount }`;
  this._markers = {};
}

inherits(UseCaseRenderer, BaseRenderer);

UseCaseRenderer.$inject = [
  'eventBus',
  'canvas',
  'textRenderer'
];

UseCaseRenderer.prototype.canRender = function(element) {
  return [
    'uml:Actor',
    'uml:UseCase',
    'uml:Class',
    'uml:Association',
    'uml:Include',
    'uml:Extend',
    'uml:Generalization'
  ].some(type => is(element, type));
};

UseCaseRenderer.prototype.drawShape = function(parentGfx, element) {
  const { width, height } = element;
  const name = element.businessObject.name || '';

  if (isLabel(element)) {
    return this._drawText(parentGfx, name, {
      box: { width, height },
      align: 'center-top',
      padding: 0,
      fitBox: true,
      externalLabel: true
    });
  }

  if (is(element, 'uml:Actor')) {
    return this._drawActor(parentGfx, element);
  }

  if (is(element, 'uml:UseCase')) {
    const ellipse = svgAppendTo(parentGfx, svgCreate('ellipse', {
      cx: width / 2,
      cy: height / 2,
      rx: width / 2,
      ry: height / 2,
      stroke: STROKE,
      strokeWidth: STROKE_WIDTH,
      fill: FILL
    }));

    this._drawText(parentGfx, name, {
      box: { width, height },
      align: 'center-middle',
      padding: { top: 5, bottom: 5, left: 15, right: 15 }
    });

    return ellipse;
  }

  // the subject (system boundary)
  const rect = svgAppendTo(parentGfx, svgCreate('rect', {
    x: 0,
    y: 0,
    width,
    height,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    fill: FILL
  }));

  this._drawText(parentGfx, name, {
    box: { width, height: SUBJECT_HEADER_HEIGHT },
    align: 'center-middle',
    padding: 5,
    style: { fontWeight: 'bold' }
  });

  return rect;
};

UseCaseRenderer.prototype.drawConnection = function(parentGfx, connection) {
  const attrs = {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    strokeLinejoin: 'round',
    fill: 'none'
  };

  if (is(connection, 'uml:Generalization')) {
    attrs.markerEnd = `url(#${ this._getMarker('generalization') })`;
  }

  if (is(connection, 'uml:Include') || is(connection, 'uml:Extend')) {
    attrs.strokeDasharray = DASH;
    attrs.markerEnd = `url(#${ this._getMarker('open') })`;
  }

  const line = svgAppendTo(parentGfx, createLine(connection.waypoints, attrs, CONNECTION_RADIUS));

  if (is(connection, 'uml:Include')) {
    this._drawKeyword(parentGfx, connection, 'include');
  }

  if (is(connection, 'uml:Extend')) {
    this._drawKeyword(parentGfx, connection, 'extend');
  }

  return line;
};

UseCaseRenderer.prototype.getShapePath = function(element) {
  const { x, y, width, height } = element;

  if (is(element, 'uml:UseCase') && !isLabel(element)) {
    const rx = width / 2, ry = height / 2;

    return `M${ x },${ y + ry }a${ rx },${ ry } 0 1 0 ${ width },0a${ rx },${ ry } 0 1 0 ${ -width },0z`;
  }

  return `M${ x },${ y }h${ width }v${ height }h${ -width }z`;
};

UseCaseRenderer.prototype.getConnectionPath = function(connection) {
  return getConnectionPath(connection);
};


// shapes //////////

/**
 * A stick figure filling the shape; the name is an external label.
 */
UseCaseRenderer.prototype._drawActor = function(parentGfx, element) {
  const { width, height } = element;

  const area = svgAppendTo(parentGfx, svgCreate('rect', { x: 0, y: 0, width, height, fill: 'none', stroke: 'none' }));

  const cx = width / 2;
  const headRadius = Math.min(width, height) * 0.18;
  const neck = headRadius * 2;
  const hip = height * 0.62;

  const attrs = {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    fill: 'none'
  };

  svgAppendTo(parentGfx, svgCreate('circle', { cx, cy: headRadius, r: headRadius, ...attrs, fill: FILL }));
  svgAppendTo(parentGfx, createLine([ { x: cx, y: neck }, { x: cx, y: hip } ], attrs));
  svgAppendTo(parentGfx, createLine([ { x: 0, y: neck + height * 0.12 }, { x: width, y: neck + height * 0.12 } ], attrs));
  svgAppendTo(parentGfx, createLine([ { x: 0, y: height }, { x: cx, y: hip }, { x: width, y: height } ], attrs));

  return area;
};

/**
 * The keyword next to the middle of the line, clear of it.
 */
UseCaseRenderer.prototype._drawKeyword = function(parentGfx, connection, keyword) {
  const text = this._drawText(parentGfx, `«${ keyword }»`, {
    box: { width: KEYWORD_WIDTH, height: KEYWORD_HEIGHT },
    align: 'center-middle',
    padding: 0
  });

  const center = getKeywordCenter(connection.waypoints, { width: KEYWORD_TEXT_WIDTH, height: KEYWORD_HEIGHT });

  svgAttr(text, {
    transform: `translate(${ center.x - KEYWORD_WIDTH / 2 }, ${ center.y - KEYWORD_HEIGHT / 2 })`
  });
};


// helpers //////////

UseCaseRenderer.prototype._drawText = function(parentGfx, text, options) {
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

UseCaseRenderer.prototype._getMarker = function(type) {
  const id = `${ this._markerPrefix }-${ type }`;

  if (this._markers[type]) {
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

  svgAppend(marker, svgCreate('path', type === 'generalization' ? {
    d: 'M 1 1 L 19 10 L 1 19 Z',
    fill: FILL,
    stroke: STROKE,
    strokeWidth: 1.5,
    strokeLinejoin: 'round'
  } : {
    d: 'M 1 3 L 19 10 L 1 17',
    fill: 'none',
    stroke: STROKE,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }));

  svgAppend(defs, marker);

  this._markers[type] = true;

  return id;
};

function svgAppendTo(parentGfx, element) {
  svgAppend(parentGfx, element);

  return element;
}
