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

import { getCompartments, getEndData, LINE_HEIGHT, PADDING, PADDING_X } from '../util/CompartmentUtil.js';

import { formatEnd } from '../util/MemberUtil.js';

import { getConnectionPath } from '../../core/draw/PathUtil.js';

const STROKE = '#22242a';
const FILL = '#ffffff';
const STROKE_WIDTH = 1.5;

const CONNECTION_RADIUS = 5;
const DASH = '6 4';

// wide enough for members not to wrap
const UNWRAPPED_WIDTH = 10000;

let markerCount = 0;


/**
 * Renders class diagram elements following the UML 2.5.1 notation.
 */
export default function ClassRenderer(eventBus, canvas, textRenderer) {

  BaseRenderer.call(this, eventBus, 1000);

  this._canvas = canvas;
  this._textRenderer = textRenderer;

  this._markerPrefix = `uml-class-${ ++markerCount }`;
  this._markers = {};
}

inherits(ClassRenderer, BaseRenderer);

ClassRenderer.$inject = [
  'eventBus',
  'canvas',
  'textRenderer'
];

ClassRenderer.prototype.canRender = function(element) {
  return [
    'uml:Class',
    'uml:Interface',
    'uml:Enumeration',
    'uml:Association',
    'uml:Property',
    'uml:Generalization',
    'uml:InterfaceRealization',
    'uml:Dependency'
  ].some(type => is(element, type));
};

ClassRenderer.prototype.drawShape = function(parentGfx, element) {
  const { width, height } = element;
  const bo = element.businessObject;

  if (isLabel(element)) {
    const text = is(bo, 'uml:Property') ? formatEnd(getEndData(bo)) : (bo.name || '');

    return this._drawText(parentGfx, text, {
      box: { width, height },
      align: 'center-top',
      padding: 0,
      fitBox: true
    });
  }

  const rect = svgAppendTo(parentGfx, svgCreate('rect', {
    x: 0,
    y: 0,
    width,
    height,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    fill: FILL
  }));

  for (const compartment of getCompartments(bo)) {
    if (compartment.y > 0 && compartment.y < height) {
      svgAppendTo(parentGfx, createLine([
        { x: 0, y: compartment.y },
        { x: width, y: compartment.y }
      ], { stroke: STROKE, strokeWidth: STROKE_WIDTH }));
    }

    compartment.lines.forEach((line, index) => {
      const y = compartment.y + PADDING + index * LINE_HEIGHT;

      if (y + LINE_HEIGHT > height) {
        return;
      }

      const isName = compartment.id === 'name';
      const isNameLine = isName && index === compartment.lines.length - 1;

      // one line per member, names centered
      const text = this._drawText(parentGfx, line, {
        box: { width: UNWRAPPED_WIDTH, height: LINE_HEIGHT },
        align: isName ? 'center-middle' : 'left-middle',
        padding: 0,
        style: isNameLine ? {
          fontWeight: 'bold',
          fontStyle: bo.isAbstract ? 'italic' : 'normal'
        } : {}
      });

      svgAttr(text, { transform: `translate(${ isName ? width / 2 - UNWRAPPED_WIDTH / 2 : PADDING_X }, ${ y })` });
    });
  }

  return rect;
};

ClassRenderer.prototype.drawConnection = function(parentGfx, connection) {
  const bo = connection.businessObject;

  const attrs = {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    strokeLinejoin: 'round',
    fill: 'none'
  };

  if (is(bo, 'uml:Association')) {
    const [ sourceEnd, targetEnd ] = bo.get('memberEnd');

    // the aggregation kind is set at the part end, the diamond drawn at the whole
    if (isAggregate(targetEnd)) {
      attrs.markerStart = `url(#${ this._getMarker(targetEnd.aggregation) })`;
    }

    if (isAggregate(sourceEnd)) {
      attrs.markerEnd = `url(#${ this._getMarker(sourceEnd.aggregation) })`;
    }
  } else if (is(bo, 'uml:Generalization')) {
    attrs.markerEnd = `url(#${ this._getMarker('triangle') })`;
  } else if (is(bo, 'uml:InterfaceRealization')) {
    attrs.strokeDasharray = DASH;
    attrs.markerEnd = `url(#${ this._getMarker('triangle') })`;
  } else if (is(bo, 'uml:Dependency')) {
    attrs.strokeDasharray = DASH;
    attrs.markerEnd = `url(#${ this._getMarker('open') })`;
  }

  return svgAppendTo(parentGfx, createLine(connection.waypoints, attrs, CONNECTION_RADIUS));
};

ClassRenderer.prototype.getShapePath = function(element) {
  const { x, y, width, height } = element;

  return `M${ x },${ y }h${ width }v${ height }h${ -width }z`;
};

ClassRenderer.prototype.getConnectionPath = function(connection) {
  return getConnectionPath(connection);
};


// helpers //////////

ClassRenderer.prototype._drawText = function(parentGfx, text, options) {
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

const MARKERS = {

  // hollow triangle of generalizations and realizations
  triangle: {
    viewBox: '0 0 20 20',
    refX: 19,
    path: { d: 'M 1 1 L 19 10 L 1 19 Z', fill: FILL, strokeWidth: 1.5 }
  },

  // open arrow head of dependencies
  open: {
    viewBox: '0 0 20 20',
    refX: 19,
    path: { d: 'M 1 3 L 19 10 L 1 17', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' }
  },

  // diamonds of aggregations, pointing along the line
  shared: {
    viewBox: '0 0 28 20',
    refX: 27,
    width: 22,
    path: { d: 'M 1 10 L 14 3 L 27 10 L 14 17 Z', fill: FILL, strokeWidth: 1.5 }
  },
  composite: {
    viewBox: '0 0 28 20',
    refX: 27,
    width: 22,
    path: { d: 'M 1 10 L 14 3 L 27 10 L 14 17 Z', fill: STROKE, strokeWidth: 1.5 }
  }
};

ClassRenderer.prototype._getMarker = function(type) {
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

  const { viewBox, refX, width = 14, path } = MARKERS[type];

  const marker = svgCreate('marker', {
    id,
    viewBox,
    refX,
    refY: 10,
    markerWidth: width,
    markerHeight: 14,
    markerUnits: 'userSpaceOnUse',

    // diamonds at the start of the line point into it, too
    orient: 'auto-start-reverse'
  });

  svgAppend(marker, svgCreate('path', {
    stroke: STROKE,
    strokeLinejoin: 'round',
    ...path
  }));

  svgAppend(defs, marker);

  this._markers[type] = true;

  return id;
};

function isAggregate(end) {
  return end && (end.aggregation === 'shared' || end.aggregation === 'composite');
}

function svgAppendTo(parentGfx, element) {
  svgAppend(parentGfx, element);

  return element;
}
