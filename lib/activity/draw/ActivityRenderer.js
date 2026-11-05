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

import { getLabelText } from '../util/LabelUtil.js';
import {
  PARTITION_HEADER_SIZE,
  STRUCTURED_HEADER_HEIGHT,
  getActionName,
  isCallingActivity,
  isExpansionNode,
  isExpansionRegion,
  isHorizontal,
  isInput,
  isInterruptibleRegion,
  isPartition,
  isPin,
  isStructured
} from '../util/ElementUtil.js';

import { getConnectionPath } from '../../core/draw/PathUtil.js';

import { getBorderSide, getPathMid } from '../../core/util/GeometryUtil.js';

const STROKE = '#22242a';
const FILL = '#ffffff';
const STROKE_WIDTH = 1.5;

const ACTION_RADIUS = 12;

// the rake symbol of call behavior actions calling an activity, from the lower right corner
const RAKE_OFFSET = { right: 26, bottom: 18 };
const RAKE_WIDTH = 12;
const RAKE_HEIGHT = 10;
const CONNECTION_RADIUS = 5;

const DASH = '6 4';

// the arrow inside pins, showing the direction of the objects passing them
const PIN_ARROW = 4;

// compartments of the box of expansion nodes
const EXPANSION_COMPARTMENTS = 4;

// the lightning bolt of interrupting edges
const BOLT_SIZE = 8;

// the directions pins on the sides of their action point to, as inputs
const INWARDS = {
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  top: { x: 0, y: 1 },
  bottom: { x: 0, y: -1 }
};

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
  return is(element, 'uml:ActivityNode') || is(element, 'uml:ActivityEdge') || is(element, 'uml:ActivityGroup');
};

