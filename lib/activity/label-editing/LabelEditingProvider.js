import { isLabel } from '../../core/util/ModelUtil.js';

import { getActionName, isAction, isControlFlow, isStructured, STRUCTURED_HEADER_HEIGHT } from '../util/ElementUtil.js';

import { getFlowLabel } from '../util/LabelUtil.js';

import { getDefaultLabelBounds } from '../../core/util/GeometryUtil.js';

const HIGH_PRIORITY = 2000;



/**
 * Direct editing of the names of actions and of the
 * labels of control flows (`name [guard]`).
 *
 * Activation and completion of direct editing are adapted from bpmn-js,
 * LabelEditingProvider (https://github.com/bpmn-io/bpmn-js).
 */
export default function LabelEditingProvider(
    eventBus, canvas, directEditing,
    modeling, resizeHandles, textRenderer) {

  this._canvas = canvas;
  this._modeling = modeling;
  this._textRenderer = textRenderer;

  directEditing.registerProvider(this);

  eventBus.on('element.dblclick', function(event) {
    activate(event.element);
  });

  eventBus.on([
    'autoPlace.start',
    'canvas.viewbox.changing',
    'drag.init',
    'element.mousedown',
    'popupMenu.open',
    'root.set',
    'selection.changed'
  ], function() {
    if (directEditing.isActive()) {
      directEditing.complete();
    }
  });

  eventBus.on([
    'shape.remove',
    'connection.remove'
  ], HIGH_PRIORITY, function(event) {
    if (directEditing.isActive(event.element)) {
      directEditing.cancel();
    }
  });

  eventBus.on('commandStack.changed', function() {
    if (directEditing.isActive()) {
      directEditing.cancel();
    }
  });

  eventBus.on('directEditing.activate', function() {
    resizeHandles.removeResizers();

    // select the existing text, so typing replaces it
    const range = document.createRange();

    range.selectNodeContents(directEditing._textbox.content);

    const selection = window.getSelection();

    selection.removeAllRanges();
    selection.addRange(range);
  });

  eventBus.on([ 'create.end', 'autoPlace.end' ], 500, function(event) {
    const shape = event.shape || (event.context && event.context.shape);

    if (event.isTouch || (event.context && !event.context.canExecute)) {
      return;
    }

    // not when pasted, as in bpmn-js
    if (event.context && event.context.hints && event.context.hints.createElementsBehavior === false) {
      return;
    }

    if (isAction(shape)) {
      activate(shape);
    }
  });

  function activate(element) {
    if (isLabel(element) || isEditable(element)) {
      directEditing.activate(element);
    }
  }
}

LabelEditingProvider.$inject = [
  'eventBus',
  'canvas',
  'directEditing',
  'modeling',
  'resizeHandles',
  'textRenderer'
];

LabelEditingProvider.prototype.activate = function(element) {
  const target = isLabel(element) ? element.labelTarget : element;

  if (!isEditable(target)) {
    return;
  }

  const name = isControlFlow(target) ? getFlowLabel(target.businessObject) : getActionName(target.businessObject);

  let bounds;

  if (isControlFlow(target)) {
    const label = target.labels[0];

    bounds = label
      ? { x: label.x + label.width / 2 - 60, y: label.y, width: 120, height: Math.max(label.height, 20) }
      : getDefaultLabelBounds(target.waypoints, { width: 120, height: 20 });
  } else if (isStructured(target)) {

    // the name below the keyword «structured»
    bounds = { x: target.x, y: target.y + STRUCTURED_HEADER_HEIGHT / 2 - 4, width: target.width, height: STRUCTURED_HEADER_HEIGHT / 2 + 4 };
  } else {
    bounds = { x: target.x, y: target.y, width: target.width, height: target.height };
  }

  return {
    text: name,
    bounds: this._toScreen(bounds),
    style: this._getStyle(),
    options: {
      centerVertically: !isControlFlow(target),
      autoResize: isControlFlow(target)
    }
  };
};

LabelEditingProvider.prototype.update = function(element, newLabel) {
  const target = isLabel(element) ? element.labelTarget : element;

  this._modeling.updateLabel(target, newLabel);
};

LabelEditingProvider.prototype._toScreen = function(bounds) {
  const viewbox = this._canvas.viewbox();
  const scale = viewbox.scale;

  return {
    x: (bounds.x - viewbox.x) * scale,
    y: (bounds.y - viewbox.y) * scale,
    width: bounds.width * scale,
    height: bounds.height * scale
  };
};

LabelEditingProvider.prototype._getStyle = function() {
  const style = this._textRenderer.getDefaultStyle();
  const scale = this._canvas.viewbox().scale;

  return {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize * scale + 'px',
    lineHeight: style.lineHeight,
    paddingTop: 4 * scale + 'px',
    paddingBottom: 4 * scale + 'px',
    paddingLeft: 6 * scale + 'px',
    paddingRight: 6 * scale + 'px'
  };
};


function isEditable(element) {
  return isAction(element) || isControlFlow(element);
}
