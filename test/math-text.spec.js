import { describe, it, expect } from 'vitest';

import { parse } from '../lib/core/draw/MathText.js';

function runs(text) {
  return parse(text)[0].map(run => (run.math ? `M(${ run.text })` : run.text)).join('|');
}


describe('core - MathText', function() {

  it('should detect math', function() {
    expect(runs('$\\sqrt{x}$')).toBe('M(\\sqrt{x})');
    expect(runs('close [$n \\geq 3$] / beep')).toBe('close [|M(n \\geq 3)|] / beep');
    expect(runs('$a$ and $b$')).toBe('M(a)| and |M(b)');
  });

  it('should keep prices as text', function() {
    expect(runs('500$, to 1000$')).toBe('500$, to 1000$');
    expect(runs('costs $5 and $10')).toBe('costs $5 and $10');
    expect(runs('from 5$ to 10$')).toBe('from 5$ to 10$');
  });

  it('should prefer the inner pair', function() {
    expect(runs('from $5 to $x$')).toBe('from $5 to |M(x)');
  });

  it('should handle escaped dollar signs', function() {
    expect(runs('costs \\$5')).toBe('costs $5');
    expect(runs('$a \\$ b$')).toBe('M(a \\$ b)');
  });

  it('should keep lone dollar signs as text', function() {
    expect(runs('a $ b')).toBe('a $ b');
    expect(runs('$')).toBe('$');
    expect(runs('$$')).toBe('$$');
  });

});