ActivityRenderer.prototype.drawShape = function(parentGfx, element) {
  const { width, height } = element;

  if (isLabel(element)) {
    return this._drawText(parentGfx, getLabelText(element.businessObject), {
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

  if (isPartition(element)) {
    return this._drawPartition(parentGfx, element);
  }

  // a dashed round cornered rectangle around the nodes it groups (UML 2.5.1)
  if (isInterruptibleRegion(element)) {
    return svgAppendTo(parentGfx, svgCreate('rect', {
      x: 0,
      y: 0,
      width,
      height,
      rx: ACTION_RADIUS,
      ry: ACTION_RADIUS,
      stroke: STROKE,
      strokeWidth: STROKE_WIDTH,
      strokeDasharray: DASH,
      fill: 'none'
    }));
  }

  if (isPin(element)) {
    return this._drawPin(parentGfx, element);
  }

  if (isExpansionNode(element)) {
    return this._drawExpansionNode(parentGfx, element);
  }

  // a rectangle with a keyword, for central buffers «centralBuffer» and data stores «datastore»
  if (is(element, 'uml:ObjectNode')) {
    const rect = svgAppendTo(parentGfx, svgCreate('rect', {
      x: 0,
      y: 0,
      width,
      height,
      stroke: STROKE,
      strokeWidth: STROKE_WIDTH,
      fill: FILL
    }));

    const keyword = is(element, 'uml:DataStoreNode') ? '«datastore»' : is(element, 'uml:CentralBufferNode') ? '«centralBuffer»' : '';
    const name = element.businessObject.name;

    this._drawText(parentGfx, [ keyword, name ].filter(Boolean).join('\n'), {
      box: { width, height },
      align: 'center-middle',
      padding: 5
    });

    return rect;
  }

  // a dashed round cornered rectangle with the mode as keyword in the upper left corner (UML 2.5.1)
  if (isExpansionRegion(element)) {
    const frame = svgAppendTo(parentGfx, svgCreate('rect', {
      x: 0,
      y: 0,
      width,
      height,
      rx: ACTION_RADIUS,
      ry: ACTION_RADIUS,
      stroke: STROKE,
      strokeWidth: STROKE_WIDTH,
      strokeDasharray: DASH,
      fill: FILL
    }));

    const name = getActionName(element.businessObject);
    const keyword = `«${ element.businessObject.mode || 'iterative' }»`;

    this._drawText(parentGfx, name ? `${ keyword }\n${ name }` : keyword, {
      box: { width, height: STRUCTURED_HEADER_HEIGHT },
      align: 'left-top',
      padding: { top: 5, left: ACTION_RADIUS, right: 5, bottom: 5 }
    });

    return frame;
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
      strokeDasharray: DASH,
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
  const line = svgAppendTo(parentGfx, createLine(connection.waypoints, {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    strokeLinejoin: 'round',
    fill: 'none',
    markerEnd: `url(#${ this._getArrowMarker() })`
  }, CONNECTION_RADIUS));

  // edges interrupting a region show a lightning bolt at their middle (UML 2.5.1)
  if (connection.businessObject.interrupts) {
    const { x, y } = getPathMid(connection.waypoints);

    svgAppendTo(parentGfx, svgCreate('path', {
      d: `M${ x - BOLT_SIZE / 2 },${ y - BOLT_SIZE }L${ x + BOLT_SIZE / 2 },${ y - 1 }L${ x - BOLT_SIZE / 2 },${ y + 1 }L${ x + BOLT_SIZE / 2 },${ y + BOLT_SIZE }`,
      stroke: STROKE,
      strokeWidth: STROKE_WIDTH,
      strokeLinejoin: 'round',
      fill: 'none'
    }));
  }

  return line;
};

ActivityRenderer.prototype.getShapePath = function(element) {
  const { x, y, width, height } = element;

  if (is(element, 'uml:Action') || is(element, 'uml:ObjectNode') || is(element, 'uml:ActivityGroup') ||
      isLabel(element) || is(element, 'uml:ForkNode') || is(element, 'uml:JoinNode')) {
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

/**
 * A swimlane: a rectangle with its name in a header, at the top of vertical
 * partitions, at the left of horizontal ones.
 */
ActivityRenderer.prototype._drawPartition = function(parentGfx, element) {
  const { width, height } = element;

  const horizontal = isHorizontal(element);

  const rect = svgAppendTo(parentGfx, svgCreate('rect', {
    x: 0,
    y: 0,
    width,
    height,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    fill: 'none'
  }));

  svgAppendTo(parentGfx, createLine(horizontal
    ? [ { x: PARTITION_HEADER_SIZE, y: 0 }, { x: PARTITION_HEADER_SIZE, y: height } ]
    : [ { x: 0, y: PARTITION_HEADER_SIZE }, { x: width, y: PARTITION_HEADER_SIZE } ], {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH
  }));

  const text = this._drawText(parentGfx, element.businessObject.name || '', {
    box: { width: horizontal ? height : width, height: PARTITION_HEADER_SIZE },
    align: 'center-middle',
    padding: 5
  });

  // read from bottom to top
  if (horizontal) {
    svgAttr(text, { transform: `translate(0, ${ height }) rotate(-90)` });
  }

  return rect;
};

/**
 * A small square with an arrow showing the direction objects pass it:
 * into the action for input pins, out of it for output pins.
 */
ActivityRenderer.prototype._drawPin = function(parentGfx, element) {
  const { width, height } = element;

  const rect = svgAppendTo(parentGfx, svgCreate('rect', {
    x: 0,
    y: 0,
    width,
    height,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    fill: FILL
  }));

  const side = element.host ? getBorderSide({ x: element.x + width / 2, y: element.y + height / 2 }, element.host) : 'left';
  const inwards = INWARDS[side];
  const direction = isInput(element) ? inwards : { x: -inwards.x, y: -inwards.y };

  const cx = width / 2, cy = height / 2;
  const tip = { x: cx + direction.x * PIN_ARROW, y: cy + direction.y * PIN_ARROW };
  const tail = { x: cx - direction.x * PIN_ARROW, y: cy - direction.y * PIN_ARROW };
  const side1 = { x: tip.x - direction.x * PIN_ARROW / 2 - direction.y * PIN_ARROW / 2, y: tip.y - direction.y * PIN_ARROW / 2 - direction.x * PIN_ARROW / 2 };
  const side2 = { x: tip.x - direction.x * PIN_ARROW / 2 + direction.y * PIN_ARROW / 2, y: tip.y - direction.y * PIN_ARROW / 2 + direction.x * PIN_ARROW / 2 };

  svgAppendTo(parentGfx, svgCreate('path', {
    d: `M${ tail.x },${ tail.y }L${ tip.x },${ tip.y }M${ side1.x },${ side1.y }L${ tip.x },${ tip.y }L${ side2.x },${ side2.y }`,
    stroke: STROKE,
    strokeWidth: 1,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none'
  }));

  return rect;
};

/**
 * A box of compartments along the border of the expansion region (UML 2.5.1).
 */
ActivityRenderer.prototype._drawExpansionNode = function(parentGfx, element) {
  const { width, height } = element;

  const rect = svgAppendTo(parentGfx, svgCreate('rect', {
    x: 0,
    y: 0,
    width,
    height,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    fill: FILL
  }));

  const along = width >= height;

  let d = '';

  for (let i = 1; i < EXPANSION_COMPARTMENTS; i++) {
    d += along
      ? `M${ width * i / EXPANSION_COMPARTMENTS },0V${ height }`
      : `M0,${ height * i / EXPANSION_COMPARTMENTS }H${ width }`;
  }

  svgAppendTo(parentGfx, svgCreate('path', {
    d,
    stroke: STROKE,
    strokeWidth: 1,
    fill: 'none'
  }));

  return rect;
};

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
