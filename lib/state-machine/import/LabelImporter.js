import { getDefaultLabelBounds, isTransition } from '../util/ElementUtil.js';

import { getTransitionText } from '../util/LabelUtil.js';


/**
 * Shows labels for transitions that have a textual
 * notation but no label DI, e.g. in files written by other tools.
 *
 * The label DI is attached to the edge once the label changes.
 */
export default function LabelImporter(eventBus, canvas, elementFactory, textRenderer, umlFactory) {

  eventBus.on('import.label.missing', function(event) {
    const { element, root } = event;

    if (!isTransition(element)) {
      return;
    }

    const text = getTransitionText(element.businessObject);

    if (!text) {
      return;
    }

    const size = textRenderer.getExternalLabelBounds({ x: 0, y: 0, width: 0, height: 0 }, text);
    const bounds = getDefaultLabelBounds(element.waypoints, size);

    const label = elementFactory.createLabel({
      id: element.id + '_label',
      type: element.type,
      businessObject: element.businessObject,
      di: umlFactory.createDiLabel(element.businessObject),
      labelTarget: element,
      ...bounds
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
