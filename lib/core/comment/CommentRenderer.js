import inherits from 'inherits-browser';

import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer.js';

import {
  append as svgAppend,
  attr as svgAttr,
  create as svgCreate
} from 'tiny-svg';

import { createLine } from 'diagram-js/lib/util/RenderUtil.js';

import { getConnectionPath } from '../draw/PathUtil.js';

import { FOLD, isAnchor, isNote } from './CommentUtil.js';

const STROKE = '#22242a';
const FILL = '#ffffff';
const STROKE_WIDTH = 1.5;

const DASH = '6 4';

// above the renderers of the diagram types
const PRIORITY = 1500;


/**
 * Renders notes (UML comments) in all diagram types: a rectangle with a
 * folded corner, connected to annotated elements by dashed lines.
 */
export default function CommentRenderer(eventBus, textRenderer) {
  BaseRenderer.call(this, eventBus, PRIORITY);

  this._textRenderer = textRenderer;
}

inherits(CommentRenderer, BaseRenderer);

CommentRenderer.$inject = [
  'eventBus',
  'textRenderer'
];

CommentRenderer.prototype.canRender = function(element) {
  return isNote(element) || isAnchor(element);
};

CommentRenderer.prototype.drawShape = function(parentGfx, element) {
  const { width, height } = element;

  const outline = svgCreate('path', {
    d: `M0,0H${ width - FOLD }L${ width },${ FOLD }V${ height }H0Z`,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    strokeLinejoin: 'round',
    fill: FILL
  });

  svgAppend(parentGfx, outline);

  svgAppend(parentGfx, svgCreate('path', {
    d: `M${ width - FOLD },0V${ FOLD }H${ width }`,
    stroke: STROKE,
    strokeWidth: 1,
    strokeLinejoin: 'round',
    fill: 'none'
  }));

  const text = this._textRenderer.createText(element.businessObject.body || '', {
    box: { width, height },
    align: 'left-top',
    padding: { top: 6, left: 8, right: FOLD + 2, bottom: 6 },
    style: {
      ...this._textRenderer.getDefaultStyle(),
      fill: STROKE
    }
  });

  svgAttr(text, { class: 'djs-label' });

  svgAppend(parentGfx, text);

  return outline;
};

CommentRenderer.prototype.drawConnection = function(parentGfx, connection) {
  const line = createLine(connection.waypoints, {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    strokeDasharray: DASH,
    fill: 'none'
  });

  svgAppend(parentGfx, line);

  return line;
};

CommentRenderer.prototype.getShapePath = function(element) {
  const { x, y, width, height } = element;

  return `M${ x },${ y }h${ width - FOLD }l${ FOLD },${ FOLD }v${ height - FOLD }h${ -width }z`;
};

CommentRenderer.prototype.getConnectionPath = function(connection) {
  return getConnectionPath(connection);
};
