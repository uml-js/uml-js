import { getShapeLabelBounds } from '../../core/util/GeometryUtil.js';

import {
  getConnectionPointName,
  getDefaultLabelBounds,
  hasExternalLabel,
  isBorderVertex,
  isComposite,
  isState,
  isTransition
} from '../util/ElementUtil.js';

import { getTransitionText } from '../util/LabelUtil.js';


/**
 * State machine diagram specifics of importing UML DI:
 *
 *   * entry and exit points and connection point references drawn in a state
 *     are attached to it
 *   * transitions with a textual notation, and named entry and exit points
 *     and references to them, without label DI, e.g. in files written by other
 *     tools, get a default label
 *   * composite states are drawn again once their sub-states are imported,
 *     drawn as composite states with hidden decomposition before
 *
 * The label DI is attached to the edge or shape once the label changes.
 */
export default function StateMachineImporter(eventBus, canvas, elementFactory, textRenderer, umlFactory, elementRegistry) {

  eventBus.on('import.render.complete', function() {
    elementRegistry.filter(element => isState(element) && isComposite(element)).forEach(element => {
      eventBus.fire('element.changed', { element });
    });
  });

  eventBus.on('import.shape.attach', function(event) {
    const { businessObject, parent } = event;

    return isBorderVertex({ businessObject }) && isState(parent);
  });

  eventBus.on('import.label.missing', function(event) {
    const { element, root } = event;

    const transition = isTransition(element);

    if (!transition && !hasExternalLabel(element)) {
      return;
    }

    const text = transition ? getTransitionText(element.businessObject) : getConnectionPointName(element.businessObject);

    if (!text) {
      return;
    }

    const size = textRenderer.getExternalLabelBounds({ x: 0, y: 0, width: 0, height: 0 }, text);
    const bounds = transition ? getDefaultLabelBounds(element.waypoints, size) : getShapeLabelBounds(element, size);

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

StateMachineImporter.$inject = [
  'eventBus',
  'canvas',
  'elementFactory',
  'textRenderer',
  'umlFactory',
  'elementRegistry'
];
