import { getDescendantShapes, getRoot } from './ModelUtil.js';

/**
 * Helpers for moving content between diagrams, e.g. the sub-states of states
 * whose decomposition is hidden or shown, in the way they can be undone.
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

/**
 * Make space for a shape that grew to the right and down, like the space tool does,
 * but only beside and below the shape: the elements beyond its former right border
 * and level with it move right, those beyond its former lower border and below it
 * move down. Free space is used first, e.g. the space left by the shape shrinking
 * before, so elements move only as far as needed to keep a gap to the shape, at
 * most by the amount it grew. Shapes containing it grow along, other shapes across
 * the borders stay as they are.
 *
 * @param {Shape} shape
 * @param {Bounds} oldBounds
 * @param {Injector} injector
 */
const SPACE_GAP = 30;

export function makeSpace(shape, oldBounds, injector) {
  const spaceTool = injector.get('spaceTool', false);

  if (!spaceTool) {
    return;
  }

  const modeling = injector.get('modeling');

  const inside = new Set([ shape, ...getDescendantShapes(shape) ]);
  const ancestors = new Set(getAncestors(shape));

  const grow = [
    { axis: 'x', other: 'y', size: 'width', otherSize: 'height', direction: 'e' },
    { axis: 'y', other: 'x', size: 'height', otherSize: 'width', direction: 's' }
  ];

  for (const { axis, other, size, otherSize, direction } of grow) {
    const grown = shape[size] - oldBounds[size];
    const start = oldBounds[axis] + oldBounds[size];

    if (grown <= 0) {
      continue;
    }

    // level with the shape, on the other axis, or inside such elements
    const isLevel = element => element.waypoints || ancestors.has(element) || [ element, ...getAncestors(element) ].some(e => {
      return e[other] < shape[other] + shape[otherSize] && e[other] + e[otherSize] > shape[other];
    });

    const elements = getAll(getRoot(shape)).filter(element => !inside.has(element) && isLevel(element));

    // the nearest borders beyond the shape: of the shapes beyond its former border
    // and of the shapes containing it, not of labels, which follow their elements
    const borders = elements.filter(element => !element.waypoints && !element.labelTarget && element.parent).map(element => {
      return ancestors.has(element) ? element[axis] + element[size] : element[axis];
    }).filter(border => border >= start);

    if (!borders.length) {
      continue;
    }

    const delta = Math.min(grown, shape[axis] + shape[size] + SPACE_GAP - Math.min(...borders));

    if (delta <= 0) {
      continue;
    }

    const { movingShapes, resizingShapes } = spaceTool.calculateAdjustments(elements, axis, delta, start);

    const growing = resizingShapes.filter(element => ancestors.has(element));

    if (movingShapes.length || growing.length) {
      modeling.createSpace(movingShapes, growing, { x: 0, y: 0, [axis]: delta }, direction, start);
    }
  }
}

function getAll(element) {
  return [ element, ...(element.children || []).flatMap(getAll) ];
}

/**
 * The shapes containing a shape, not the root.
 */
function getAncestors(element) {
  const ancestors = [];

  for (let parent = element.parent; parent && parent.parent; parent = parent.parent) {
    ancestors.push(parent);
  }

  return ancestors;
}

export function getBounds(shape) {
  const { x, y, width, height } = shape;

  return { x, y, width, height };
}
