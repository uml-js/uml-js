import { isLabel } from '../../../core/util/ModelUtil.js';

import { hasExternalLabel } from '../../util/ElementUtil.js';

import { getExternalLabelBounds } from '../../util/LabelUtil.js';

const NULL_DIMENSIONS = { width: 0, height: 0 };


/**
 * Updates the name of an element and creates, resizes or removes the
 * external label of elements named outside their shape (ports, balls).
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
  updateExternalLabel(context.element, this._modeling, this._textRenderer, this._umlFactory);
};


/**
 * Make sure an element's external label matches its name: create it,
 * resize it or remove it if the element is not named (anymore).
 *
 * @param {Shape} element
 * @param {Modeling} modeling
 * @param {TextRenderer} textRenderer
 * @param {UmlFactory} umlFactory
 */
export function updateExternalLabel(element, modeling, textRenderer, umlFactory) {
  const name = element.businessObject.name;
  const label = element.labels[0];

  if (!hasExternalLabel(element) || !name) {
    if (label) {
      modeling.removeShape(label);
    }

    return;
  }

  if (!label) {
    const size = textRenderer.getExternalLabelBounds({ x: 0, y: 0, width: 0, height: 0 }, name);
    const bounds = getExternalLabelBounds(element, size);

    modeling.createLabel(element, {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    }, {
      id: element.id + '_label',
      businessObject: element.businessObject,
      di: umlFactory.createDiLabel(element.businessObject),
      width: bounds.width,
      height: bounds.height
    });

    return;
  }

  const newBounds = textRenderer.getExternalLabelBounds(label, name);

  if (newBounds.width !== label.width || newBounds.height !== label.height) {
    modeling.resizeShape(label, newBounds, NULL_DIMENSIONS);
  }
}
