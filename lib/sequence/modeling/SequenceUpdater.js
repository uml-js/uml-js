import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import PositionTracker from '../../core/util/PositionTracker.js';

import { is, isComment } from '../../core/util/ModelUtil.js';

import {
  getLifeline,
  getLifelineX,
  getMessageY,
  getOperands,
  isCombinedFragment,
  isExecution,
  isLifeline,
  isMessage,
  isOperand
} from '../util/ElementUtil.js';


/**
 * Keeps the interaction in sync with sequence diagrams:
 *
 *   * lifelines and messages are owned by the interaction
 *   * every message has a send and a receive event, message occurrence
 *     specifications covering the sending and receiving lifeline
 *   * activation bars are execution specifications, starting and finishing
 *     with execution occurrence specifications on their lifeline
 *   * frames are combined fragments, their parts operands
 *   * fragments are owned by the innermost operand they are drawn in, or the
 *     interaction, ordered by their vertical position; lifelines are covered
 *     by the fragments on them, combined fragments cover the lifelines they span
 *
 * Like UmlUpdater, all updates are derived from the current diagram state
 * and therefore apply to executing and reverting commands alike.
 */
export default function SequenceUpdater(eventBus, umlFactory, canvas, elementRegistry) {

  CommandInterceptor.call(this, eventBus);

  this._umlFactory = umlFactory;
  this._canvas = canvas;
  this._elementRegistry = elementRegistry;

  this._positions = new PositionTracker();

  // fragments and operands removed from the diagram, removed from the model, too
  this._removed = new WeakSet();

  const self = this;

  function updateShape(event) {

    // notes are handled by the CommentUpdater
    if (isComment(event.context.shape)) {
      return;
    }

    const shape = event.context.shape;

    if (isLifeline(shape)) {
      self._setOwned(shape.businessObject, shape.parent ? self._getInteraction() : null, 'lifeline');
    }

    // placed by #updateFragments
    if (isExecution(shape) || isCombinedFragment(shape) || isOperand(shape)) {
      if (shape.parent) {
        self._removed.delete(shape.businessObject);
      } else {
        self._removed.add(shape.businessObject);
      }
    }
  }

  function updateConnection(event) {
    if (isComment(event.context.connection)) {
      return;
    }

    const connection = event.context.connection;

    if (isMessage(connection)) {
      self.updateMessage(connection);
    }
  }

  function updateOrder() {
    self.updateFragments();
  }

  this.executed([ 'shape.create', 'shape.delete' ], updateShape);
  this.reverted([ 'shape.create', 'shape.delete' ], updateShape);

  // moving and resizing activation bars changes the order, too
  const SHAPE_CHANGING = [ 'shape.create', 'shape.delete', 'shape.move', 'shape.resize' ];

  this.executed(SHAPE_CHANGING, updateOrder);
  this.reverted(SHAPE_CHANGING, updateOrder);

  const CONNECTION_COMMANDS = [ 'connection.create', 'connection.delete', 'connection.reconnect' ];

  this.executed(CONNECTION_COMMANDS, updateConnection);
  this.reverted(CONNECTION_COMMANDS, updateConnection);

  // anything that may change which messages exist or their vertical order
  const ORDER_CHANGING = [
    'connection.create',
    'connection.delete',
    'connection.reconnect',
    'connection.layout',
    'connection.move',
    'connection.updateWaypoints'
  ];

  this.executed(ORDER_CHANGING, updateOrder);
  this.reverted(ORDER_CHANGING, updateOrder);
}

inherits(SequenceUpdater, CommandInterceptor);

SequenceUpdater.$inject = [
  'eventBus',
  'umlFactory',
  'canvas',
  'elementRegistry'
];

SequenceUpdater.prototype._getInteraction = function() {
  return this._canvas.getRootElement().businessObject;
};

/**
 * @param {Connection} connection
 */
SequenceUpdater.prototype.updateMessage = function(connection) {
  const message = connection.businessObject;
  const attached = !!(connection.parent && connection.source && connection.target);

  this._setOwned(message, attached ? this._getInteraction() : null, 'message');

  if (!attached) {
    return;
  }

  message.set('sendEvent', this._getEvent(message, 'sendEvent', getLifeline(connection.source).businessObject));
  message.set('receiveEvent', this._getEvent(message, 'receiveEvent', getLifeline(connection.target).businessObject));
};

/**
 * The send or receive event of a message, covering the given lifeline.
 */
SequenceUpdater.prototype._getEvent = function(message, property, lifeline) {
  let event = message.get(property);

  if (!event || !is(event, 'uml:MessageOccurrenceSpecification')) {
    event = this._umlFactory.create('uml:MessageOccurrenceSpecification');

    event.set('message', message);
  }

  event.set('covered', [ lifeline ]);

  return event;
};

/**
 * Place and order fragments: every fragment shown goes to the innermost operand
 * it is drawn in (or the interaction), ordered top to bottom. Fragments not shown
 * in this diagram keep their position.
 */
