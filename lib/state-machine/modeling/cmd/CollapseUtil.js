import { is } from '../../../core/util/ModelUtil.js';

/**
 * Helpers for moving the content of states between diagrams (see
 * CollapseStateHandler, ExpandStateHandler), in the way they can be undone.
 */

/**
 * @param {Canvas} canvas
 * @param {Element[]} elements parents before their children, shapes before connections and labels
 *
 * @return {Element[]} the parents of the elements, for #addToCanvas
 */
export function removeFromCanvas(canvas, elements) {
  const parents = elements.map(element => element.parent);

  for (const element of [ ...elements ].reverse()) {
    if (element.waypoints) {
      canvas.removeConnection(element);
    } else {
      canvas.removeShape(element);
    }
  }

  return parents;
}

export function addToCanvas(canvas, elements, parents) {
  elements.forEach((element, index) => {
    if (element.waypoints) {
      canvas.addConnection(element, parents[index]);
    } else {
      canvas.addShape(element, parents[index]);
    }
  });
}

/**
 * Move diagram elements to a new owner.
 *
 * @param {ModdleElement[]} dis
 * @param {(di: ModdleElement) => ModdleElement} getOwner
 *
 * @return {Object[]} where the diagram elements were, for #restoreDis
 */
export function moveDis(dis, getOwner) {
  const moves = dis.map(di => {
    const oldOwner = di.$parent;

    return { di, oldOwner, index: oldOwner.get('ownedElement').indexOf(di), newOwner: getOwner(di) };
  });

  for (const { di, oldOwner, newOwner } of moves) {
    const owned = oldOwner.get('ownedElement');

    owned.splice(owned.indexOf(di), 1);

    newOwner.get('ownedElement').push(di);
    di.$parent = newOwner;
  }

  return moves;
}

export function restoreDis(moves) {
  for (const { di, newOwner } of moves) {
    const owned = newOwner.get('ownedElement');

    owned.splice(owned.indexOf(di), 1);
  }

  for (const { di, oldOwner, index } of [ ...moves ].sort((a, b) => a.index - b.index)) {
    oldOwner.get('ownedElement').splice(index, 0, di);
    di.$parent = oldOwner;
  }
}

/**
 * Move diagram elements and the elements they own, e.g. labels, by a distance.
 */
export function translateDis(dis, delta) {
  for (const di of dis) {
    if (di.bounds) {
      di.bounds.x += delta.x;
      di.bounds.y += delta.y;
    }

    for (const point of di.get('waypoint') || []) {
      point.x += delta.x;
      point.y += delta.y;
    }

    translateDis(di.get('ownedElement'), delta);
  }
}

/**
 * The box around shapes and edges.
 *
 * @param {ModdleElement[]} dis
 *
 * @return {Bounds}
 */
export function getBox(dis) {
  const xs = [], ys = [];

  for (const di of dis) {
    if (di.bounds) {
      xs.push(di.bounds.x, di.bounds.x + di.bounds.width);
      ys.push(di.bounds.y, di.bounds.y + di.bounds.height);
    }

    for (const point of di.get('waypoint') || []) {
      xs.push(point.x);
      ys.push(point.y);
    }
  }

  if (!xs.length) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const x = Math.min(...xs), y = Math.min(...ys);

  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/**
 * Show the content of a diagram inside a new shape of a state, so that the
 * diagram shows the state's decomposition (see ElementUtil#getDecompositionShape).
 *
 * @param {ModdleElement} diagram
 * @param {ModdleElement} state
 * @param {Bounds} bounds of the shape
 * @param {UmlFactory} umlFactory
 *
 * @return {Object} for #unwrapDis
 */
export function wrapDis(diagram, state, bounds, umlFactory) {
  const shape = umlFactory.create('umldi:UMLStateShape', {
    modelElement: [ state ],
    bounds: umlFactory.createBounds(bounds)
  });

  shape.bounds.$parent = shape;

  const content = diagram.get('ownedElement').filter(di => !is(di, 'umldi:UMLEdge'));

  diagram.get('ownedElement').unshift(shape);
  shape.$parent = diagram;

  return { diagram, shape, moves: moveDis(content, () => shape) };
}

export function unwrapDis({ diagram, shape, moves }) {
  restoreDis(moves);

  const owned = diagram.get('ownedElement');

  owned.splice(owned.indexOf(shape), 1);
  shape.$parent = null;
}

/**
 * Show the content of a shape of a state in a diagram without it, inverse of #wrapDis.
 *
 * @param {ModdleElement} diagram
 * @param {ModdleElement} shape
 *
 * @return {Object} for #rewrapDis
 */
export function unwrapShape(diagram, shape) {
  const owned = diagram.get('ownedElement');
  const index = owned.indexOf(shape);

  const moves = moveDis(shape.get('ownedElement').filter(di => !is(di, 'umldi:UMLLabel') && !is(di, 'umldi:UMLCompartment')), () => diagram);

  owned.splice(owned.indexOf(shape), 1);
  shape.$parent = null;

  return { diagram, shape, index, moves };
}

export function rewrapShape({ diagram, shape, index, moves }) {
  diagram.get('ownedElement').splice(index, 0, shape);
  shape.$parent = diagram;

  restoreDis(moves);
}

/**
 * @param {Shape} shape
 * @param {Bounds} bounds
 * @param {UmlFactory} umlFactory
 */
export function setBounds(shape, bounds, umlFactory) {
  Object.assign(shape, bounds);

  shape.di.set('bounds', umlFactory.createBounds(bounds));
  shape.di.bounds.$parent = shape.di;
}

/**
 * Lay out the connections of a shape that changed its size.
 *
 * @param {Shape} shape
 * @param {Modeling} modeling
 */
export function layoutConnections(shape, modeling) {
  for (const connection of [ ...shape.incoming, ...shape.outgoing ]) {
    modeling.layoutConnection(connection);
  }
}

export function getBounds(shape) {
  const { x, y, width, height } = shape;

  return { x, y, width, height };
}
