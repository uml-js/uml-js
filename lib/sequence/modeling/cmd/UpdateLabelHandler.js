import { isLabel } from '../../../core/util/ModelUtil.js';

import { getDefaultLabelBounds } from '../../../core/util/GeometryUtil.js';

import { isMessage } from '../../util/ElementUtil.js';

const NULL_DIMENSIONS = { width: 0, height: 0 };


/**
 * Updates the name of an element. Messages show their name in an external
 * label, which is created, resized or removed accordingly.
 */
export default function UpdateLabelHandler(modeling, textRenderer, umlFactory) {
  this._modeling = modeling;
  this._textRenderer = textRenderer;
  this._umlFactory = umlFactory;
}

UpdateLabelHandler.$inject = [
  'modeling',
  'textRenderer',
  'umlFactory'
];

UpdateLabelHandler.prototype.execute = function(context) {
  const element = context.element = isLabel(context.element) ? context.element.labelTarget : context.element;
  const bo = element.businessObject;

  context.oldName = bo.name;

  bo.set('name', (context.newLabel || '').trim() || undefined);

  return [ element, ...element.labels ];
};

UpdateLabelHandler.prototype.revert = function(context) {
  const element = context.element;

  element.businessObject.set('name', context.oldName);

  return [ element, ...element.labels ];
};

UpdateLabelHandler.prototype.postExecute = function(context) {
  const element = context.element;

  if (!isMessage(element)) {
    return;
  }

  const name = element.businessObject.name;
  const label = element.labels[0];

  if (!name) {
    if (label) {
      this._modeling.removeShape(label);
    }

    return;
  }

  if (!label) {
    const size = this._textRenderer.getExternalLabelBounds({ x: 0, y: 0, width: 0, height: 0 }, name);
    const bounds = getDefaultLabelBounds(element.waypoints, size);

    this._modeling.createLabel(element, {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    }, {
      id: element.id + '_label',
      businessObject: element.businessObject,
      di: this._umlFactory.createDiLabel(element.businessObject),
      width: bounds.width,
      height: bounds.height
    });

    return;
  }

  const newBounds = this._textRenderer.getExternalLabelBounds(label, name);

  if (newBounds.width !== label.width || newBounds.height !== label.height) {
    this._modeling.resizeShape(label, newBounds, NULL_DIMENSIONS);
  }
};
