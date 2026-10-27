import { hasExternalLabel, isPort } from '../util/ElementUtil.js';

import { getExternalLabelBounds } from '../util/LabelUtil.js';


/**
 * Component diagram specifics of importing UML DI:
 *
 *   * ports are attached to the component they are drawn in
 *   * ports and ball interfaces without label DI get a default label
 */
export default function ComponentImporter(eventBus, canvas, elementFactory, textRenderer, umlFactory) {

  eventBus.on('import.shape.attach', function(event) {
    return isPort(event.businessObject);
  });

  eventBus.on('import.label.missing', function(event) {
    const { element, root } = event;

    if (!hasExternalLabel(element)) {
      return;
    }

    const name = element.businessObject.name;

    if (!name) {
      return;
    }

    const size = textRenderer.getExternalLabelBounds({ x: 0, y: 0, width: 0, height: 0 }, name);

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

ComponentImporter.$inject = [
  'eventBus',
  'canvas',
  'elementFactory',
  'textRenderer',
  'umlFactory'
];
