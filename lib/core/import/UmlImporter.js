import { is } from '../util/ModelUtil.js';


/**
 * Imports a UML DI diagram onto the canvas.
 *
 * Shapes may be nested (`UMLDiagramElement#ownedElement`), edges are drawn after
 * all shapes are imported. Labels owned by shapes and edges become diagram-js labels.
 *
 * @param {EventBus} eventBus
 * @param {Canvas} canvas
 * @param {ElementFactory} elementFactory
 * @param {ElementRegistry} elementRegistry
 */
export default function UmlImporter(eventBus, canvas, elementFactory, elementRegistry) {
  this._eventBus = eventBus;
  this._canvas = canvas;
  this._elementFactory = elementFactory;
  this._elementRegistry = elementRegistry;
}

UmlImporter.$inject = [
  'eventBus',
  'canvas',
  'elementFactory',
  'elementRegistry'
];

/**
 * @param {ModdleElement} diagram a umldi:UMLDiagram
 *
 * @return { { warnings: Array<Object> } }
 */
UmlImporter.prototype.import = function(diagram) {
  const warnings = [];

  this._warnings = warnings;
  this._elementsByDi = new Map();

  const rootBo = diagram.modelElement && diagram.modelElement[0];

  if (!rootBo || !rootBo.$instanceOf) {
    throw new Error(`diagram <${ diagram.id }> does not reference a model element`);
  }

  const root = this._elementFactory.createRoot({
    id: this._getId(rootBo, diagram),
    businessObject: rootBo,
    di: diagram
  });

  this._canvas.setRootElement(root);

  const edges = [];

  // labels are drawn on top of all shapes and edges
  this._labels = [];

  this._importShapes(diagram.get('ownedElement'), root, edges);

  for (const edge of edges) {
    this._importEdge(edge, root);
  }

  for (const [ di, element ] of this._labels) {
    this._importLabels(di, element);
  }

  this._eventBus.fire('import.render.complete', { warnings });

  return { warnings };
};

UmlImporter.prototype._importShapes = function(diElements, parent, edges) {
  for (const di of this._sortByLevel(diElements)) {

    if (is(di, 'umldi:UMLEdge')) {
      edges.push(di);
      continue;
    }

    if (is(di, 'umldi:UMLLabel') || !is(di, 'umldi:UMLShape')) {
      continue;
    }

    const bo = this._getModelElement(di);

    if (!bo) {
      continue;
    }

    const bounds = di.bounds || {};

    // diagram types may attach shapes to their parent, e.g. ports to components
    const attach = parent !== this._canvas.getRootElement() &&
      this._eventBus.fire('import.shape.attach', { di, businessObject: bo, parent }) === true;

    const shape = this._elementFactory.createShape({
      id: this._getId(bo, di),
      type: bo.$type,
      businessObject: bo,
      di,
      x: Math.round(bounds.x || 0),
      y: Math.round(bounds.y || 0),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
      host: attach ? parent : undefined
    });

    if (attach) {
      parent.attachers.push(shape);
    }

    this._canvas.addShape(shape, attach ? parent.parent : parent);
    this._elementsByDi.set(di, shape);

    this._importShapes(di.get('ownedElement'), shape, edges);

    this._labels.push([ di, shape ]);
  }
};

UmlImporter.prototype._importLabels = function(di, element) {
  const labelDis = di.get('ownedElement').filter(e => is(e, 'umldi:UMLLabel') && e.bounds);

  const root = this._canvas.getRootElement();

  if (labelDis.length) {
    labelDis.forEach(labelDi => this._importLabel(labelDi, element, root));
  } else {

    // allow diagram types to show labels for elements without label DI
    this._eventBus.fire('import.label.missing', { element, root });
  }
};

/**
 * Shapes of lower levels first, so that they are drawn below the others,
 * keeping the order of the file otherwise.
 */
UmlImporter.prototype._sortByLevel = function(diElements) {
  const getLevel = di => {
    const bo = is(di, 'umldi:UMLShape') && di.modelElement && di.modelElement[0];

    return bo && bo.$instanceOf ? this._elementFactory.getLevel(bo) : 0;
  };

  return diElements
    .map((di, index) => ({ di, index, level: getLevel(di) }))
    .sort((a, b) => a.level - b.level || a.index - b.index)
    .map(({ di }) => di);
};

UmlImporter.prototype._importEdge = function(di, root) {
  const bo = this._getModelElement(di);

  if (!bo) {
    return;
  }

  const source = this._elementsByDi.get(di.source);
  const target = this._elementsByDi.get(di.target);

  if (!source || !target) {
    this._warnings.push({ message: `edge <${ di.id }> is missing source or target shape`, element: di });
    return;
  }

  const waypoints = di.get('waypoint').map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));

  const connection = this._elementFactory.createConnection({
    id: this._getId(bo, di),
    type: bo.$type,
    businessObject: bo,
    di,
    source,
    target,
    waypoints: waypoints.length >= 2 ? waypoints : undefined
  });

  if (!connection.waypoints) {
    connection.waypoints = [ getMid(source), getMid(target) ];
  }

  this._canvas.addConnection(connection, root);
  this._elementsByDi.set(di, connection);

  this._labels.push([ di, connection ]);
};

UmlImporter.prototype._importLabel = function(di, labelTarget, root) {
  const bounds = di.bounds;

  // labels may show another model element than their target, e.g. the end of an association
  const modelElement = di.modelElement && di.modelElement[0];
  const bo = modelElement && modelElement.$instanceOf && modelElement !== labelTarget.businessObject ? modelElement : labelTarget.businessObject;

  const label = this._elementFactory.createLabel({
    id: bo === labelTarget.businessObject ? labelTarget.id + '_label' : bo.id + '_label',
    type: bo.$type,
    businessObject: bo,
    di,
    labelTarget,
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height)
  });

  this._canvas.addShape(label, root);
};

UmlImporter.prototype._getModelElement = function(di) {
  const bo = di.modelElement && di.modelElement[0];

  if (!bo || !bo.$instanceOf) {
    this._warnings.push({ message: `unsupported or missing model element for <${ di.id }>`, element: di });

    return null;
  }

  return bo;
};

/**
 * Use model element IDs as element IDs, unless an element
 * is shown multiple times in the same diagram.
 */
UmlImporter.prototype._getId = function(bo, di) {
  return this._elementRegistry.get(bo.id) ? di.id : bo.id;
};


function getMid(shape) {
  return {
    x: Math.round(shape.x + shape.width / 2),
    y: Math.round(shape.y + shape.height / 2)
  };
}
