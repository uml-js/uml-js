import { addToCanvas, removeFromCanvas } from '../../../core/util/ContentMoveUtil.js';

import { isShapeDi } from '../../util/ElementUtil.js';

// distance of entry and exit points added to the diagram of a state machine from its content
const DIAGRAM_MARGIN = 60;
const POINT_SPACING = 40;


/**
 * Adds an entry or exit point to the state machine a submachine state refers to,
 * shown in the diagram of the state machine, right of its content, and a
 * connection point reference to it on the border of the submachine state.
 */
export default function AddConnectionPointHandler(modeling, elementFactory, umlFactory, injector) {
  this._modeling = modeling;
  this._elementFactory = elementFactory;
  this._umlFactory = umlFactory;

  // the manager of all diagrams (see lib/uml.js), missing in a viewer of a single diagram
  this._umlManager = injector.get('umlManager', false);
}

AddConnectionPointHandler.$inject = [ 'modeling', 'elementFactory', 'umlFactory', 'injector' ];

AddConnectionPointHandler.prototype.execute = function(context) {
  const { element, kind } = context;

  const stateMachine = element.businessObject.submachine;

  // create once, so re-doing re-uses the same model and diagram elements
  if (!context.point) {
    const points = stateMachine.get('connectionPoint');

    context.point = this._umlFactory.create('uml:Pseudostate', {
      kind,
      name: getUniqueName(points, kind === 'entryPoint' ? 'entry' : 'exit')
    });

    const view = this._umlManager && this._umlManager.getViewOf(stateMachine);

    if (view) {
      context.diagram = view.element;
      context.di = this._createDi(context.point, view.element, points.length);
      context.viewer = this._umlManager.getViewer(view);
    }
  }

  const { point, diagram, di, viewer } = context;

  stateMachine.get('connectionPoint').push(point);
  point.$parent = stateMachine;

  if (di) {
    diagram.get('ownedElement').push(di);
    di.$parent = diagram;
  }

  // the diagram of the state machine was shown before, so its viewer shows the point, too
  if (viewer) {
    const canvas = viewer.get('canvas');

    if (context.elements) {
      addToCanvas(canvas, context.elements, context.parents);
    } else {
      context.elements = viewer.get('umlImporter').importElements([ di ], canvas.getRootElement());
    }
  }

  return [];
};

AddConnectionPointHandler.prototype.revert = function(context) {
  const { element, point, diagram, di, viewer } = context;

  if (viewer) {
    context.parents = removeFromCanvas(viewer.get('canvas'), context.elements);
  }

  if (di) {
    const owned = diagram.get('ownedElement');

    owned.splice(owned.indexOf(di), 1);
    di.$parent = null;
  }

  const points = element.businessObject.submachine.get('connectionPoint');

  points.splice(points.indexOf(point), 1);
  point.$parent = null;

  return [];
};

AddConnectionPointHandler.prototype.postExecute = function(context) {
  const { element, kind, point, position } = context;

  const reference = this._elementFactory.createShape({
    type: 'uml:ConnectionPointReference',
    [ kind === 'entryPoint' ? 'entry' : 'exit' ]: [ point ]
  });

  context.reference = position
    ? this._modeling.createShape(reference, position, element, { attach: true })
    : this._modeling.addConnectionPointReference(element, point);
};

/**
 * The shape of a new point in the diagram of the state machine, right of its content.
 */
AddConnectionPointHandler.prototype._createDi = function(point, diagram, index) {
  const shapes = diagram.get('ownedElement').filter(di => isShapeDi(di) && di.bounds);

  const right = shapes.length ? Math.max(...shapes.map(({ bounds }) => bounds.x + bounds.width)) : 0;
  const top = shapes.length ? Math.min(...shapes.map(({ bounds }) => bounds.y)) : 0;

  const di = this._umlFactory.createDiShape(point);

  di.set('bounds', this._umlFactory.createBounds({
    x: right + DIAGRAM_MARGIN,
    y: top + index * POINT_SPACING,
    width: 20,
    height: 20
  }));

  di.bounds.$parent = di;

  return di;
};


/**
 * @param {ModdleElement[]} elements
 * @param {string} base
 *
 * @return {string} the base name, numbered if an element is named so already
 */
function getUniqueName(elements, base) {
  const names = new Set(elements.map(element => element.name));

  let name = base;

  for (let i = 2; names.has(name); i++) {
    name = `${ base } ${ i }`;
  }

  return name;
}
