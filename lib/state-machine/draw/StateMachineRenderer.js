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

import {
  ACTIVITY_LINE_HEIGHT,
  getKind,
  getStateName,
  hasCompartment,
  isSubmachineState,
  NAME_COMPARTMENT_HEIGHT
} from '../util/ElementUtil.js';

import { getCompartmentLines, getTransitionText } from '../util/LabelUtil.js';

import { getConnectionPath } from '../../core/draw/PathUtil.js';

const STROKE = '#22242a';
const FILL = '#ffffff';
const STROKE_WIDTH = 1.5;

const STATE_RADIUS = 12;

// the composite icon of submachine states, from the lower right corner
const COMPOSITE_ICON_OFFSET = { right: 28, bottom: 14 };
const CONNECTION_RADIUS = 5;

let markerCount = 0;


/**
 * Renders state machine diagram elements following the UML 2.5.1 notation.
 */
export default function StateMachineRenderer(eventBus, canvas, textRenderer) {

  BaseRenderer.call(this, eventBus, 1000);

  this._canvas = canvas;
  this._textRenderer = textRenderer;

  this._arrowMarkerId = `uml-sm-arrow-${ ++markerCount }`;
  this._markerCreated = false;
}

inherits(StateMachineRenderer, BaseRenderer);

StateMachineRenderer.$inject = [
  'eventBus',
  'canvas',
  'textRenderer'
];

StateMachineRenderer.prototype.canRender = function(element) {
  return is(element, 'uml:Vertex') || is(element, 'uml:Transition');
};

StateMachineRenderer.prototype.drawShape = function(parentGfx, element) {

  if (isLabel(element)) {
    return this._drawLabel(parentGfx, element);
  }

  if (is(element, 'uml:FinalState')) {
    return this._drawFinalState(parentGfx, element);
  }

  if (is(element, 'uml:State')) {
    return this._drawState(parentGfx, element);
  }

  if (is(element, 'uml:Pseudostate')) {
    return this._drawPseudostate(parentGfx, element);
  }
};

StateMachineRenderer.prototype.drawConnection = function(parentGfx, element) {
  return svgAppendTo(parentGfx, createLine(element.waypoints, {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    strokeLinejoin: 'round',
    fill: 'none',
    markerEnd: `url(#${ this._getArrowMarker() })`
  }, CONNECTION_RADIUS));
};

StateMachineRenderer.prototype.getShapePath = function(element) {
  const { x, y, width, height } = element;

  if (is(element, 'uml:State') && !is(element, 'uml:FinalState')) {
    return getRoundRectPath(element, STATE_RADIUS);
  }

  if (is(element, 'uml:Pseudostate')) {
    const kind = getKind(element);

    if (kind === 'choice') {
      return getDiamondPath(element);
    }

    if (kind === 'fork' || kind === 'join' || kind === 'terminate') {
      return getRectPath(element);
    }
  }

  if (isLabel(element)) {
    return getRectPath(element);
  }

  return getCirclePath({ x: x + width / 2, y: y + height / 2 }, Math.min(width, height) / 2);
};

StateMachineRenderer.prototype.getConnectionPath = function(connection) {
  return getConnectionPath(connection);
};


// shapes //////////

StateMachineRenderer.prototype._drawState = function(parentGfx, element) {
  const bo = element.businessObject;
  const { width, height } = element;

  const rect = svgAppendTo(parentGfx, svgCreate('rect', {
    x: 0,
    y: 0,
    width,
    height,
    rx: STATE_RADIUS,
    ry: STATE_RADIUS,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    fill: FILL
  }));

  const lines = getCompartmentLines(bo);

  if (isSubmachineState(element)) {
    drawCompositeIcon(parentGfx, width - COMPOSITE_ICON_OFFSET.right, height - COMPOSITE_ICON_OFFSET.bottom);
  }

  // the name only, or the name above the separator line, entry / do / exit and sub-states below
  if (!hasCompartment(element)) {
    this._drawText(parentGfx, getStateName(bo), {
      box: { width, height },
      align: 'center-middle',
      padding: 5
    });

    return rect;
  }

  this._drawText(parentGfx, getStateName(bo), {
    box: { width, height: NAME_COMPARTMENT_HEIGHT },
    align: 'center-middle',
    padding: 5
  });

  svgAppendTo(parentGfx, createLine([
    { x: 0, y: NAME_COMPARTMENT_HEIGHT },
    { x: width, y: NAME_COMPARTMENT_HEIGHT }
  ], {
    stroke: STROKE,
    strokeWidth: 1
  }));

  if (lines.length) {
    const linesText = this._drawText(parentGfx, lines.join('\n'), {
      box: { width, height: lines.length * ACTIVITY_LINE_HEIGHT + 8 },
      align: 'left-top',
      padding: { top: 4, left: 8, right: 8, bottom: 4 }
    });

    svgAttr(linesText, { transform: `translate(0, ${ NAME_COMPARTMENT_HEIGHT })` });
  }

  return rect;
};

StateMachineRenderer.prototype._drawFinalState = function(parentGfx, element) {
  const r = Math.min(element.width, element.height) / 2;
  const cx = element.width / 2, cy = element.height / 2;

  const outer = drawCircle(parentGfx, cx, cy, r, { fill: FILL });

  drawCircle(parentGfx, cx, cy, Math.max(r - 5, 2), { fill: STROKE, stroke: 'none' });

  return outer;
};

