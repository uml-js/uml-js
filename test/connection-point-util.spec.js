import { describe, it, expect } from 'vitest';

import UmlModdle from '../lib/moddle/index.js';

import { findPoint, getUniqueName } from '../lib/state-machine/util/ElementUtil.js';


describe('state machine - connection points', function() {

  const moddle = new UmlModdle();

  function createStateMachine(points) {
    return moddle.create('uml:StateMachine', {
      connectionPoint: points.map(([ kind, name ]) => moddle.create('uml:Pseudostate', { kind, name }))
    });
  }

  it('should number new names', function() {
    const stateMachine = createStateMachine([ [ 'exitPoint', 'exit_1' ], [ 'exitPoint', ' exit_3 ' ] ]);

    expect(getUniqueName([], 'entry')).toBe('entry_1');
    expect(getUniqueName(stateMachine.get('connectionPoint'), 'exit')).toBe('exit_2');
  });

  it('should find points by kind and trimmed name', function() {
    const stateMachine = createStateMachine([ [ 'exitPoint', 'failed' ], [ 'entryPoint', 'failed' ], [ 'exitPoint', '' ] ]);
    const [ exit, entry, unnamed ] = stateMachine.get('connectionPoint');

    expect(findPoint(stateMachine, 'exitPoint', ' failed ')).toBe(exit);
    expect(findPoint(stateMachine, 'entryPoint', 'failed')).toBe(entry);
    expect(findPoint(stateMachine, 'exitPoint', 'failed', exit)).toBe(undefined);
    expect(findPoint(stateMachine, 'exitPoint', '  ')).toBe(undefined);
    expect(unnamed.name).toBe('');
  });
});
