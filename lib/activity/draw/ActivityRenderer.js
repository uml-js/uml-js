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

import { getFlowLabel } from '../util/LabelUtil.js';
import { getActionName, isCallingActivity, isStructured, STRUCTURED_HEADER_HEIGHT } from '../util/ElementUtil.js';

import { getConnectionPath } from '../../core/draw/PathUtil.js';

const STROKE = '#22242a';
const FILL = '#ffffff';
const STROKE_WIDTH = 1.5;

const ACTION_RADIUS = 12;

// the rake symbol of call behavior actions calling an activity, from the lower right corner
const RAKE_OFFSET = { right: 26, bottom: 18 };
const RAKE_WIDTH = 12;
const RAKE_HEIGHT = 10;
const CONNECTION_RADIUS = 5;

let markerCount = 0;


/**
 * Renders activity diagram elements following the UML 2.5.1 notation.
 */
export default function ActivityRenderer(eventBus, canvas, textRenderer) {

  BaseRenderer.call(this, eventBus, 1000);

  this._canvas = canvas;
  this._textRenderer = textRenderer;

  this._arrowMarkerId = `uml-activity-arrow-${ ++markerCount }`;
  this._markerCreated = false;
}

inherits(ActivityRenderer, BaseRenderer);

ActivityRenderer.$inject = [
  'eventBus',
  'canvas',
  'textRenderer'
];

ActivityRenderer.prototype.canRender = function(element) {
  return is(element, 'uml:ActivityNode') || is(element, 'uml:ActivityEdge');
};

ActivityRenderer.prototype.drawShape = function(parentGfx, element) {
  const { width, height } = element;

  if (isLabel(element)) {
    return this._drawText(parentGfx, getFlowLabel(element.businessObject), {
      box: { width, height },
      align: 'center-top',
      padding: 0,
      fitBox: true,
      externalLabel: true
    });
  }

  const r = Math.min(width, height) / 2;
  const cx = width / 2, cy = height / 2;

  if (is(element, 'uml:InitialNode')) {
    return drawCircle(parentGfx, cx, cy, r, { fill: STROKE, stroke: 'none' });
  }

  if (is(element, 'uml:ActivityFinalNode')) {
    const outer = drawCircle(parentGfx, cx, cy, r, { fill: FILL });

    drawCircle(parentGfx, cx, cy, Math.max(r - 5, 2), { fill: STROKE, stroke: 'none' });

    return outer;
  }

  if (is(element, 'uml:FlowFinalNode')) {
    const circle = drawCircle(parentGfx, cx, cy, r, { fill: FILL });
    const d = r * Math.SQRT1_2;

    svgAppendTo(parentGfx, createLine([ { x: cx - d, y: cy - d }, { x: cx + d, y: cy + d } ], { stroke: STROKE, strokeWidth: STROKE_WIDTH }));
    svgAppendTo(parentGfx, createLine([ { x: cx + d, y: cy - d }, { x: cx - d, y: cy + d } ], { stroke: STROKE, strokeWidth: STROKE_WIDTH }));

    return circle;
  }

  if (is(element, 'uml:DecisionNode') || is(element, 'uml:MergeNode')) {
    return svgAppendTo(parentGfx, svgCreate('path', {
      d: `M${ cx },0 L${ width },${ cy } L${ cx },${ height } L0,${ cy } Z`,
      stroke: STROKE,
      strokeWidth: STROKE_WIDTH,
      fill: FILL
    }));
  }

  if (is(element, 'uml:ForkNode') || is(element, 'uml:JoinNode')) {
    return svgAppendTo(parentGfx, svgCreate('rect', { x: 0, y: 0, width, height, fill: STROKE }));
  }

  // a dashed round cornered rectangle with the keyword «structured» at the top (UML 2.5.1)
  if (isStructured(element)) {
    const frame = svgAppendTo(parentGfx, svgCreate('rect', {
      x: 0,
      y: 0,
      width,
      height,
      rx: ACTION_RADIUS,
      ry: ACTION_RADIUS,
      stroke: STROKE,
      strokeWidth: STROKE_WIDTH,
      strokeDasharray: '6 4',
      fill: FILL
    }));

    const name = getActionName(element.businessObject);

    this._drawText(parentGfx, name ? `«structured»\n${ name }` : '«structured»', {
      box: { width, height: STRUCTURED_HEADER_HEIGHT },
      align: 'center-top',
      padding: 5
    });

    return frame;
  }

  // actions
  const rect = svgAppendTo(parentGfx, svgCreate('rect', {
    x: 0,
    y: 0,
    width,
    height,
    rx: ACTION_RADIUS,
    ry: ACTION_RADIUS,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    fill: FILL
  }));

  this._drawText(parentGfx, getActionName(element.businessObject), {
    box: { width, height },
    align: 'center-middle',
    padding: 5
  });

  if (isCallingActivity(element.businessObject)) {
    drawRake(parentGfx, width - RAKE_OFFSET.right, height - RAKE_OFFSET.bottom);
  }

  return rect;
};

ActivityRenderer.prototype.drawConnection = function(parentGfx, connection) {
  return svgAppendTo(parentGfx, createLine(connection.waypoints, {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    strokeLinejoin: 'round',
    fill: 'none',
    markerEnd: `url(#${ this._getArrowMarker() })`
  }, CONNECTION_RADIUS));
};

ActivityRenderer.prototype.getShapePath = function(element) {
  const { x, y, width, height } = element;

  if (is(element, 'uml:Action') || isLabel(element) || is(element, 'uml:ForkNode') || is(element, 'uml:JoinNode')) {
    return `M${ x },${ y }h${ width }v${ height }h${ -width }z`;
  }

  if (is(element, 'uml:DecisionNode') || is(element, 'uml:MergeNode')) {
    return `M${ x + width / 2 },${ y }l${ width / 2 },${ height / 2 }l${ -width / 2 },${ height / 2 }l${ -width / 2 },${ -height / 2 }z`;
  }

  const r = Math.min(width, height) / 2;
  const cx = x + width / 2, cy = y + height / 2;

  return `M${ cx },${ cy - r }a${ r },${ r } 0 1 1 0,${ 2 * r }a${ r },${ r } 0 1 1 0,${ -2 * r }z`;
};

ActivityRenderer.prototype.getConnectionPath = function(connection) {
  return getConnectionPath(connection);
};


// helpers //////////

ActivityRenderer.prototype._drawText = function(parentGfx, text, options) {
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

ActivityRenderer.prototype._getArrowMarker = function() {
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

/**
 * The rake symbol (UML 2.5.1): a fork of three prongs on a stem, with its top left at x, y.
 */
function drawRake(parentGfx, x, y) {
  const stem = RAKE_HEIGHT * 0.4;
  const right = x + RAKE_WIDTH, middle = x + RAKE_WIDTH / 2, bar = y + stem, bottom = y + RAKE_HEIGHT;

  return svgAppendTo(parentGfx, svgCreate('path', {
    d: `M${ middle },${ y }V${ bar }M${ x },${ bar }H${ right }` +
      `M${ x },${ bar }V${ bottom }M${ middle },${ bar }V${ bottom }M${ right },${ bar }V${ bottom }`,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    fill: 'none'
  }));
}

function svgAppendTo(parentGfx, element) {
  svgAppend(parentGfx, element);

  return element;
}
