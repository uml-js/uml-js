// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';

import UmlModdle from '../lib/moddle/index.js';

import { UmlModeler } from '../lib/uml.js';

import doorXML from '../examples/state-machine/door.uml?raw';


/**
 * A modeler that reads and saves documents without showing them, as showing a
 * diagram needs a browser.
 */
class HeadlessModeler extends UmlModeler {
  async open() {
    return { warnings: [] };
  }
}


describe('Manager#saveXML', function() {

  async function read() {
    const modeler = new HeadlessModeler();

    await modeler.importXML(doorXML);

    const [ model ] = modeler._document.contents.filter(content => content.$type === 'uml:Model');

    return { modeler, door: model.packagedElement[0], openDoor: model.packagedElement[1] };
  }

  function viewOf(modeler, element) {
    return modeler.getViews().find(view => view.element.get('modelElement')[0] === element);
  }

  // what deleting a view does, without the command stack of a viewer; returns its undo
  function deleteView(modeler, view) {
    const removed = modeler._removeView(view);

    modeler._noteDeletedElement(view);

    return () => modeler._restoreView(view, removed);
  }

  async function save(modeler) {
    const { xml } = await modeler.saveXML();

    const { warnings } = await new UmlModdle().fromXML(xml);

    expect(warnings).toEqual([]);

    return xml;
  }

  const DOOR = 'xmi:id="DoorSM"';
  const DOOR_DIAGRAM = 'xmi:id="DoorSM_diagram"';
  const OPEN_DOOR = 'xmi:id="OpenDoor"';
  const OPEN_DOOR_DIAGRAM = 'xmi:id="OpenDoor_diagram"';


  it('should keep everything without deleted views', async function() {
    const { modeler } = await read();

    const xml = await save(modeler);

    expect(xml).toContain(DOOR);
    expect(xml).toContain(OPEN_DOOR);
  });


  it('should leave out a state machine nothing refers to', async function() {
    const { modeler, door } = await read();

    deleteView(modeler, viewOf(modeler, door));

    const xml = await save(modeler);

    expect(xml).not.toContain(DOOR_DIAGRAM);
    expect(xml).not.toContain(DOOR);
    expect(xml).toContain(OPEN_DOOR);
  });


  it('should keep a state machine used as submachine', async function() {
    const { modeler, openDoor } = await read();

    deleteView(modeler, viewOf(modeler, openDoor));

    const xml = await save(modeler);

    expect(xml).not.toContain(OPEN_DOOR_DIAGRAM);
    expect(xml).toContain(OPEN_DOOR);
    expect(xml).toContain('submachine="OpenDoor"');
  });


  it('should leave out a submachine only a left out state machine referred to', async function() {
    const { modeler, door, openDoor } = await read();

    deleteView(modeler, viewOf(modeler, openDoor));
    deleteView(modeler, viewOf(modeler, door));

    const xml = await save(modeler);

    expect(xml).not.toContain(DOOR);
    expect(xml).not.toContain(OPEN_DOOR);
  });


  it('should keep a state machine if deleting its view is undone before saving', async function() {
    const { modeler, door } = await read();

    const original = await save(modeler);

    const undo = deleteView(modeler, viewOf(modeler, door));

    undo();

    expect(await save(modeler)).toBe(original);
  });


  it('should keep a state machine if deleting its view is undone after saving', async function() {
    const { modeler, door } = await read();

    const original = await save(modeler);

    const undo = deleteView(modeler, viewOf(modeler, door));

    expect(await save(modeler)).not.toContain(DOOR);

    undo();

    expect(await save(modeler)).toBe(original);
  });


  it('should not change the model by saving', async function() {
    const { modeler, door, openDoor } = await read();

    deleteView(modeler, viewOf(modeler, door));

    await save(modeler);

    expect(door.$parent.packagedElement).toEqual([ door, openDoor ]);
  });


  it('should keep a state machine whose reference is restored by undoing', async function() {
    const { modeler, door, openDoor } = await read();

    const region = door.region[0];
    const state = region.subvertex.find(vertex => vertex.id === 'Open');
    const index = region.subvertex.indexOf(state);

    // the state referring to the submachine is deleted before the view of the submachine ...
    region.subvertex.splice(index, 1);

    deleteView(modeler, viewOf(modeler, openDoor));

    // ... and its deletion is undone in another view than the one the view was deleted in
    region.subvertex.splice(index, 0, state);

    const xml = await save(modeler);

    expect(xml).toContain(OPEN_DOOR);
    expect(xml).toContain('submachine="OpenDoor"');
  });

});
