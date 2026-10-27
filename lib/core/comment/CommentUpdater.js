import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import PositionTracker from '../util/PositionTracker.js';

import { getAnnotated, isAnchor, isNote } from './CommentUtil.js';


/**
 * Keeps the comments of notes in sync with the diagram:
 *
 *   * comments are owned by the element shown by the diagram
 *     (e.g. the state machine or the package)
 *   * they annotate the elements their lines connect them to
 *
 * Like UmlUpdater, all updates are derived from the current diagram state
 * and therefore apply to executing and reverting commands alike.
 */
export default function CommentUpdater(eventBus, canvas) {

  CommandInterceptor.call(this, eventBus);

  this._canvas = canvas;
  this._positions = new PositionTracker();

  const self = this;

  function updateNote(event) {
    const shape = event.context.shape;

    if (isNote(shape)) {
      self.updateNote(shape);
    }
  }

  function updateAnchor(event) {
    const connection = event.context.connection;

    if (!isAnchor(connection)) {
      return;
    }

    // deleted connections are detached, their ends kept in the context
    const { source, target, oldSource, oldTarget } = event.context;

    [ connection.source, connection.target, source, target, oldSource, oldTarget ]
      .filter(element => element && isNote(element))
      .forEach(element => self.updateNote(element));
  }

  this.executed([ 'shape.create', 'shape.delete' ], updateNote);
  this.reverted([ 'shape.create', 'shape.delete' ], updateNote);

  const CONNECTION_COMMANDS = [ 'connection.create', 'connection.delete', 'connection.reconnect' ];

  this.executed(CONNECTION_COMMANDS, updateAnchor);
  this.reverted(CONNECTION_COMMANDS, updateAnchor);
}

inherits(CommentUpdater, CommandInterceptor);

CommentUpdater.$inject = [
  'eventBus',
  'canvas'
];

/**
 * @param {Shape} note
 */
CommentUpdater.prototype.updateNote = function(note) {
  const comment = note.businessObject;
  const owner = this._canvas.getRootElement().businessObject;

  const anchors = [ ...note.incoming, ...note.outgoing ].filter(isAnchor);

  comment.set('annotatedElement', note.parent ? anchors.map(anchor => getAnnotated(anchor).businessObject) : []);

  const oldOwner = comment.$parent;
  const newOwner = note.parent ? owner : null;

  if (oldOwner === newOwner && (!newOwner || newOwner.get('ownedComment').includes(comment))) {
    return;
  }

  if (oldOwner) {
    this._positions.remove(oldOwner.get('ownedComment'), comment);
  }

  if (newOwner) {
    this._positions.add(newOwner.get('ownedComment'), comment);
  }

  comment.$parent = newOwner;
};
