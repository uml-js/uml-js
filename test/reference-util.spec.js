import { describe, it, expect } from 'vitest';

import { readFileSync } from 'node:fs';

import UmlModdle from '../lib/moddle/index.js';

import { isReferenced, removeUnreferenced, restoreRemoved } from '../lib/core/util/ReferenceUtil.js';

const doorXML = readFileSync(new URL('../examples/state-machine/door.uml', import.meta.url), 'utf8');


describe('core/util - ReferenceUtil', function() {

  async function read() {
    const moddle = new UmlModdle();

    const { document } = await moddle.fromXML(doorXML);

    const [ model ] = document.getElements('uml:Model');

    return { moddle, document, model, door: model.packagedElement[0], openDoor: model.packagedElement[1] };
  }


  it('should find a reference to an element', async function() {
    const { document, openDoor } = await read();

    expect(isReferenced(document.contents, openDoor)).toBe(true);
  });


  it('should find a diagram showing an element', async function() {
    const { document, door } = await read();

    expect(isReferenced(document.contents, door)).toBe(true);
  });


  it('should ignore references within the element', async function() {
    const { document, door } = await read();

    const others = document.contents.filter(content => !(content.$instanceOf && content.$instanceOf('umldi:UMLDiagram')));

    expect(isReferenced(others, door)).toBe(false);
  });


  describe('removeUnreferenced', function() {

    function withoutDiagramsOf(document, ...elements) {
      document.contents = document.contents.filter(content => {
        return !(content.$instanceOf && content.$instanceOf('umldi:UMLDiagram') && elements.includes(content.get('modelElement')[0]));
      });
    }


    it('should keep an element something refers to', async function() {
      const { document, model, door, openDoor } = await read();

      withoutDiagramsOf(document, openDoor);

      expect(removeUnreferenced(document.contents, [ openDoor ])).toEqual([]);
      expect(model.packagedElement).toEqual([ door, openDoor ]);
    });


    it('should remove an element only another removed one referred to', async function() {
      const { document, model, door, openDoor } = await read();

      withoutDiagramsOf(document, door, openDoor);

      const removed = removeUnreferenced(document.contents, [ openDoor, door ]);

      expect(removed.map(({ element }) => element)).toEqual([ door, openDoor ]);
      expect(model.packagedElement).toEqual([]);
    });


    it('should restore removed elements in place', async function() {
      const { moddle, document, model, door, openDoor } = await read();

      withoutDiagramsOf(document, door, openDoor);

      const { xml } = await moddle.toXML(document);

      const removed = removeUnreferenced(document.contents, [ door, openDoor ]);

      restoreRemoved(removed);

      expect(model.packagedElement).toEqual([ door, openDoor ]);
      expect((await moddle.toXML(document)).xml).toBe(xml);
    });

  });

});