StateMachineRenderer.prototype._drawPseudostate = function(parentGfx, element) {
  const kind = getKind(element);

  const { width, height } = element;

  const r = Math.min(width, height) / 2;
  const cx = width / 2, cy = height / 2;

  switch (kind) {
  case 'initial':
  case 'junction':
    return drawCircle(parentGfx, cx, cy, r, { fill: STROKE, stroke: 'none' });

  case 'choice':
    return svgAppendTo(parentGfx, svgCreate('path', {
      d: `M${ cx },0 L${ width },${ cy } L${ cx },${ height } L0,${ cy } Z`,
      stroke: STROKE,
      strokeWidth: STROKE_WIDTH,
      fill: FILL
    }));

  case 'fork':
  case 'join':
    return svgAppendTo(parentGfx, svgCreate('rect', {
      x: 0,
      y: 0,
      width,
      height,
      fill: STROKE
    }));

  case 'shallowHistory':
  case 'deepHistory': {
    const circle = drawCircle(parentGfx, cx, cy, r, { fill: FILL });

    this._drawText(parentGfx, kind === 'deepHistory' ? 'H*' : 'H', {
      box: { width, height },
      align: 'center-middle',
      padding: 0,
      style: { fontWeight: 'bold' }
    });

    return circle;
  }

  case 'terminate': {
    const hitArea = svgAppendTo(parentGfx, svgCreate('rect', {
      x: 0,
      y: 0,
      width,
      height,
      fill: 'none',
      stroke: 'none'
    }));

    svgAppendTo(parentGfx, createLine([ { x: 0, y: 0 }, { x: width, y: height } ], { stroke: STROKE, strokeWidth: 2 }));
    svgAppendTo(parentGfx, createLine([ { x: width, y: 0 }, { x: 0, y: height } ], { stroke: STROKE, strokeWidth: 2 }));

    return hitArea;
  }

  case 'exitPoint': {
    const circle = drawCircle(parentGfx, cx, cy, r, { fill: FILL });
    const d = r * Math.SQRT1_2;

    svgAppendTo(parentGfx, createLine([ { x: cx - d, y: cy - d }, { x: cx + d, y: cy + d } ], { stroke: STROKE, strokeWidth: STROKE_WIDTH }));
    svgAppendTo(parentGfx, createLine([ { x: cx + d, y: cy - d }, { x: cx - d, y: cy + d } ], { stroke: STROKE, strokeWidth: STROKE_WIDTH }));

    return circle;
  }

  default:
    return drawCircle(parentGfx, cx, cy, r, { fill: FILL });
  }
};

StateMachineRenderer.prototype._drawLabel = function(parentGfx, element) {
  const text = getTransitionText(element.businessObject);

  return this._drawText(parentGfx, text, {
    box: { width: element.width, height: element.height },
    align: 'center-top',
    padding: 0,
    fitBox: true,
    externalLabel: true
  });
};


// helpers //////////

StateMachineRenderer.prototype._drawText = function(parentGfx, text, options) {
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

StateMachineRenderer.prototype._getArrowMarker = function() {
  const id = this._arrowMarkerId;

  if (this._markerCreated) {
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
    markerWidth: 12,
    markerHeight: 12,
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

  this._markerCreated = true;

  return id;
};

function svgAppendTo(parentGfx, element) {
  svgAppend(parentGfx, element);

  return element;
}

/**
 * The composite icon (UML 2.5.1): two small states connected by a line, with its top left at x, y.
 */
function drawCompositeIcon(parentGfx, x, y) {
  const attrs = { width: 6, height: 5, rx: 2, ry: 2, stroke: STROKE, strokeWidth: 1, fill: 'none' };

  svgAppendTo(parentGfx, svgCreate('rect', { x, y, ...attrs }));
  svgAppendTo(parentGfx, svgCreate('rect', { x: x + 12, y, ...attrs }));

  svgAppendTo(parentGfx, createLine([ { x: x + 6, y: y + 2.5 }, { x: x + 12, y: y + 2.5 } ], {
    stroke: STROKE,
    strokeWidth: 1
  }));
}

function drawCircle(parentGfx, cx, cy, r, attrs = {}) {
  return svgAppendTo(parentGfx, svgCreate('circle', {
    cx,
    cy,
    r,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    ...attrs
  }));
}

function getRectPath({ x, y, width, height }) {
  return `M${ x },${ y }h${ width }v${ height }h${ -width }z`;
}

function getRoundRectPath({ x, y, width, height }, r) {
  return [
    `M${ x + r },${ y }`,
    `h${ width - 2 * r }`,
    `a${ r },${ r } 0 0 1 ${ r },${ r }`,
    `v${ height - 2 * r }`,
    `a${ r },${ r } 0 0 1 ${ -r },${ r }`,
    `h${ 2 * r - width }`,
    `a${ r },${ r } 0 0 1 ${ -r },${ -r }`,
    `v${ 2 * r - height }`,
    `a${ r },${ r } 0 0 1 ${ r },${ -r }`,
    'z'
  ].join('');
}

function getCirclePath({ x, y }, r) {
  return `M${ x },${ y - r }a${ r },${ r } 0 1 1 0,${ 2 * r }a${ r },${ r } 0 1 1 0,${ -2 * r }z`;
}

function getDiamondPath({ x, y, width, height }) {
  return `M${ x + width / 2 },${ y }l${ width / 2 },${ height / 2 }l${ -width / 2 },${ height / 2 }l${ -width / 2 },${ -height / 2 }z`;
}
