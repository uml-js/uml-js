import { describe, it, expect } from 'vitest';

import UmlModdle from '../lib/moddle/index.js';
import UmlFactory from '../lib/core/modeling/UmlFactory.js';

import {
  getLabelProperties,
  getStateText,
  getTransitionText,
  parseStateText,
  parseTransitionText
} from '../lib/state-machine/util/LabelUtil.js';


describe('state-machine - LabelUtil', function() {

  describe('parseTransitionText', function() {

    it('should parse trigger, guard and effect', function() {
      expect(parseTransitionText('open, push [!locked && x/2 > 1] / beep(); log()')).toEqual({
        triggers: [ 'open', 'push' ],
        guard: '!locked && x/2 > 1',
        effect: 'beep(); log()'
      });
    });

    it('should parse partial notation', function() {
      expect(parseTransitionText('open')).toEqual({ triggers: [ 'open' ], guard: '', effect: '' });
      expect(parseTransitionText('[ready]')).toEqual({ triggers: [], guard: 'ready', effect: '' });
      expect(parseTransitionText('/ go')).toEqual({ triggers: [], guard: '', effect: 'go' });
      expect(parseTransitionText('')).toEqual({ triggers: [], guard: '', effect: '' });
    });
  });


  it('should parse state text', function() {
    expect(parseStateText('Open\nentry / lightOn\n do/hum \nexit / off')).toEqual({
      name: 'Open',
      entry: 'lightOn',
      doActivity: 'hum',
      exit: 'off'
    });
  });


  it('should round-trip transition text through the model', function() {
    const moddle = new UmlModdle();
    const factory = new UmlFactory(moddle);

    const transition = factory.create('uml:Transition');

    const text = 'open, push [ready] / beep';

    const properties = getLabelProperties(transition, text, factory);

    Object.entries(properties).forEach(([ key, value ]) => transition.set(key, value));

    expect(getTransitionText(transition)).toBe(text);
    expect(transition.guard.$parent).toBe(transition);
    expect(transition.get('ownedRule')).toEqual([ transition.guard ]);

    // unchanged parts keep their model elements
    const again = getLabelProperties(transition, 'open [ready] / beep', factory);

    expect(again.trigger).toEqual([ transition.trigger[0] ]);
    expect(again.guard).toBe(transition.guard);
    expect(again.effect).toBe(transition.effect);

    // removed guard is removed from owned rules
    const noGuard = getLabelProperties(transition, 'open / beep', factory);

    expect(noGuard.guard).toBeUndefined();
    expect(noGuard.ownedRule).toEqual([]);
  });


  it('should round-trip state text through the model', function() {
    const moddle = new UmlModdle();
    const factory = new UmlFactory(moddle);

    const state = factory.create('uml:State');

    const text = 'Open\nentry / lightOn\nexit / lightOff';

    Object.entries(getLabelProperties(state, text, factory)).forEach(([ key, value ]) => state.set(key, value));

    expect(getStateText(state)).toBe(text);
    expect(state.entry.$type).toBe('uml:OpaqueBehavior');
    expect(state.doActivity).toBeUndefined();
  });

});
