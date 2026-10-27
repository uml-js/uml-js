import { getDefaultLabelBounds } from '../../core/util/GeometryUtil.js';

import { isControlFlow } from '../util/ElementUtil.js';

import { getFlowLabel } from '../util/LabelUtil.js';


/**
 * Shows guards of control flows without label DI, e.g. in files written by
 * other tools. The label DI is attached to the edge once the label changes.
 */
export default function LabelImporter(eventBus, canvas, elementFactory, textRenderer, umlFactory) {

  eventBus.on('import.label.missing', function(event) {
    const { element, root } = event;

    const text = isControlFlow(element) && getFlowLabel(element.businessObject);

    if (!text) {
      return;
    }

    const size = textRenderer.getExternalLabelBounds({ x: 0, y: 0, width: 0, height: 0 }, text);

    const label = elementFactory.createLabel({
      id: element.id + '_label',
      type: element.type,
      businessObject: element.businessObject,
      di: umlFactory.createDiLabel(element.businessObject),
      labelTarget: element,
      ...getDefaultLabelBounds(element.waypoints, size)
    });

    canvas.addShape(label, root);
  });
}

LabelImporter.$inject = [
  'eventBus',
  'canvas',
  'elementFactory',
  'textRenderer',
  'umlFactory'
];
