import { is } from '../../../core/util/ModelUtil.js';

import { moveDis, restoreDis } from '../../../core/util/ContentMoveUtil.js';

/**
 * Helpers for showing the content of diagrams inside shapes of states and back,
 * see ElementUtil#getDecompositionShape.
 */

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
