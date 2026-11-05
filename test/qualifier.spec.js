import { describe, it, expect } from 'vitest';

import { formatEndText, formatQualifiers, parseEnd, parseQualifiers } from '../lib/class/util/MemberUtil.js';

import { getEndLabelBounds, getQualifierBox, QUALIFIER_HEIGHT, QUALIFIER_PADDING } from '../lib/class/util/EndLabelUtil.js';


describe('class - qualifiers', function() {

  it('should parse qualifiers before the end', function() {
    expect(parseQualifiers('[node: Node] 0..1')).toEqual({
      qualifiers: [ { name: 'node', type: 'Node' } ],
      rest: '0..1'
    });

    expect(parseQualifiers('[a: A, b] items *')).toEqual({
      qualifiers: [ { name: 'a', type: 'A' }, { name: 'b', type: undefined } ],
      rest: 'items *'
    });
  });

  it('should leave ends without qualifiers as they are', function() {
    expect(parseQualifiers('items 0..*')).toEqual({ qualifiers: [], rest: 'items 0..*' });
    expect(parseQualifiers('')).toEqual({ qualifiers: [], rest: '' });
  });

  it('should format qualifiers and ends with qualifiers', function() {
    expect(formatQualifiers([ { name: 'node', type: 'Node' }, { name: 'kind' } ])).toBe('node: Node, kind');

    const { qualifiers, rest } = parseQualifiers('[number: String] accounts 0..1');

    expect(formatEndText(qualifiers, parseEnd(rest))).toBe('[number: String] accounts 0..1');
    expect(formatEndText([], parseEnd('1'))).toBe('1');
  });

  it('should attach the box to the classifier, along horizontal lines', function() {

    // a line leaving the classifier to the right at 100, 50
    const box = getQualifierBox([ { x: 100, y: 50 }, { x: 300, y: 50 } ], 0, 40);

    expect(box).toEqual({ x: 100, y: 50 - QUALIFIER_HEIGHT / 2, width: 40 + 2 * QUALIFIER_PADDING, height: QUALIFIER_HEIGHT, extent: 40 + 2 * QUALIFIER_PADDING });

    // the target end of a line entering a classifier from the right
    const target = getQualifierBox([ { x: 300, y: 50 }, { x: 100, y: 50 } ], 1, 40);

    expect(target.x).toBe(100);
  });

  it('should attach the box to the classifier, along vertical lines', function() {

    // a line leaving the classifier upwards at 100, 200
    const box = getQualifierBox([ { x: 100, y: 200 }, { x: 100, y: 50 } ], 0, 40);

    expect(box).toEqual({ x: 100 - (40 + 2 * QUALIFIER_PADDING) / 2, y: 200 - QUALIFIER_HEIGHT, width: 40 + 2 * QUALIFIER_PADDING, height: QUALIFIER_HEIGHT, extent: QUALIFIER_HEIGHT });
  });

  it('should put the label of a qualified end beyond the box', function() {
    const waypoints = [ { x: 100, y: 50 }, { x: 300, y: 50 } ];
    const size = { width: 30, height: 15 };

    expect(getEndLabelBounds(waypoints, 0, size, 52).x).toBe(getEndLabelBounds(waypoints, 0, size).x + 52);
  });

});
