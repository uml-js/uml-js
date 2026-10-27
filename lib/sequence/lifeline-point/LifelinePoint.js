import { append as svgAppend, attr as svgAttr, classes as svgClasses, create as svgCreate } from 'tiny-svg';

import { query as domQuery } from 'min-dom';

import { hasModifier } from 'diagram-js/lib/features/keyboard/KeyboardUtil.js';

import { isPrimaryButton } from 'diagram-js/lib/util/Mouse.js';

import { HEAD_HEIGHT, getLifelineX, isExecution, isLifeline } from '../util/ElementUtil.js';

const HIGH_PRIORITY = 1500;

const POINT_RADIUS = 6;
const OUTLINE_OFFSET = 4;


/**
 * Selects a point on a lifeline rather than the whole lifeline: a click on
 * the line remembers its height, which is highlighted instead of the
 * lifeline's bounds, and where the context pad opens and messages start.
 * A click on the head selects the lifeline, highlighting the head.
 *
 * Dragging from the line of a lifeline (or an activation bar) draws a message
 * from the point pressed; lifelines are moved by their head.
 */
export default function LifelinePoint(eventBus, canvas, outline, contextPad, selection, elementRegistry, connect) {
  this._canvas = canvas;
  this._outline = outline;
  this._elementRegistry = elementRegistry;

  // lifeline -> height of the selected point, relative to the lifeline
  this._points = new Map();

  const self = this;

  eventBus.on('element.mousedown', HIGH_PRIORITY, function(event) {
    const element = event.element;
    const originalEvent = event.originalEvent;

    if (!originalEvent || !(isLifeline(element) || isExecution(element))) {
      return;
    }

    const y = self._toDiagram(originalEvent).y;

    if (isLifeline(element)) {
      self._setPoint(element, y);
    }

    // draw a message rather than moving (see diagram-js Move)
    const fromLine = isExecution(element) || self.getPoint(element);

    if (fromLine && isPrimaryButton(originalEvent) && !hasModifier(originalEvent)) {
      connect.start(originalEvent, element, { x: getLifelineX(element), y: Math.round(y) });

      return true;
    }
  });

  // another point on a selected lifeline: keep it selected, move the context pad
  eventBus.on('element.click', HIGH_PRIORITY, function(event) {
    const element = event.element;

    if (isLifeline(element) && selection.isSelected(element) && selection.get().length === 1) {
      contextPad.open(element, true);

      return false;
    }
  });

  outline.registerProvider(this);

  // the context pad opens next to the point
  const getPosition = contextPad._getPosition.bind(contextPad);

  contextPad._getPosition = function(target) {
    const point = !Array.isArray(target) && self.getPoint(target);

    if (!point) {
      return getPosition(target);
    }

    const viewbox = canvas.viewbox();

    return {
      left: (point.x - viewbox.x) * viewbox.scale + POINT_RADIUS * 2 * viewbox.scale,
      top: (point.y - viewbox.y) * viewbox.scale - 12
    };
  };
}

LifelinePoint.$inject = [
  'eventBus',
  'canvas',
  'outline',
  'contextPad',
  'selection',
  'elementRegistry',
  'connect'
];

/**
 * @param {Shape} lifeline
 *
 * @return {Point|null} the selected point on the line of a lifeline, if any
 */
LifelinePoint.prototype.getPoint = function(lifeline) {
  if (!isLifeline(lifeline) || !this._points.has(lifeline)) {
    return null;
  }

  return {
    x: getLifelineX(lifeline),
    y: lifeline.y + this._points.get(lifeline)
  };
};

LifelinePoint.prototype._setPoint = function(lifeline, y) {
  const offset = y - lifeline.y;

  if (offset > HEAD_HEIGHT && offset < lifeline.height) {
    this._points.set(lifeline, Math.round(offset));
  } else {
    this._points.delete(lifeline);
  }

  const gfx = this._elementRegistry.getGraphics(lifeline);
  const outline = gfx && domQuery('.djs-outline', gfx);

  if (outline) {
    this.updateOutline(lifeline, outline);
  }
};

LifelinePoint.prototype._toDiagram = function(event) {
  const viewbox = this._canvas.viewbox();
  const container = this._canvas.getContainer().getBoundingClientRect();

  return {
    x: (event.clientX - container.left) / viewbox.scale + viewbox.x,
    y: (event.clientY - container.top) / viewbox.scale + viewbox.y
  };
};


// outline provider //////////

/**
 * Lifelines are outlined at their head, or at the selected point.
 */
LifelinePoint.prototype.getOutline = function(element) {
  if (!isLifeline(element)) {
    return;
  }

  const outline = svgCreate('g');

  svgClasses(outline).add('djs-outline');

  svgAppend(outline, svgCreate('rect', { class: 'head', rx: 4, fill: 'none' }));
  svgAppend(outline, svgCreate('circle', { class: 'point', r: POINT_RADIUS, fill: 'none' }));

  return outline;
};

LifelinePoint.prototype.updateOutline = function(element, outline) {
  if (!isLifeline(element)) {
    return false;
  }

  const head = domQuery('.head', outline);
  const point = domQuery('.point', outline);

  if (!head || !point) {
    return false;
  }

  const offset = this._points.get(element);

  svgAttr(head, {
    x: -OUTLINE_OFFSET,
    y: -OUTLINE_OFFSET,
    width: element.width + 2 * OUTLINE_OFFSET,
    height: HEAD_HEIGHT + 2 * OUTLINE_OFFSET,
    display: offset === undefined ? null : 'none'
  });

  svgAttr(point, {
    cx: element.width / 2,
    cy: offset || 0,
    display: offset === undefined ? 'none' : null
  });

  return true;
};
