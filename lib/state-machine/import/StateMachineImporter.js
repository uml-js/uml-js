import { getShapeLabelBounds } from '../../core/util/GeometryUtil.js';

import { is, someElement } from '../../core/util/ModelUtil.js';

import {
  findPoint,
  getConnectionPointName,
  getDefaultLabelBounds,
  getReferences,
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
 *   * entry and exit points of the same owner, kind and name are merged into
 *     one point, shown by the shapes of all of them
 *
 * The label DI is attached to the edge or shape once the label changes.
 */
export default function StateMachineImporter(eventBus, canvas, elementFactory, textRenderer, umlFactory, elementRegistry) {

  eventBus.on('import.parse.complete', function(event) {
    const diagram = event.diagram;
    const element = diagram && diagram.get('modelElement')[0];

    if (element) {
      mergePoints(element, diagram);
    }
  });

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


/**
 * Merge the entry and exit points of the same owner, kind and name, in a state
 * machine or state, into the first of them.
 *
 * @param {ModdleElement} element
 * @param {ModdleElement} diagram showing the element
 */
function mergePoints(element, diagram) {
  const owners = [];

  someElement(element, child => {
    if ((is(child, 'uml:StateMachine') || is(child, 'uml:State')) && child.get('connectionPoint').length > 1) {
      owners.push(child);
    }

    return false;
  });

  for (const owner of owners) {
    for (const point of [ ...owner.get('connectionPoint') ]) {
      const keeper = findPoint(owner, point.kind, point.name);

      if (keeper && keeper !== point) {
        mergePoint(point, keeper, element, diagram);
      }
    }
  }
}

function mergePoint(point, keeper, element, diagram) {
  someElement(diagram, di => {
    if (di.modelElement && di.modelElement[0] === point) {
      di.set('modelElement', [ keeper ]);
    }

    return false;
  });

  someElement(element, child => {
    if (is(child, 'uml:Transition')) {
      [ 'source', 'target' ].filter(end => child.get(end) === point).forEach(end => child.set(end, keeper));
    }

    return false;
  });

  for (const reference of getReferences(point)) {
    const property = reference.get('entry').includes(point) ? 'entry' : 'exit';
    const referred = reference.get(property);

    referred.splice(referred.indexOf(point), 1, keeper);
  }

  const points = point.$parent.get('connectionPoint');

  points.splice(points.indexOf(point), 1);
  point.$parent = null;
}
