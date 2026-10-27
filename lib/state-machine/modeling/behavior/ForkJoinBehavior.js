import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { is } from '../../../core/util/ModelUtil.js';
import { constrainBarResize } from '../../../core/util/BarResize.js';

import { isPseudostate } from '../../util/ElementUtil.js';


/**
 * Derives whether a fork / join pseudostate is a fork or a join from its
 * transitions, so users do not have to choose:
 *
 *   * fork: one incoming, several outgoing transitions
 *   * join: several incoming, one outgoing transition
 *
 * The kind is kept as long as it cannot be decided. Resizing changes the
 * length of the bar only.
 */
export default function ForkJoinBehavior(eventBus, modeling, elementRegistry) {

  CommandInterceptor.call(this, eventBus);

  constrainBarResize(eventBus, shape => isPseudostate(shape, 'fork') || isPseudostate(shape, 'join'));

  function update(shape) {
    if (!shape || !shape.parent || !(isPseudostate(shape, 'fork') || isPseudostate(shape, 'join'))) {
      return;
    }

    const bo = shape.businessObject;
    const kind = getKind(bo);

    if (kind && kind !== bo.kind) {

      // update all shapes of the pseudostate
      const shapes = elementRegistry.filter(element => element.businessObject === bo && !element.labelTarget);

      modeling.updateProperties(shapes[0], { kind });

      shapes.slice(1).forEach(element => eventBus.fire('element.changed', { element }));
    }
  }

  this.postExecuted([
    'connection.create',
    'connection.delete',
    'connection.reconnect'
  ], function(event) {
    const context = event.context;
    const connection = context.connection;

    new Set([
      connection.source,
      connection.target,
      context.source,
      context.target,
      context.oldSource,
      context.oldTarget,
      context.newSource,
      context.newTarget
    ]).forEach(update);
  });
}

inherits(ForkJoinBehavior, CommandInterceptor);

ForkJoinBehavior.$inject = [
  'eventBus',
  'modeling',
  'elementRegistry'
];


/**
 * @param {ModdleElement} pseudostate
 *
 * @return {'fork'|'join'|null}
 */
export function getKind(pseudostate) {
  const transitions = getTransitions(pseudostate);

  const incoming = transitions.filter(t => t.target === pseudostate).length;
  const outgoing = transitions.filter(t => t.source === pseudostate).length;

  if (outgoing > 1 && incoming <= 1) {
    return 'fork';
  }

  if (incoming > 1 && outgoing <= 1) {
    return 'join';
  }

  return null;
}

/**
 * All transitions of the state machine the vertex belongs to,
 * including those not shown in the current diagram.
 */
function getTransitions(vertex) {
  let element = vertex;

  while (element.$parent && !is(element, 'uml:StateMachine')) {
    element = element.$parent;
  }

  const transitions = [];

  (function collect(owner) {
    for (const region of owner.get('region')) {
      transitions.push(...region.get('transition'));

      region.get('subvertex').filter(v => is(v, 'uml:State')).forEach(collect);
    }
  })(element);

  return transitions;
}
