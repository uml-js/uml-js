import { describe, it, expect } from 'vitest';

import { execFileSync } from 'node:child_process';


describe('moddle - Node', function() {

  // the tests run through Vite, which loads JSON in any case
  it('should load without a bundler', function() {
    const script = `
      import UmlModdle from '@uml-js/uml-js/moddle';
      const { warnings } = await new UmlModdle().fromXML('<xmi:XMI xmlns:xmi="http://www.omg.org/spec/XMI/20131001" xmlns:uml="http://www.omg.org/spec/UML/20161101"><uml:Model xmi:id="m"/></xmi:XMI>');
      process.stdout.write(String(warnings.length));
    `;

    const output = execFileSync(process.execPath, [ '--input-type=module', '-e', script ], {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8'
    });

    expect(output).toBe('0');
  });

});
