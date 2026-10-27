import inherits from 'inherits-browser';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';

import { is, isLabel } from '../../core/util/ModelUtil.js';

import { isActor, isSubject, isUseCase } from '../util/ElementUtil.js';


/**
 * Modeling rules for use case diagrams.
 *
 * Actors are never inside the system boundary (subject), neither by
 * creating or moving the subject around them nor by moving them into it.
 */
export default function UseCaseRules(eventBus, elementRegistry) {

  // used by the rules, which RuleProvider adds right away
  this._elementRegistry = elementRegistry;

  RuleProvider.call(this, eventBus);
}

inherits(UseCaseRules, RuleProvider);

UseCaseRules.$inject = [ 'eventBus', 'elementRegistry' ];

UseCaseRules.prototype.init = function() {

  const elementRegistry = this._elementRegistry;

  this.addRule('shape.create', function(context) {
    const { shape, target, position } = context;

    if (!canCreate(shape, target)) {
      return false;
    }

    if (!position) {
      return true;
    }

    // the shape at its new place (businessObject and others are not enumerable)
    const placed = Object.assign(Object.create(shape), {
      x: position.x - shape.width / 2,
      y: position.y - shape.height / 2
    });

    return !overlapsActors(elementRegistry, [ placed ], { x: 0, y: 0 }, false);
  });

  this.addRule('elements.create', function(context) {
    return context.elements.every(element => element.waypoints || canCreate(element, context.target));
  });

  this.addRule('elements.move', function(context) {
    const { shapes, target, delta } = context;

    if (!shapes.every(shape => isLabel(shape) || !target || canCreate(shape, target))) {
      return false;
    }

    return !delta || !overlapsActors(elementRegistry, shapes, delta);
  });

  this.addRule('connection.create', function(context) {
    return canConnect(context.source, context.target);
  });

  this.addRule('connection.reconnect', function(context) {
    return canReconnect(context.connection, context.source, context.target);
  });

  this.addRule('shape.resize', function(context) {
    return isUseCase(context.shape) || isSubject(context.shape);
  });

  this.addRule('shape.attach', function() {
    return false;
  });
};

/**
 * Use cases can be drawn inside a subject, everything else on the diagram.
 */
export function canCreate(shape, target) {
  if (isLabel(shape)) {
    return true;
  }

  if (!target) {
    return false;
  }

  if (isUseCase(shape)) {
    return !target.parent || isSubject(target);
  }

  return (isActor(shape) || isSubject(shape)) && !target.parent;
}

/**
 * @param {ElementRegistry} elementRegistry
 * @param {Shape[]} shapes to be moved
 * @param {Point} delta
 * @param {boolean} [allowExisting=true] whether to ignore overlaps existing before the move,
 * e.g. in imported diagrams
 *
 * @return {boolean} whether moving the shapes makes actors (or their names)
 * and system boundaries overlap
 */
export function overlapsActors(elementRegistry, shapes, delta, allowExisting = true) {
  const moved = new Set(shapes);

  // names move along with their actors
  shapes.forEach(shape => (shape.labels || []).forEach(label => moved.add(label)));

  const isActorLike = element => isActor(element) || (isLabel(element) && isActor(element.labelTarget));

  const translate = bounds => ({ x: bounds.x + delta.x, y: bounds.y + delta.y, width: bounds.width, height: bounds.height });

  for (const shape of moved) {
    const obstacles = isSubject(shape)
      ? elementRegistry.filter(element => isActorLike(element) && !moved.has(element))
      : isActorLike(shape)
        ? elementRegistry.filter(element => isSubject(element) && !moved.has(element))
        : [];

    for (const obstacle of obstacles) {
      if (intersects(translate(shape), obstacle) && !(allowExisting && intersects(shape, obstacle))) {
        return true;
      }
    }
  }

  return false;
}

function intersects(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * @return {false|{ type: string }} whether and with which relationship the elements can be connected
 */
export function canConnect(source, target) {
  if (!source || !target || source === target || isLabel(source) || isLabel(target)) {
    return false;
  }

  if ((isActor(source) && isUseCase(target)) || (isUseCase(source) && isActor(target))) {
    return { type: 'uml:Association' };
  }

  if (isUseCase(source) && isUseCase(target)) {
    return { type: 'uml:Include' };
  }

  if (isActor(source) && isActor(target)) {
    return { type: 'uml:Generalization' };
  }

  return false;
}

/**
 * Relationships keep their type when reconnected.
 */
export function canReconnect(connection, source, target) {
  const allowed = canConnect(source, target);

  if (!allowed) {
    return false;
  }

  const sameKind = is(connection, 'uml:Association')
    ? allowed.type === 'uml:Association'
    : is(connection, 'uml:Generalization')
      ? allowed.type !== 'uml:Association'
      : allowed.type === 'uml:Include';

  return sameKind ? { type: connection.type } : false;
}
