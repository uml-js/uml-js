import { isConnection, isLabel } from '../../../core/util/ModelUtil.js';

import { getShapeLabelBounds } from '../../../core/util/GeometryUtil.js';

import { getConnectionPointName, getDefaultLabelBounds, hasExternalLabel } from '../../util/ElementUtil.js';

import {
  getLabelProperties,
  getLabelPropertyNames,
  getTransitionText
} from '../../util/LabelUtil.js';

const NULL_DIMENSIONS = { width: 0, height: 0 };


/**
 * Updates the model behind the textual notation of an element and creates,
 * resizes or removes the external label of transitions and of entry and exit points.
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
  const element = context.element = getLabelOwner(context.element);
  const bo = element.businessObject;

  if (!context.oldProperties) {
    context.oldProperties = getProperties(bo, getLabelPropertyNames(bo));
  }

  // compute once, so re-doing re-uses the same model elements
  if (!context.newProperties) {
    context.newProperties = getLabelProperties(bo, context.newLabel || '', this._umlFactory);
  }

  setProperties(bo, context.newProperties);

  return [ element, ...element.labels ];
};

UpdateLabelHandler.prototype.revert = function(context) {
  const element = context.element;

  setProperties(element.businessObject, context.oldProperties);

  return [ element, ...element.labels ];
};

UpdateLabelHandler.prototype.postExecute = function(context) {
  const element = context.element;

  if (hasExternalLabel(element)) {
    return updateExternalLabel(element, this._modeling, this._textRenderer, this._umlFactory);
  }

  if (!isConnection(element)) {
    return;
  }

  const text = getTransitionText(element.businessObject);
  const label = element.labels[0];

  if (!text) {
    if (label) {
      this._modeling.removeShape(label);
    }

    return;
  }

  if (!label) {
    const size = this._textRenderer.getExternalLabelBounds({ x: 0, y: 0, width: 0, height: 0 }, text);
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

  const newBounds = this._textRenderer.getExternalLabelBounds(label, text);

  if (newBounds.width !== label.width || newBounds.height !== label.height) {
    this._modeling.resizeShape(label, newBounds, NULL_DIMENSIONS);
  }
};


/**
 * Make sure the external label of an entry or exit point, or of a reference to
 * one, matches its name: create it, resize it or remove it if it is not named (anymore).
 *
 * @param {Shape} element
 * @param {Modeling} modeling
 * @param {TextRenderer} textRenderer
 * @param {UmlFactory} umlFactory
 */
export function updateExternalLabel(element, modeling, textRenderer, umlFactory) {
  const name = getConnectionPointName(element.businessObject);
  const label = element.labels[0];

  if (!name) {
    if (label) {
      modeling.removeShape(label);
    }

    return;
  }

  if (!label) {
    const size = textRenderer.getExternalLabelBounds({ x: 0, y: 0, width: 0, height: 0 }, name);
    const bounds = getShapeLabelBounds(element, size);

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


// helpers //////////

function getLabelOwner(element) {
  return isLabel(element) ? element.labelTarget : element;
}

function getProperties(bo, names) {
  const properties = {};

  for (const name of names) {
    const value = bo.get(name);

    properties[name] = Array.isArray(value) ? [ ...value ] : value;
  }

  return properties;
}

function setProperties(bo, properties) {
  for (const [ name, value ] of Object.entries(properties)) {
    bo.set(name, Array.isArray(value) ? [ ...value ] : value);
  }
}
