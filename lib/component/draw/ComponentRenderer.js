import inherits from 'inherits-browser';

import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer.js';

import {
  append as svgAppend,
  attr as svgAttr,
  create as svgCreate
} from 'tiny-svg';

import { query as domQuery } from 'min-dom';

import { createLine } from 'diagram-js/lib/util/RenderUtil.js';

import { getMid } from 'diagram-js/lib/layout/LayoutUtil.js';

import { is, isLabel } from '../../core/util/ModelUtil.js';

import { getPathMid, isVerticalAtMid } from '../../core/util/GeometryUtil.js';

import { hasNestedClassifiers, isBall, isPortTyping } from '../util/ElementUtil.js';

import { getConnectionPath } from '../../core/draw/PathUtil.js';

const STROKE = '#22242a';
const FILL = '#ffffff';
const STROKE_WIDTH = 1.5;

const CONNECTION_RADIUS = 5;
const DASH = '6 4';

const HEADER_HEIGHT = 40;

const SOCKET_DISTANCE = 6;

const KEYWORD_WIDTH = 60;
const KEYWORD_HEIGHT = 16;

let markerCount = 0;


/**
 * Renders component diagram elements following the UML 2.5.1 notation,
 * including ball (provided interface) and socket (required interface).
 */
export default function ComponentRenderer(eventBus, canvas, textRenderer) {

  BaseRenderer.call(this, eventBus, 1000);

  this._canvas = canvas;
  this._textRenderer = textRenderer;

  this._markerPrefix = `uml-component-${ ++markerCount }`;
  this._markers = {};
}

inherits(ComponentRenderer, BaseRenderer);

ComponentRenderer.$inject = [
  'eventBus',
  'canvas',
  'textRenderer'
];

ComponentRenderer.prototype.canRender = function(element) {
  return [
    'uml:Component',
    'uml:Interface',
    'uml:Port',
    'uml:Dependency',
    'uml:Connector'
  ].some(type => is(element, type));
};

