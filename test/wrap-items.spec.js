import { describe, it, expect } from 'vitest';

import { wrapItems } from '../lib/core/draw/MathText.js';

const word = (text, width = text.length) => ({ text, width });
const space = () => ({ text: ' ', width: 1, space: true });
const math = (text, width) => ({ text, width, math: true });

function lines(items, maxWidth) {
  return wrapItems(items, maxWidth).map(line => line.items.map(item => item.text).join(''));
}


describe('core/draw - MathText#wrapItems', function() {

  it('should wrap at spaces', function() {
    expect(lines([ word('aaa'), space(), word('bbb'), space(), word('ccc') ], 7)).toEqual([ 'aaa bbb', 'ccc' ]);
  });

  it('should keep punctuation with the math before it', function() {

    // `$c_k$, greedy`
    const items = [ word('top'), space(), math('M', 4), word(','), space(), word('greedy') ];

    expect(lines(items, 8)).toEqual([ 'top', 'M,', 'greedy' ]);
  });

  it('should keep text with the math after it', function() {

    // `top-$k$ candidates`
    const items = [ word('aa'), space(), word('top-'), math('k', 1), space(), word('candidates') ];

    expect(lines(items, 7)).toEqual([ 'aa', 'top-k', 'candidates' ]);
  });

  it('should give a word wider than the line a line of its own', function() {
    expect(lines([ word('a'), space(), word('bbbbbbbb'), space(), word('c') ], 4)).toEqual([ 'a', 'bbbbbbbb', 'c' ]);
  });

  it('should drop spaces at the start and end of lines', function() {
    expect(lines([ space(), word('aa'), space(), word('bb'), space() ], 3)).toEqual([ 'aa', 'bb' ]);
  });

});