SequenceUpdater.prototype.updateFragments = function() {
  const interaction = this._getInteraction();

  if (!is(interaction, 'uml:Interaction')) {
    return;
  }

  const messages = interaction.get('message');
  const shapes = this._elementRegistry.filter(element => element.parent);

  const operands = shapes.filter(isOperand);

  // fragments shown, by container; at the same height frames come first, then messages
  const items = new Map([ [ interaction, [] ] ]);

  operands.forEach(operand => items.set(operand.businessObject, []));

  const add = (point, rank, fragments, exclude) => {
    const container = this._getContainer(point, operands, exclude) || interaction;

    items.get(container).push({ y: point.y, rank, fragments });
  };

  for (const element of shapes) {

    if (isMessage(element) && messages.includes(element.businessObject)) {
      const message = element.businessObject;
      const waypoints = element.waypoints;

      // self messages are received below where they are sent
      add({ x: getLifelineX(getLifeline(element.source)), y: getMessageY(element) }, 1, [ message.sendEvent ]);
      add({ x: getLifelineX(getLifeline(element.target)), y: waypoints[waypoints.length - 1].y }, 1, [ message.receiveEvent ]);
    }

    if (isExecution(element)) {
      const execution = element.businessObject;
      const lifeline = element.parent.businessObject;
      const x = getLifelineX(element);

      execution.set('covered', [ lifeline ]);
      execution.set('start', this._getExecutionEvent(execution, 'start', lifeline));
      execution.set('finish', this._getExecutionEvent(execution, 'finish', lifeline));

      add({ x, y: element.y }, 2, [ execution.start, execution ]);
      add({ x, y: element.y + element.height }, 2, [ execution.finish ]);
    }

    if (isCombinedFragment(element)) {
      const fragment = element.businessObject;
      const covered = this._getCoveredLifelines(element);

      fragment.set('covered', covered);

      const shownOperands = getOperands(element).map(operand => operand.businessObject);

      shownOperands.forEach(operand => {
        operand.set('covered', covered);
        operand.$parent = fragment;
      });

      fragment.set('operand', [
        ...shownOperands,
        ...fragment.get('operand').filter(operand => !shownOperands.includes(operand) && !this._removed.has(operand))
      ]);

      add({ x: element.x, y: element.y }, 0, [ fragment ], element);
    }
  }

  const shown = new Set([ ...items.values() ].flat().flatMap(item => item.fragments));

  const isObsolete = fragment => {
    if (this._removed.has(fragment)) {
      return true;
    }

    if (is(fragment, 'uml:MessageOccurrenceSpecification')) {
      return !(fragment.message && messages.includes(fragment.message));
    }

    if (is(fragment, 'uml:ExecutionOccurrenceSpecification')) {
      return !fragment.execution || this._removed.has(fragment.execution);
    }

    return false;
  };

  for (const [ container, containerItems ] of items) {
    containerItems.sort((a, b) => a.y - b.y || a.rank - b.rank);

    this._setFragments(container, containerItems.flatMap(item => item.fragments), shown, isObsolete);
  }

  // lifelines are covered by the fragments covering them, in order
  const ordered = flatten(interaction.get('fragment'));

  for (const lifeline of interaction.get('lifeline')) {
    lifeline.set('coveredBy', ordered.filter(fragment => fragment.get('covered').includes(lifeline)));
  }
};

/**
 * Set the fragments of a container (interaction or operand), keeping
 * fragments not shown in this diagram in place.
 */
SequenceUpdater.prototype._setFragments = function(container, shownFragments, shown, isObsolete) {
  const fragments = container.get('fragment');

  const remaining = fragments.filter(fragment => !isObsolete(fragment) && !shown.has(fragment));

  const firstShownIndex = fragments.findIndex(fragment => shownFragments.includes(fragment));
  const insertAt = firstShownIndex === -1
    ? remaining.length
    : remaining.filter(fragment => fragments.indexOf(fragment) < firstShownIndex).length;

  const ordered = [
    ...remaining.slice(0, insertAt),
    ...shownFragments,
    ...remaining.slice(insertAt)
  ];

  fragments.splice(0, fragments.length, ...ordered);

  ordered.forEach(fragment => fragment.$parent = container);
};

/**
 * The innermost operand containing a point, not part of the given combined fragment.
 *
 * @return {ModdleElement|null}
 */
SequenceUpdater.prototype._getContainer = function(point, operands, exclude) {
  const containing = operands.filter(operand => {
    return operand.parent !== exclude && contains(operand, point) && !(exclude && contains(exclude, operand));
  });

  containing.sort((a, b) => a.width * a.height - b.width * b.height);

  return containing.length ? containing[0].businessObject : null;
};

/**
 * The lifelines whose dashed line is inside a frame.
 */
SequenceUpdater.prototype._getCoveredLifelines = function(frame) {
  return this._elementRegistry
    .filter(element => isLifeline(element) && element.parent)
    .filter(lifeline => {
      const x = getLifelineX(lifeline);

      return x >= frame.x && x <= frame.x + frame.width;
    })
    .sort((a, b) => a.x - b.x)
    .map(lifeline => lifeline.businessObject);
};

/**
 * The start or finish of an execution, covering the given lifeline.
 */
SequenceUpdater.prototype._getExecutionEvent = function(execution, property, lifeline) {
  let event = execution.get(property);

  if (!event) {
    event = this._umlFactory.create('uml:ExecutionOccurrenceSpecification');

    event.set('execution', execution);
  }

  event.set('covered', [ lifeline ]);

  return event;
};

/**
 * Add or remove a model element to or from the interaction's collection.
 */
SequenceUpdater.prototype._setOwned = function(bo, owner, property) {
  const oldOwner = bo.$parent;

  if (oldOwner === owner) {
    return;
  }

  if (oldOwner) {
    this._positions.remove(oldOwner.get(property), bo);
  }

  if (owner) {
    this._positions.add(owner.get(property), bo);
  }

  bo.$parent = owner;
};


// helpers //////////

function contains(bounds, point) {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y && point.y <= bounds.y + bounds.height;
}

/**
 * All fragments, depth first: combined fragments followed by their operands' fragments.
 */
function flatten(fragments) {
  return fragments.flatMap(fragment => {
    if (!is(fragment, 'uml:CombinedFragment')) {
      return [ fragment ];
    }

    return [
      fragment,
      ...fragment.get('operand').flatMap(operand => [ operand, ...flatten(operand.get('fragment')) ])
    ];
  });
}
