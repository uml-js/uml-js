import { isConnection, isLabel } from '../../core/util/ModelUtil.js';

import { getActivities, getStateText, getTransitionText } from '../util/LabelUtil.js';

import { getPathMid, isComposite, isState, isTransition } from '../util/ElementUtil.js';

const HIGH_PRIORITY = 2000;

const NAME_COMPARTMENT_HEIGHT = 26;
const ACTIVITY_LINE_HEIGHT = 15;


/**
 * Direct editing of state names and internal activities as well as
 * transition labels (`trigger [guard] / effect`).
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

  eventBus.on('directEditing.activate', function(event) {
    resizeHandles.removeResizers();

    // select the existing text, so typing replaces it
    const content = directEditing._textbox.content;
    const range = document.createRange();

    range.selectNodeContents(content);

    const selection = window.getSelection();

    selection.removeAllRanges();
    selection.addRange(range);
  });

  eventBus.on('create.end', 500, function(event) {
    const { context, isTouch } = event;

    if (isTouch || !context.canExecute) {
      return;
    }

    if (isState(context.shape)) {
      activate(context.shape);
    }
  });

  eventBus.on('autoPlace.end', 500, function(event) {
    if (isState(event.shape)) {
      activate(event.shape);
    }
  });

  function activate(element) {
    if (isLabel(element) || isState(element) || isTransition(element)) {
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

  if (isConnection(target) && isTransition(target)) {
    return this._activateTransition(target);
  }

  if (isState(target)) {
    return this._activateState(target);
  }
};

LabelEditingProvider.prototype._activateTransition = function(connection) {
  const label = connection.labels[0];

  let bounds;

  if (label) {
    bounds = {
      x: label.x,
      y: label.y,
      width: Math.max(label.width, 120),
      height: Math.max(label.height, 20)
    };

    bounds.x -= (bounds.width - label.width) / 2;
  } else {
    const mid = getPathMid(connection.waypoints);

    bounds = { x: mid.x - 60, y: mid.y - 25, width: 120, height: 20 };
  }

  return {
    text: getTransitionText(connection.businessObject),
    bounds: this._toScreen(bounds),
    style: this._getStyle(),
    options: {
      autoResize: true
    }
  };
};

LabelEditingProvider.prototype._activateState = function(shape) {
  const bo = shape.businessObject;

  const simple = !isComposite(bo) && !getActivities(bo).length;

  // composite states are edited in their name / activities compartments only
  const height = simple
    ? shape.height
    : Math.min(shape.height, NAME_COMPARTMENT_HEIGHT + (getActivities(bo).length + 1) * ACTIVITY_LINE_HEIGHT);

  return {
    text: getStateText(bo),
    bounds: this._toScreen({
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height
    }),
    style: this._getStyle(),
    options: {
      centerVertically: simple,
      resizable: false,
      autoResize: false
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
