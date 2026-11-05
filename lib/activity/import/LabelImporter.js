import { getExternalLabelBounds, getLabelText, hasExternalLabel } from '../util/LabelUtil.js';


/**
 * Shows guards of flows and names of pins and expansion nodes without label DI,
 * e.g. in files written by other tools. The label DI is attached to the element
 * once the label changes.
 */
export default function LabelImporter(eventBus, canvas, elementFactory, textRenderer, umlFactory) {

  eventBus.on('import.label.missing', function(event) {
    const { element, root } = event;

    const text = hasExternalLabel(element) && getLabelText(element.businessObject);

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
      ...getExternalLabelBounds(element, size)
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
