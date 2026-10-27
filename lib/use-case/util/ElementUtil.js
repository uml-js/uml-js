import { is, isLabel } from '../../core/util/ModelUtil.js';


export function isActor(element) {
  return is(element, 'uml:Actor') && !isLabel(element);
}

export function isUseCase(element) {
  return is(element, 'uml:UseCase') && !isLabel(element);
}

/**
 * The subject of use cases, drawn as system boundary.
 */
export function isSubject(element) {
  return is(element, 'uml:Class') && !isLabel(element) && !element.waypoints;
}

export function isRelationship(element) {
  return !!(element && element.waypoints);
}

const DEFAULT_SIZES = {
  'uml:Actor': { width: 40, height: 70 },
  'uml:UseCase': { width: 140, height: 60 },
  'uml:Class': { width: 300, height: 320 }
};

/**
 * @param {ModdleElement} bo
 *
 * @return {Dimensions}
 */
export function getDefaultSize(bo) {
  return DEFAULT_SIZES[bo.$type] || DEFAULT_SIZES['uml:UseCase'];
}

/**
 * Default bounds of the name of an actor: centered below it.
 */
export function getActorLabelBounds(actor, size) {
  return {
    x: Math.round(actor.x + actor.width / 2 - size.width / 2),
    y: Math.round(actor.y + actor.height + 4),
    width: size.width,
    height: size.height
  };
}
