import { isAssociation, isClassifier, isEndLabel } from '../util/ElementUtil.js';

import { getCompartmentAt, getCompartments, getEndData, getQualifierData, LINE_HEIGHT, PADDING } from '../util/CompartmentUtil.js';

import { getEnd, getEndLabelBounds } from '../util/EndLabelUtil.js';

import { formatEndText, formatQualifiers, parseQualifiers } from '../util/MemberUtil.js';

import { getEndQualifierBox, getQualifierExtent } from '../util/QualifierUtil.js';

const HIGH_PRIORITY = 2000;


/**
 * Direct editing of class diagrams:
 *
 *   * the compartment of a classifier double-clicked, one member per line
 *   * the end of an association nearest to the double-click, as `[qualifiers] name multiplicity`
 *   * the qualifiers of an end, in their box, e.g. `node: Node, kind`
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

  // what is edited, see #activate
  this._target = null;

  const self = this;

  directEditing.registerProvider(this);

  eventBus.on('element.dblclick', function(event) {
    const point = self._toDiagram(event.originalEvent);

    activate(event.element, point);
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

    if (isClassifier(shape)) {
      activate(shape);
    }
  });

  function activate(element, point) {
    const target = self._getTarget(element, point);

    if (target) {
      self._target = target;

      directEditing.activate(element);
    }
  }

  this._directEditing = directEditing;
}

/**
 * Edit the qualifiers of an association end in their box, e.g. once added.
 *
 * @param {Connection} connection an association
 * @param {number} index 0 for the source end, 1 for the target end
 */
LabelEditingProvider.prototype.editQualifiers = function(connection, index) {
  this._target = { association: connection, index, qualifiers: true };

  this._directEditing.activate(connection);
};

LabelEditingProvider.$inject = [
  'eventBus',
  'canvas',
  'directEditing',
  'modeling',
  'resizeHandles',
  'textRenderer'
];

/**
 * @param {Element} element
 * @param {Point} [point] where the element was double-clicked
 *
 * @return {Object|null} what to edit: a compartment of a classifier or an end of an association
 */
LabelEditingProvider.prototype._getTarget = function(element, point) {
  if (isEndLabel(element)) {
    const association = element.labelTarget;

    return { association, index: association.businessObject.get('memberEnd').indexOf(element.businessObject) };
  }

  if (isClassifier(element)) {
    const compartment = point ? getCompartmentAt(element.businessObject, point.y - element.y) : 'name';

    return { classifier: element, compartment };
  }

  if (isAssociation(element)) {
    let index = 1;

    // in the box of the qualifiers of an end
    const qualified = point && element.businessObject.get('memberEnd').findIndex((end, i) => {
      const box = getEndQualifierBox(end, element.waypoints, i, this._textRenderer);

      return box && point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
    });

    if (point && qualified !== -1) {
      return { association: element, index: qualified, qualifiers: true };
    }

    if (point) {
      const distance = end => Math.hypot(end.point.x - point.x, end.point.y - point.y);

      index = distance(getEnd(element.waypoints, 0)) < distance(getEnd(element.waypoints, 1)) ? 0 : 1;
    }

    return { association: element, index };
  }

  return null;
};

LabelEditingProvider.prototype.activate = function(element) {
  const target = this._target || this._getTarget(element);

  if (!target) {
    return;
  }

  if (target.classifier) {
    return this._activateCompartment(target.classifier, target.compartment);
  }

  if (target.qualifiers) {
    return this._activateQualifiers(target.association, target.index);
  }

  return this._activateEnd(target.association, target.index);
};

LabelEditingProvider.prototype._activateQualifiers = function(connection, index) {
  const end = connection.businessObject.get('memberEnd')[index];

  const box = getEndQualifierBox(end, connection.waypoints, index, this._textRenderer);

  return {
    text: formatQualifiers(getQualifierData(end)),
    bounds: this._toScreen({ x: box.x, y: box.y, width: Math.max(box.width, 100), height: box.height }),
    style: {
      ...this._getStyle(),
      textAlign: 'center'
    },
    options: {
      centerVertically: true,
      autoResize: true
    }
  };
};

LabelEditingProvider.prototype._activateCompartment = function(element, id) {
  const compartment = getCompartments(element.businessObject).find(c => c.id === id);

  const text = id === 'name' ? (element.businessObject.name || '') : compartment.lines.join('\n');

  const bounds = {
    x: element.x,
    y: element.y + compartment.y,
    width: element.width,
    height: Math.max(compartment.height, LINE_HEIGHT + 2 * PADDING)
  };

  return {
    text,
    bounds: this._toScreen(bounds),
    style: {
      ...this._getStyle(),
      textAlign: id === 'name' ? 'center' : 'left'
    },
    options: {
      centerVertically: id === 'name',
      autoResize: id !== 'name'
    }
  };
};

LabelEditingProvider.prototype._activateEnd = function(connection, index) {
  const end = connection.businessObject.get('memberEnd')[index];

  const label = connection.labels.find(label => label.businessObject === end);

  const bounds = label
    ? { x: label.x + label.width / 2 - 50, y: label.y, width: 100, height: Math.max(label.height, 20) }
    : getEndLabelBounds(connection.waypoints, index, { width: 100, height: 20 }, getQualifierExtent(end, connection.waypoints, index, this._textRenderer));

  return {
    text: formatEndText(getQualifierData(end), getEndData(end)),
    bounds: this._toScreen(bounds),
    style: this._getStyle(),
    options: {
      autoResize: true
    }
  };
};

LabelEditingProvider.prototype.update = function(element, newText) {
  const target = this._target || this._getTarget(element);

  this._target = null;

  if (!target) {
    return;
  }

  if (target.classifier) {
    return this._modeling.updateMembers(target.classifier, target.compartment, newText);
  }

  // the qualifiers in their box, an empty box removing them
  if (target.qualifiers) {
    const end = target.association.businessObject.get('memberEnd')[target.index];
    const { qualifiers } = parseQualifiers(`[${ newText }]`);

    return this._modeling.updateEnd(target.association, target.index, formatEndText(qualifiers, getEndData(end)));
  }

  this._modeling.updateEnd(target.association, target.index, newText);
};

LabelEditingProvider.prototype._toDiagram = function(event) {
  const viewbox = this._canvas.viewbox();
  const rect = this._canvas.getContainer().getBoundingClientRect();

  return {
    x: viewbox.x + (event.clientX - rect.left) / viewbox.scale,
    y: viewbox.y + (event.clientY - rect.top) / viewbox.scale
  };
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
