import inherits from 'inherits-browser';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';

import { is, isLabel } from '../../core/util/ModelUtil.js';

import { isActor, isSubject, isUseCase } from '../util/ElementUtil.js';


/**
 * Modeling rules for use case diagrams.
 */
export default function UseCaseRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(UseCaseRules, RuleProvider);

UseCaseRules.$inject = [ 'eventBus' ];

UseCaseRules.prototype.init = function() {

  this.addRule('shape.create', function(context) {
    return canCreate(context.shape, context.target);
  });

  this.addRule('elements.create', function(context) {
    return context.elements.every(element => element.waypoints || canCreate(element, context.target));
  });

  this.addRule('elements.move', function(context) {
    const target = context.target;

    return context.shapes.every(shape => isLabel(shape) || !target || canCreate(shape, target));
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
