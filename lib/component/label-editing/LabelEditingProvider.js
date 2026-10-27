import { isLabel } from '../../core/util/ModelUtil.js';

import { hasExternalLabel, hasNestedClassifiers, isComponent, isInterface, isPort, isRelationship } from '../util/ElementUtil.js';

import { getExternalLabelBounds } from '../util/LabelUtil.js';

const HIGH_PRIORITY = 2000;

const HEADER_HEIGHT = 40;


/**
 * Direct editing of names: inside components and interfaces,
 * next to ports, balls and relationships.
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

    if (isComponent(shape) || isInterface(shape)) {
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

  const name = target.businessObject.name || '';

  let bounds;

  if (hasExternalLabel(target)) {
    const label = target.labels[0];

    bounds = label
      ? { x: label.x + label.width / 2 - 60, y: label.y, width: 120, height: Math.max(label.height, 20) }
      : getExternalLabelBounds(target, { width: 120, height: 20 });
  } else {
    bounds = {
      x: target.x,
      y: target.y,
      width: target.width,
      height: hasNestedClassifiers(target) ? HEADER_HEIGHT : target.height
    };
  }

  return {
    text: name,
    bounds: this._toScreen(bounds),
    style: this._getStyle(),
    options: {
      centerVertically: !hasExternalLabel(target),
      autoResize: hasExternalLabel(target)
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
  return isComponent(element) || isInterface(element) || isPort(element) || isRelationship(element);
}
