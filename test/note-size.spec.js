import { describe, it, expect } from 'vitest';

import { getNoteHeight } from '../lib/core/comment/NoteSizeBehavior.js';

import { NOTE_PADDING } from '../lib/core/comment/CommentUtil.js';


describe('core/comment - NoteSizeBehavior', function() {

  // a text renderer with lines of 10 characters, 15 high
  const textRenderer = {
    getTextDimensions(text, { box, padding }) {
      const charsPerLine = Math.floor((box.width - padding.left - padding.right) / 10) * 10 / 10;
      const lines = Math.max(1, Math.ceil(text.length / Math.max(1, charsPerLine)));

      return { width: box.width, height: lines * 15 + padding.top + padding.bottom };
    }
  };

  function note(width, body) {
    return { width, height: 60, businessObject: { body } };
  }

  const PADDING = NOTE_PADDING.top + NOTE_PADDING.bottom;


  it('should measure the text of a note at its width', function() {
    const width = 100 + NOTE_PADDING.left + NOTE_PADDING.right;

    expect(getNoteHeight(note(width, 'x'.repeat(10)), textRenderer)).toBe(15 + PADDING);
    expect(getNoteHeight(note(width, 'x'.repeat(35)), textRenderer)).toBe(60 + PADDING);
  });

  it('should measure a note without text as one line', function() {
    expect(getNoteHeight(note(140), textRenderer)).toBe(15 + PADDING);
  });

});
