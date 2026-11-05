import { describe, it, expect } from 'vitest';

import UmlModdle from '../lib/moddle/index.js';

import MessageLayouter from '../lib/sequence/modeling/MessageLayouter.js';

import { GUARD_HEIGHT, GUARD_TOP, MESSAGE_MARGIN } from '../lib/sequence/util/ElementUtil.js';

import { LABEL_DISTANCE } from '../lib/core/util/GeometryUtil.js';

const LABEL_HEIGHT = 15;


describe('sequence/modeling - MessageLayouter', function() {

  const moddle = new UmlModdle();

  function operand(bounds, guard) {
    const businessObject = moddle.create('uml:InteractionOperand', guard ? {
      guard: moddle.create('uml:InteractionConstraint', {
        specification: moddle.create('uml:OpaqueExpression', { body: [ guard ] })
      })
    } : {});

    return { ...bounds, businessObject };
  }

  function message(name) {
    return { businessObject: moddle.create('uml:Message', name ? { name } : {}) };
  }

  function layouter(operands) {
    const elementRegistry = { filter: fn => operands.filter(fn) };
    const textRenderer = { getExternalLabelBounds: () => ({ x: 0, y: 0, width: 50, height: LABEL_HEIGHT }) };

    return new MessageLayouter(elementRegistry, textRenderer);
  }

  const BELOW_GUARD = GUARD_TOP + GUARD_HEIGHT;


  it('should move a named message and its name below a guard', function() {
    const layout = layouter([ operand({ x: 0, y: 100, width: 400, height: 200 }, 'x > 0') ]);

    expect(layout._belowGuards(message('m'), 110, 50, 250)).toBe(100 + BELOW_GUARD + LABEL_HEIGHT + LABEL_DISTANCE);
  });

  it('should move a message without a name below a guard', function() {
    const layout = layouter([ operand({ x: 0, y: 100, width: 400, height: 200 }, 'x > 0') ]);

    expect(layout._belowGuards(message(), 100, 50, 250)).toBe(100 + BELOW_GUARD + MESSAGE_MARGIN);
  });

  it('should keep messages clear of guards where they are', function() {
    const layout = layouter([ operand({ x: 0, y: 100, width: 400, height: 200 }, 'x > 0') ]);

    expect(layout._belowGuards(message('m'), 90, 50, 250)).toBe(90);
    expect(layout._belowGuards(message('m'), 180, 50, 250)).toBe(180);
  });

  it('should ignore operands without a guard', function() {
    const layout = layouter([ operand({ x: 0, y: 100, width: 400, height: 200 }) ]);

    expect(layout._belowGuards(message('m'), 110, 50, 250)).toBe(110);
  });

  it('should ignore operands the message leaves', function() {
    const layout = layouter([ operand({ x: 100, y: 100, width: 100, height: 200 }, 'x > 0') ]);

    expect(layout._belowGuards(message('m'), 110, 50, 250)).toBe(110);
  });

  it('should ignore operands too small to hold the message below their guard', function() {
    const layout = layouter([ operand({ x: 0, y: 100, width: 400, height: 30 }, 'x > 0') ]);

    expect(layout._belowGuards(message('m'), 110, 50, 250)).toBe(110);
  });

  it('should move a message below the guards of nested operands', function() {
    const inner = BELOW_GUARD + LABEL_HEIGHT + LABEL_DISTANCE;

    const layout = layouter([
      operand({ x: 0, y: 100, width: 400, height: 300 }, 'outer'),
      operand({ x: 20, y: 100 + inner - 10, width: 360, height: 200 }, 'inner')
    ]);

    expect(layout._belowGuards(message('m'), 110, 50, 250)).toBe(100 + inner - 10 + inner);
  });

});