ComponentRenderer.prototype.drawShape = function(parentGfx, element) {

  if (isLabel(element)) {
    return this._drawText(parentGfx, element.businessObject.name || '', {
      box: { width: element.width, height: element.height },
      align: 'center-top',
      padding: 0,
      fitBox: true
    });
  }

  if (is(element, 'uml:Component')) {
    return this._drawClassifier(parentGfx, element, 'component', true);
  }

  if (isBall(element)) {
    return svgAppendTo(parentGfx, svgCreate('circle', {
      cx: element.width / 2,
      cy: element.height / 2,
      r: Math.min(element.width, element.height) / 2,
      stroke: STROKE,
      strokeWidth: STROKE_WIDTH,
      fill: FILL
    }));
  }

  if (is(element, 'uml:Interface')) {
    return this._drawClassifier(parentGfx, element, 'interface', false);
  }

  if (is(element, 'uml:Port')) {
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
};

ComponentRenderer.prototype.drawConnection = function(parentGfx, connection) {
  const target = connection.target;

  const toBall = target && isBall(target);

  const attrs = {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    strokeLinejoin: 'round',
    fill: 'none'
  };

  // the type of a port: provided (lollipop) or, conjugated, required (socket)
  if (isPortTyping(connection)) {
    if (connection.businessObject.isConjugated && toBall) {
      return this._drawSocket(parentGfx, connection, attrs);
    }

    return svgAppendTo(parentGfx, createLine(connection.waypoints, attrs, CONNECTION_RADIUS));
  }

  // provided interface (lollipop): solid line to the ball
  if (is(connection, 'uml:InterfaceRealization')) {
    if (toBall) {
      return svgAppendTo(parentGfx, createLine(connection.waypoints, attrs, CONNECTION_RADIUS));
    }

    return svgAppendTo(parentGfx, createLine(connection.waypoints, {
      ...attrs,
      strokeDasharray: DASH,
      markerEnd: `url(#${ this._getMarker('realization') })`
    }, CONNECTION_RADIUS));
  }

  // required interface (socket): solid line ending in a socket around the ball
  if (is(connection, 'uml:Usage') && toBall) {
    return this._drawSocket(parentGfx, connection, attrs);
  }

  if (is(connection, 'uml:Dependency')) {
    const line = svgAppendTo(parentGfx, createLine(connection.waypoints, {
      ...attrs,
      strokeDasharray: DASH,
      markerEnd: `url(#${ this._getMarker('dependency') })`
    }, CONNECTION_RADIUS));

    if (is(connection, 'uml:Usage')) {
      this._drawKeyword(parentGfx, connection, 'use');
    }

    return line;
  }

  // connector
  return svgAppendTo(parentGfx, createLine(connection.waypoints, attrs, CONNECTION_RADIUS));
};

ComponentRenderer.prototype.getShapePath = function(element) {
  const { x, y, width, height } = element;

  if (isBall(element)) {
    const r = Math.min(width, height) / 2;
    const cx = x + width / 2, cy = y + height / 2;

    return `M${ cx },${ cy - r }a${ r },${ r } 0 1 1 0,${ 2 * r }a${ r },${ r } 0 1 1 0,${ -2 * r }z`;
  }

  return `M${ x },${ y }h${ width }v${ height }h${ -width }z`;
};

ComponentRenderer.prototype.getConnectionPath = function(connection) {
  return getConnectionPath(connection);
};


// shapes //////////

/**
 * A rectangle with keyword and name, centered or (with nested
 * shapes) at the top, and an optional component icon.
 */
ComponentRenderer.prototype._drawClassifier = function(parentGfx, element, keyword, withIcon) {
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

  const nested = hasNestedClassifiers(element);

  this._drawText(parentGfx, `«${ keyword }»\n${ element.businessObject.name || '' }`, {
    box: {
      width,
      height: nested ? HEADER_HEIGHT : height
    },
    align: 'center-middle',
    padding: { top: 4, bottom: 4, left: withIcon ? 24 : 6, right: withIcon ? 24 : 6 }
  });

  if (withIcon) {
    drawComponentIcon(parentGfx, width - 22, 6);
  }

  return rect;
};

ComponentRenderer.prototype._drawSocket = function(parentGfx, connection, attrs) {
  const waypoints = connection.waypoints;
  const ball = connection.target;

  const center = getMid(ball);
  const radius = Math.min(ball.width, ball.height) / 2 + SOCKET_DISTANCE;

  const previous = waypoints[waypoints.length - 2];

  const length = Math.hypot(previous.x - center.x, previous.y - center.y) || 1;
  const direction = {
    x: (previous.x - center.x) / length,
    y: (previous.y - center.y) / length
  };

  const end = {
    x: center.x + direction.x * radius,
    y: center.y + direction.y * radius
  };

  const line = svgAppendTo(parentGfx, createLine([ ...waypoints.slice(0, -1), end ], attrs, CONNECTION_RADIUS));

  // half circle around the ball, open away from the source
  const angle = Math.atan2(direction.y, direction.x);

  const from = pointAt(center, radius, angle - Math.PI / 2);
  const to = pointAt(center, radius, angle + Math.PI / 2);

  svgAppendTo(parentGfx, svgCreate('path', {
    d: `M${ from.x },${ from.y } A${ radius },${ radius } 0 0 1 ${ to.x },${ to.y }`,
    ...attrs
  }));

  return line;
};

ComponentRenderer.prototype._drawKeyword = function(parentGfx, connection, keyword) {
  const waypoints = connection.waypoints;

  // at the middle of the path: above horizontal, right of vertical paths
  const mid = getPathMid(waypoints);
  const vertical = isVerticalAtMid(waypoints);

  const text = this._drawText(parentGfx, `«${ keyword }»`, {
    box: { width: KEYWORD_WIDTH, height: KEYWORD_HEIGHT },
    align: vertical ? 'left-top' : 'center-top',
    padding: 0
  });

  svgAttr(text, {
    transform: vertical
      ? `translate(${ mid.x + 4 }, ${ mid.y - KEYWORD_HEIGHT / 2 })`
      : `translate(${ mid.x - KEYWORD_WIDTH / 2 }, ${ mid.y - KEYWORD_HEIGHT - 2 })`
  });
};


// helpers //////////

ComponentRenderer.prototype._drawText = function(parentGfx, text, options) {
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

ComponentRenderer.prototype._getMarker = function(type) {
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

  svgAppend(marker, svgCreate('path', type === 'realization' ? {
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

function drawComponentIcon(parentGfx, x, y) {
  const attrs = {
    stroke: STROKE,
    strokeWidth: 1,
    fill: FILL
  };

  svgAppendTo(parentGfx, svgCreate('rect', { x: x + 3, y, width: 13, height: 17, ...attrs }));
  svgAppendTo(parentGfx, svgCreate('rect', { x, y: y + 3, width: 7, height: 4, ...attrs }));
  svgAppendTo(parentGfx, svgCreate('rect', { x, y: y + 10, width: 7, height: 4, ...attrs }));
}

function pointAt(center, radius, angle) {
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius
  };
}

function svgAppendTo(parentGfx, element) {
  svgAppend(parentGfx, element);

  return element;
}
