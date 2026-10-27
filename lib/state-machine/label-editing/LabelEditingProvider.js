import { isConnection, isLabel } from '../../core/util/ModelUtil.js';

import { getCompartmentLines, getTransitionText } from '../util/LabelUtil.js';

import {
  ACTIVITY_LINE_HEIGHT,
  getPathMid,
  hasCompartment,
  isState,
  isTransition,
  NAME_COMPARTMENT_HEIGHT
} from '../util/ElementUtil.js';

const HIGH_PRIORITY = 2000;


/**
 * Direct editing of transition labels (`trigger [guard] / effect`) and of
 * states: above the separator line the name, below it the internal
 * behaviours, one `entry / ...`, `do / ...` or `exit / ...` per line;
 * other text is kept as is.
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

  // the compartment of the state edited, see #activate
  this._compartment = null;

  const self = this;

  directEditing.registerProvider(this);

  eventBus.on('element.dblclick', function(event) {
    const element = event.element;

    self._compartment = isState(element) ? self._getCompartmentAt(element, event.originalEvent) : null;

    activate(element);
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
      self._compartment = null;

      activate(context.shape);
    }
  });

  eventBus.on('autoPlace.end', 500, function(event) {
    if (isState(event.shape)) {
      self._compartment = null;

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

  const compartment = this._compartment || 'name';

  if (compartment === 'behaviours') {
    const lines = getCompartmentLines(bo);

    return {
      text: lines.join('\n'),
      bounds: this._toScreen({
        x: shape.x,
        y: shape.y + NAME_COMPARTMENT_HEIGHT,
        width: shape.width,
        height: Math.min(shape.height - NAME_COMPARTMENT_HEIGHT, (lines.length + 1) * ACTIVITY_LINE_HEIGHT + 8)
      }),
      style: { ...this._getStyle(), textAlign: 'left' },
      options: {
        resizable: false,
        autoResize: true
      }
    };
  }

  // the name: above the separator line, if there is one
  const simple = !hasCompartment(shape);

  return {
    text: bo.name || '',
    bounds: this._toScreen({
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: simple ? shape.height : NAME_COMPARTMENT_HEIGHT
    }),
    style: this._getStyle(),
    options: {
      centerVertically: true,
      resizable: false,
      autoResize: false
    }
  };
};

/**
 * @param {Shape} shape a state
 * @param {MouseEvent} event
 *
 * @return {'name'|'behaviours'} above or below the separator line
 */
LabelEditingProvider.prototype._getCompartmentAt = function(shape, event) {
  if (!hasCompartment(shape) || !event) {
    return 'name';
  }

  const viewbox = this._canvas.viewbox();
  const rect = this._canvas.getContainer().getBoundingClientRect();

  const y = viewbox.y + (event.clientY - rect.top) / viewbox.scale - shape.y;

  return y >= NAME_COMPARTMENT_HEIGHT ? 'behaviours' : 'name';
};

LabelEditingProvider.prototype.update = function(element, newLabel) {
  const target = isLabel(element) ? element.labelTarget : element;

  if (!isState(target)) {
    return this._modeling.updateLabel(target, newLabel);
  }

  const bo = target.businessObject;

  const compartment = this._compartment || 'name';

  this._compartment = null;

  // the textual notation of states: the name, then the behaviours and other text
  const name = compartment === 'name' ? newLabel.replace(/\s*\n\s*/g, ' ').trim() : (bo.name || '');

  const behaviours = compartment === 'behaviours'
    ? newLabel.split('\n')
    : getCompartmentLines(bo);

  this._modeling.updateLabel(target, [ name, ...behaviours ].join('\n'));
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
