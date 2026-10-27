import { describe, it, expect } from 'vitest';

import {
  formatAttribute,
  formatEnd,
  formatMultiplicity,
  formatOperation,
  parseAttribute,
  parseEnd,
  parseMultiplicity,
  parseOperation
} from '../lib/class/util/MemberUtil.js';


describe('class - MemberUtil', function() {

  it('should parse multiplicities', function() {
    expect(parseMultiplicity('0..*')).toEqual({ lower: 0, upper: '*' });
    expect(parseMultiplicity('*')).toEqual({ lower: 0, upper: '*' });
    expect(parseMultiplicity('1')).toEqual({ lower: 1, upper: 1 });
    expect(parseMultiplicity('2..5')).toEqual({ lower: 2, upper: 5 });
    expect(parseMultiplicity('a')).toBe(null);

    expect(formatMultiplicity({ lower: 1, upper: 1 })).toBe('1');
    expect(formatMultiplicity({ lower: 0, upper: '*' })).toBe('*');
    expect(formatMultiplicity({ lower: 1, upper: '*' })).toBe('1..*');
  });

  it('should parse attributes', function() {
    expect(parseAttribute('- balance: Real = 0')).toEqual({
      visibility: 'private', isDerived: false, name: 'balance', type: 'Real', multiplicity: null, defaultValue: '0'
    });

    expect(parseAttribute('+ /items: Item [1..*]')).toEqual({
      visibility: 'public', isDerived: true, name: 'items', type: 'Item', multiplicity: { lower: 1, upper: '*' }, defaultValue: undefined
    });

    expect(parseAttribute('name')).toMatchObject({ name: 'name', type: undefined, visibility: undefined });
    expect(parseAttribute(': Type')).toBe(null);
  });

  it('should round-trip attributes', function() {
    for (const text of [ '- balance: Real = 0', '+ /items: Item [1..*]', 'name', '# id: String [*]' ]) {
      expect(formatAttribute(parseAttribute(text))).toBe(text);
    }
  });

  it('should parse operations', function() {
    expect(parseOperation('+ deposit(amount: Real, out receipt: Receipt [0..1]): Boolean')).toEqual({
      visibility: 'public',
      name: 'deposit',
      parameters: [
        { direction: undefined, name: 'amount', type: 'Real', multiplicity: null },
        { direction: 'out', name: 'receipt', type: 'Receipt', multiplicity: { lower: 0, upper: 1 } }
      ],
      type: 'Boolean'
    });

    expect(parseOperation('close()')).toEqual({ visibility: undefined, name: 'close', parameters: [], type: undefined });
    expect(parseOperation('close')).toBe(null);
  });

  it('should round-trip operations', function() {
    for (const text of [ '+ deposit(amount: Real, out receipt: Receipt [0..1]): Boolean', 'close()', '- total(): Real' ]) {
      expect(formatOperation(parseOperation(text))).toBe(text);
    }
  });

  it('should parse association ends', function() {
    expect(parseEnd('+items 0..*')).toEqual({ visibility: 'public', name: 'items', multiplicity: { lower: 0, upper: '*' } });
    expect(parseEnd('1')).toEqual({ visibility: undefined, name: undefined, multiplicity: { lower: 1, upper: 1 } });
    expect(parseEnd('*')).toEqual({ visibility: undefined, name: undefined, multiplicity: { lower: 0, upper: '*' } });
    expect(parseEnd('owner')).toEqual({ visibility: undefined, name: 'owner', multiplicity: null });

    expect(formatEnd(parseEnd('items 0..*'))).toBe('items *');
    expect(formatEnd(parseEnd('+ items 1..*'))).toBe('+ items 1..*');
    expect(formatEnd(parseEnd(''))).toBe('');
  });

});
