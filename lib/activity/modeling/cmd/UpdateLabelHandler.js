import { isLabel } from '../../../core/util/ModelUtil.js';

import { getDefaultLabelBounds } from '../../../core/util/GeometryUtil.js';

import { isControlFlow } from '../../util/ElementUtil.js';

import { getFlowLabel, getGuardText, parseFlowLabel } from '../../util/LabelUtil.js';

const NULL_DIMENSIONS = { width: 0, height: 0 };


/**
 * Updates the name of an element or the name and guard of a control flow,
 * and creates, resizes or removes the label of control flows.
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
  const element = context.element;

  if (!isControlFlow(element)) {
    return;
  }

  const text = getFlowLabel(element.businessObject);
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

UpdateLabelHandler.prototype._createGuard = function(flow, text) {
  const guard = this._umlFactory.create('uml:OpaqueExpression', { body: [ text ] });

  guard.$parent = flow;

  return guard;
};
