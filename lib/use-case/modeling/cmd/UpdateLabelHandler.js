import { isLabel } from '../../../core/util/ModelUtil.js';

import { getActorLabelBounds, isActor } from '../../util/ElementUtil.js';

const NULL_DIMENSIONS = { width: 0, height: 0 };


/**
 * Updates the name of an element. Actors show their name in an external
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
  updateActorLabel(context.element, this._modeling, this._textRenderer, this._umlFactory);
};


/**
 * Make sure the label of an actor matches its name.
 */
export function updateActorLabel(element, modeling, textRenderer, umlFactory) {
  if (!isActor(element)) {
    return;
  }

  const name = element.businessObject.name;
  const label = element.labels[0];

  if (!name) {
    if (label) {
      modeling.removeShape(label);
    }

    return;
  }

  if (!label) {
    const size = textRenderer.getExternalLabelBounds({ x: 0, y: 0, width: 0, height: 0 }, name);
    const bounds = getActorLabelBounds(element, size);

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
