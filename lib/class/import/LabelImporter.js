import { isAssociation } from '../util/ElementUtil.js';

import { getEndData } from '../util/CompartmentUtil.js';

import { getEndLabelBounds } from '../util/EndLabelUtil.js';

import { formatEnd } from '../util/MemberUtil.js';


/**
 * Shows names and multiplicities of association ends without label DI,
 * e.g. in files written by other tools. The label DI is attached to the
 * association once a label changes.
 */
export default function LabelImporter(eventBus, canvas, elementFactory, textRenderer, umlFactory) {

  eventBus.on('import.label.missing', function(event) {
    const { element, root } = event;

    if (!isAssociation(element)) {
      return;
    }

    element.businessObject.get('memberEnd').forEach((end, index) => {
      const text = formatEnd(getEndData(end));

      if (!text) {
        return;
      }

      const size = textRenderer.getExternalLabelBounds({ x: 0, y: 0, width: 0, height: 0 }, text);

      const label = elementFactory.createLabel({
        id: end.id + '_label',
        type: end.$type,
        businessObject: end,
        di: umlFactory.createDiLabel(end),
        labelTarget: element,
        ...getEndLabelBounds(element.waypoints, index, size)
      });

      canvas.addShape(label, root);
    });
  });
}

LabelImporter.$inject = [
  'eventBus',
  'canvas',
  'elementFactory',
  'textRenderer',
  'umlFactory'
];
