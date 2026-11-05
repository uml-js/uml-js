import { isLabel } from '../../../core/util/ModelUtil.js';

import { isControlFlow } from '../../util/ElementUtil.js';

import {
  getExternalLabelBounds,
  getGuardText,
  getLabelText,
  hasExternalLabel,
  parseFlowLabel
} from '../../util/LabelUtil.js';

const NULL_DIMENSIONS = { width: 0, height: 0 };


/**
 * Updates the name of an element or the name and guard of a flow, and creates,
 * resizes or removes the external label of flows, pins and expansion nodes.
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
  const text = (context.newLabel || '').trim();

  context.oldName = bo.name;
  context.oldGuard = bo.guard;

  if (isControlFlow(element)) {
    const { name, guard } = parseFlowLabel(text);

    // compute once, so re-doing re-uses the same model elements
    if (!('newGuard' in context)) {
      context.newGuard = guard === getGuardText(bo) ? bo.guard : (guard ? this._createGuard(bo, guard) : undefined);
    }

    bo.set('name', name || undefined);
    bo.set('guard', context.newGuard);
  } else {
    bo.set('name', text || undefined);
  }

  return [ element, ...element.labels ];
};

UpdateLabelHandler.prototype.revert = function(context) {
  const element = context.element;
  const bo = element.businessObject;

  bo.set('name', context.oldName);

  if (isControlFlow(element)) {
    bo.set('guard', context.oldGuard);
  }

  return [ element, ...element.labels ];
};

UpdateLabelHandler.prototype.postExecute = function(context) {
  updateExternalLabel(context.element, this._modeling, this._textRenderer, this._umlFactory);
};

UpdateLabelHandler.prototype._createGuard = function(flow, text) {
  const guard = this._umlFactory.create('uml:OpaqueExpression', { body: [ text ] });

  guard.$parent = flow;

  return guard;
};


/**
 * Create, resize or remove the external label of a flow, pin or expansion node
 * to show its text.
 *
 * @param {Element} element
 * @param {Modeling} modeling
 * @param {TextRenderer} textRenderer
 * @param {UmlFactory} umlFactory
 */
export function updateExternalLabel(element, modeling, textRenderer, umlFactory) {
  if (!hasExternalLabel(element)) {
    return;
  }

  const text = getLabelText(element.businessObject);
  const label = element.labels[0];

  if (!text) {
    if (label) {
      modeling.removeShape(label);
    }

    return;
  }

  if (!label) {
    const size = textRenderer.getExternalLabelBounds({ x: 0, y: 0, width: 0, height: 0 }, text);
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

  const newBounds = textRenderer.getExternalLabelBounds(label, text);

  if (newBounds.width !== label.width || newBounds.height !== label.height) {
    modeling.resizeShape(label, newBounds, NULL_DIMENSIONS);
  }
}
