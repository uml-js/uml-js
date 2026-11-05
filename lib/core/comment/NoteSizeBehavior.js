import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { NOTE_PADDING, isNote } from './CommentUtil.js';


/**
 * Notes grow with their text: once their text changes and once they are
 * resized, their height is increased to fit the text at their width. Notes
 * never shrink by themselves, and their bounds as read from a file are kept.
 */
export default function NoteSizeBehavior(eventBus, modeling, textRenderer) {

  CommandInterceptor.call(this, eventBus);

  function grow(shape) {
    const height = getNoteHeight(shape, textRenderer);

    if (height > shape.height) {
      modeling.resizeShape(shape, {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height
      });
    }
  }

  this.postExecuted('element.updateProperties', function(event) {
    const { element, properties } = event.context;

    if (isNote(element) && properties && 'body' in properties) {
      grow(element);
    }
  });

  this.postExecuted('shape.resize', function(event) {
    const shape = event.context.shape;

    if (isNote(shape)) {
      grow(shape);
    }
  });
}

inherits(NoteSizeBehavior, CommandInterceptor);

NoteSizeBehavior.$inject = [
  'eventBus',
  'modeling',
  'textRenderer'
];


/**
 * @param {Shape} shape a note
 * @param {TextRenderer} textRenderer
 *
 * @return {number} the height the note needs to show its text at its width
 */
export function getNoteHeight(shape, textRenderer) {
  return textRenderer.getTextDimensions(shape.businessObject.body || '', {
    box: { width: shape.width, height: 0 },
    padding: NOTE_PADDING
  }).height;
}
