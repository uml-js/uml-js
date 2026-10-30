import { isLabel } from '../../core/util/ModelUtil.js';

import {
  HEAD_HEIGHT,
  OPERATOR_TAB_HEIGHT,
  getGuardText,
  getOperands,
  isCombinedFragment,
  isLifeline,
  isMessage,
  isOperand
} from '../util/ElementUtil.js';

import { getDefaultLabelBounds } from '../../core/util/GeometryUtil.js';

const HIGH_PRIORITY = 2000;



/**
 * Direct editing of names, in the head of lifelines and next to messages,
 * and of the guards of operands (also of the first operand of a frame).
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

    if (isLifeline(shape)) {
      activate(shape);
    }
  });

  function activate(element) {
    if (isLabel(element) || isEditable(element) || isCombinedFragment(element)) {
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
  let target = isLabel(element) ? element.labelTarget : element;

  if (isCombinedFragment(target)) {
    target = getOperands(target)[0];
  }

  if (!isEditable(target)) {
    return;
  }

  if (isOperand(target)) {
    return {
      text: getGuardText(target.businessObject),
      bounds: this._toScreen({
        x: target.x + 60,
        y: target.y + 2,
        width: Math.max(target.width - 70, 100),
        height: OPERATOR_TAB_HEIGHT
      }),
      style: this._getStyle(),
      options: {
        autoResize: true
      }
    };
  }

  const name = target.businessObject.name || '';

  let bounds;

  if (isMessage(target)) {
    const label = target.labels[0];

    bounds = label
      ? { x: label.x + label.width / 2 - 60, y: label.y, width: 120, height: Math.max(label.height, 20) }
      : getDefaultLabelBounds(target.waypoints, { width: 120, height: 20 });
  } else {
    bounds = {
      x: target.x,
      y: target.y,
      width: target.width,
      height: HEAD_HEIGHT
    };
  }

  return {
    text: name,
    bounds: this._toScreen(bounds),
    style: this._getStyle(),
    options: {
      centerVertically: !isMessage(target),
      autoResize: isMessage(target)
    }
  };
};

LabelEditingProvider.prototype.update = function(element, newLabel) {
  let target = isLabel(element) ? element.labelTarget : element;

  if (isCombinedFragment(target)) {
    target = getOperands(target)[0];
  }

  if (isOperand(target)) {
    return this._modeling.updateGuard(target, newLabel.replace(/^\s*\[|\]\s*$/g, ''));
  }

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
  return isLifeline(element) || isMessage(element) || isOperand(element);
}
