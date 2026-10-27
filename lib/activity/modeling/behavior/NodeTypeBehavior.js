import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { is } from '../../../core/util/ModelUtil.js';
import { constrainBarResize } from '../../../core/util/BarResize.js';

import { isControlFlow, isDecisionOrMerge, isForkOrJoin } from '../../util/ElementUtil.js';


/**
 * Derives the type of nodes sharing their notation from their flows, so users
 * do not have to choose:
 *
 *   * a diamond with several outgoing flows is a decision, with several
 *     incoming flows a merge
 *   * a bar with several outgoing flows is a fork, with several incoming flows a join
 *
 * The type is kept as long as it cannot be decided.
 */
export default function NodeTypeBehavior(eventBus, modeling) {

  CommandInterceptor.call(this, eventBus);

  constrainBarResize(eventBus, isForkOrJoin);

  function update(shape) {
    if (!shape || !shape.parent) {
      return;
    }

    const incoming = shape.incoming.filter(isControlFlow).length;
    const outgoing = shape.outgoing.filter(isControlFlow).length;

    let type = null;

    if (isDecisionOrMerge(shape)) {
      type = outgoing > 1 && incoming <= 1 ? 'uml:DecisionNode' : incoming > 1 && outgoing <= 1 ? 'uml:MergeNode' : null;
    }

    if (isForkOrJoin(shape)) {
      type = outgoing > 1 && incoming <= 1 ? 'uml:ForkNode' : incoming > 1 && outgoing <= 1 ? 'uml:JoinNode' : null;
    }

    if (type && !is(shape, type)) {
      modeling.changeNodeType(shape, type);
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
      context.oldTarget
    ]).forEach(update);
  });
}

inherits(NodeTypeBehavior, CommandInterceptor);

NodeTypeBehavior.$inject = [
  'eventBus',
  'modeling'
];
