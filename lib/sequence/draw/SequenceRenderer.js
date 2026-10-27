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
  HEAD_HEIGHT,
  OPERATOR_TAB_HEIGHT,
  getGuardText,
  getOperands
} from '../util/ElementUtil.js';

import { getConnectionPath } from '../../core/draw/PathUtil.js';

const STROKE = '#22242a';
const FILL = '#ffffff';
const STROKE_WIDTH = 1.5;

const DASH = '6 4';

const CONNECTION_RADIUS = 5;

const LIFELINE_EXTENT = 100000;

let markerCount = 0;


/**
 * Renders sequence diagram elements following the UML 2.5.1 notation:
 * lifelines with head and dashed line, and messages by their sort.
 */
export default function SequenceRenderer(eventBus, canvas, textRenderer) {

  BaseRenderer.call(this, eventBus, 1000);

  this._canvas = canvas;
  this._textRenderer = textRenderer;

  this._markerPrefix = `uml-sequence-${ ++markerCount }`;
  this._markers = {};
}

inherits(SequenceRenderer, BaseRenderer);

SequenceRenderer.$inject = [
  'eventBus',
  'canvas',
  'textRenderer'
];

SequenceRenderer.prototype.canRender = function(element) {
  return [
    'uml:Lifeline',
    'uml:Message',
    'uml:ExecutionSpecification',
    'uml:CombinedFragment',
    'uml:InteractionOperand'
  ].some(type => is(element, type));
};

SequenceRenderer.prototype.drawShape = function(parentGfx, element) {

  if (isLabel(element)) {
    return this._drawText(parentGfx, element.businessObject.name || '', {
      box: { width: element.width, height: element.height },
      align: 'center-top',
      padding: 0,
      fitBox: true
    });
  }

  if (is(element, 'uml:CombinedFragment')) {
    return this._drawCombinedFragment(parentGfx, element);
  }

  if (is(element, 'uml:InteractionOperand')) {
    return this._drawOperand(parentGfx, element);
  }

  if (is(element, 'uml:ExecutionSpecification')) {
    return svgAppendTo(parentGfx, svgCreate('rect', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      stroke: STROKE,
      strokeWidth: STROKE_WIDTH,
      fill: FILL
    }));
  }

  return this._drawLifeline(parentGfx, element);
};

SequenceRenderer.prototype.drawConnection = function(parentGfx, connection) {
  const sort = connection.businessObject.messageSort || 'synchCall';

  const attrs = {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    strokeLinejoin: 'round',
    fill: 'none'
  };

  if (sort === 'reply') {
    attrs.strokeDasharray = DASH;
  }

  // replies answer synchronous calls: filled, like the call, but dashed
  attrs.markerEnd = `url(#${ this._getMarker(sort === 'synchCall' || sort === 'reply' ? 'filled' : 'open') })`;

  return svgAppendTo(parentGfx, createLine(connection.waypoints, attrs, CONNECTION_RADIUS));
};

/**
 * Messages dock at the dashed line of a lifeline, not at its bounds,
 * and at the border of activation bars.
 */
SequenceRenderer.prototype.getShapePath = function(element) {
  const { x, y, width, height } = element;

  if (isLabel(element) || !is(element, 'uml:Lifeline')) {
    return `M${ x },${ y }h${ width }v${ height }h${ -width }z`;
  }

  const lineX = x + width / 2;

  // lifelines grow to hold their messages, so messages dock below their end, too
  return `M${ lineX },${ y }V${ y + height + LIFELINE_EXTENT }`;
};

SequenceRenderer.prototype.getConnectionPath = function(connection) {
  return getConnectionPath(connection);
};


// shapes //////////

SequenceRenderer.prototype._drawLifeline = function(parentGfx, element) {
  const { width, height } = element;

  // the invisible area makes the whole lifeline easy to hit
  svgAppendTo(parentGfx, svgCreate('rect', {
    x: 0,
    y: 0,
    width,
    height,
    fill: 'none',
    stroke: 'none'
  }));

  svgAppendTo(parentGfx, createLine([
    { x: width / 2, y: HEAD_HEIGHT },
    { x: width / 2, y: height }
  ], {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    strokeDasharray: DASH
  }));

  const head = svgAppendTo(parentGfx, svgCreate('rect', {
    x: 0,
    y: 0,
    width,
    height: HEAD_HEIGHT,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    fill: FILL
  }));

  this._drawText(parentGfx, element.businessObject.name || '', {
    box: { width, height: HEAD_HEIGHT },
    align: 'center-middle',
    padding: 5
  });

  return head;
};


/**
 * A frame with the operator in a tab in its top left corner.
 */
SequenceRenderer.prototype._drawCombinedFragment = function(parentGfx, element) {
  const { width, height } = element;

  const frame = svgAppendTo(parentGfx, svgCreate('rect', {
    x: 0,
    y: 0,
    width,
    height,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    fill: 'none'
  }));

  const operator = element.businessObject.interactionOperator || 'seq';
  const tabWidth = getTabWidth(operator);

  svgAppendTo(parentGfx, svgCreate('path', {
    d: `M0,0H${ tabWidth }V${ OPERATOR_TAB_HEIGHT - 6 }L${ tabWidth - 6 },${ OPERATOR_TAB_HEIGHT }H0Z`,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    fill: FILL
  }));

  this._drawText(parentGfx, operator, {
    box: { width: tabWidth - 4, height: OPERATOR_TAB_HEIGHT },
    align: 'center-middle',
    padding: 0,
    style: { fontWeight: 'bold' }
  });

  return frame;
};

/**
 * The part of a frame, separated by a dashed line from the operand above, with its guard.
 */
SequenceRenderer.prototype._drawOperand = function(parentGfx, element) {
  const { width, height } = element;

  const area = svgAppendTo(parentGfx, svgCreate('rect', {
    x: 0,
    y: 0,
    width,
    height,
    fill: 'none',
    stroke: 'none'
  }));

  const fragment = element.parent;
  const first = !fragment || getOperands(fragment)[0] === element;

  if (!first) {
    svgAppendTo(parentGfx, createLine([ { x: 0, y: 0 }, { x: width, y: 0 } ], {
      stroke: STROKE,
      strokeWidth: STROKE_WIDTH,
      strokeDasharray: DASH
    }));
  }

  const guard = getGuardText(element.businessObject);

  if (guard) {
    const text = this._drawText(parentGfx, `[${ guard }]`, {
      box: { width: width - 16, height: 20 },
      align: 'left-top',
      padding: 0
    });

    const operator = fragment && fragment.businessObject.interactionOperator || 'seq';
    const x = first ? getTabWidth(operator) + 8 : 8;

    svgAttr(text, { transform: `translate(${ x }, 4)` });
  }

  return area;
};


// helpers //////////

SequenceRenderer.prototype._drawText = function(parentGfx, text, options) {
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

SequenceRenderer.prototype._getMarker = function(type) {
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
    markerWidth: 12,
    markerHeight: 12,
    markerUnits: 'userSpaceOnUse',
    orient: 'auto'
  });

  svgAppend(marker, svgCreate('path', type === 'filled' ? {
    d: 'M 1 3 L 19 10 L 1 17 Z',
    fill: STROKE,
    stroke: STROKE,
    strokeWidth: 1,
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

function getTabWidth(operator) {
  return Math.max(40, operator.length * 8 + 16);
}

function svgAppendTo(parentGfx, element) {
  svgAppend(parentGfx, element);

  return element;
}
