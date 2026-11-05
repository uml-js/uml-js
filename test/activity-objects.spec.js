import { describe, it, expect } from 'vitest';

import UmlModdle from '../lib/moddle/index.js';

import { canAttach, canConnect, canCreate, getAttachTarget } from '../lib/activity/rules/ActivityRules.js';

import { getOwners, getPinProperty, isInput } from '../lib/activity/util/ElementUtil.js';

import { getExternalLabelBounds } from '../lib/activity/util/LabelUtil.js';


describe('activity - object nodes, expansion regions and groups', function() {

  const moddle = new UmlModdle();

  function shape(type, bounds = {}, attrs = {}) {
    const businessObject = moddle.create(type, attrs);

    return { x: 0, y: 0, width: 100, height: 60, ...bounds, type, businessObject, incoming: [], outgoing: [], labels: [] };
  }

  const root = { businessObject: moddle.create('uml:Activity'), children: [] };


  describe('rules', function() {

    const action = shape('uml:OpaqueAction', { x: 100, y: 100 }, {});
    const structured = shape('uml:StructuredActivityNode', { x: 300, y: 100, width: 200, height: 150 });

    const input = { ...shape('uml:InputPin', { width: 16, height: 16 }), host: action };
    const output = { ...shape('uml:OutputPin', { width: 16, height: 16 }), host: action };
    const structuredInput = { ...shape('uml:InputPin', { width: 16, height: 16 }), host: structured };

    const store = shape('uml:DataStoreNode');
    const fork = shape('uml:ForkNode');
    const initial = shape('uml:InitialNode');
    const final = shape('uml:ActivityFinalNode');


    it('should connect object nodes by object flows', function() {
      expect(canConnect(output, input)).toEqual({ type: 'uml:ObjectFlow' });
      expect(canConnect(output, store)).toEqual({ type: 'uml:ObjectFlow' });
      expect(canConnect(store, fork)).toEqual({ type: 'uml:ObjectFlow' });
      expect(canConnect(store, final)).toEqual({ type: 'uml:ObjectFlow' });
    });

    it('should connect other nodes by control flows', function() {
      expect(canConnect(action, structured)).toEqual({ type: 'uml:ControlFlow' });
      expect(canConnect(initial, action)).toEqual({ type: 'uml:ControlFlow' });
    });

    it('should not connect actions by object flows', function() {
      expect(canConnect(output, action)).toBe(false);
      expect(canConnect(action, input)).toBe(false);
    });

    it('should not let objects leave initial nodes', function() {
      expect(canConnect(initial, store)).toBe(false);
    });

    it('should let objects only enter input pins and leave output pins of actions', function() {
      expect(canConnect(input, store)).toBe(false);
      expect(canConnect(store, output)).toBe(false);
    });

    it('should let objects flow from the input pins of structured activity nodes into their content', function() {
      expect(canConnect(structuredInput, store)).toEqual({ type: 'uml:ObjectFlow' });
    });

    it('should attach pins to actions and expansion nodes to expansion regions, near their border', function() {
      const region = shape('uml:ExpansionRegion', { x: 300, y: 100, width: 200, height: 150 });
      const pin = shape('uml:InputPin', { width: 16, height: 16 });
      const node = shape('uml:ExpansionNode', { width: 48, height: 16 });

      expect(canAttach(pin, action, { x: 100, y: 130 })).toBe(true);
      expect(canAttach(pin, action, { x: 150, y: 130 })).toBe(false);
      expect(canAttach(pin, region, { x: 300, y: 130 })).toBe(true);
      expect(canAttach(node, region, { x: 400, y: 100 })).toBe(true);
      expect(canAttach(node, action, { x: 100, y: 130 })).toBe(false);
    });

    it('should attach to the node of a hovered pin', function() {
      expect(getAttachTarget(shape('uml:OutputPin'), input)).toBe(action);
      expect(getAttachTarget(shape('uml:ExpansionNode'), action)).toBe(null);
    });

    it('should create pins attached only, groups on the activity only', function() {
      expect(canCreate(shape('uml:InputPin'), root)).toBe(false);
      expect(canCreate(shape('uml:ActivityPartition'), root)).toBe(true);
      expect(canCreate(shape('uml:InterruptibleActivityRegion'), { ...structured, parent: root })).toBe(false);
      expect(canCreate(shape('uml:CentralBufferNode'), root)).toBe(true);
    });

  });


  describe('model', function() {

    it('should own pins by the property of the kind of action', function() {
      expect(getPinProperty(moddle.create('uml:OpaqueAction'), true)).toBe('inputValue');
      expect(getPinProperty(moddle.create('uml:OpaqueAction'), false)).toBe('outputValue');
      expect(getPinProperty(moddle.create('uml:CallBehaviorAction'), true)).toBe('argument');
      expect(getPinProperty(moddle.create('uml:CallBehaviorAction'), false)).toBe('result');
      expect(getPinProperty(moddle.create('uml:StructuredActivityNode'), true)).toBe('structuredNodeInput');
      expect(getPinProperty(moddle.create('uml:ExpansionRegion'), false)).toBe('structuredNodeOutput');
    });

    it('should tell inputs from outputs', function() {
      const region = moddle.create('uml:ExpansionRegion');

      expect(isInput(moddle.create('uml:InputPin'))).toBe(true);
      expect(isInput(moddle.create('uml:OutputPin'))).toBe(false);
      expect(isInput(moddle.create('uml:ExpansionNode', { regionAsInput: region }))).toBe(true);
      expect(isInput(moddle.create('uml:ExpansionNode', { regionAsOutput: region }))).toBe(false);
    });

    it('should count expansion nodes as inside their region', function() {
      const activity = moddle.create('uml:Activity');
      const region = moddle.create('uml:ExpansionRegion');
      const node = moddle.create('uml:ExpansionNode', { regionAsInput: region });

      region.$parent = activity;
      node.$parent = activity;

      expect(getOwners(node)).toEqual([ region, activity ]);
    });

    it('should count pins as inside the structured activity node they belong to', function() {
      const activity = moddle.create('uml:Activity');
      const structured = moddle.create('uml:StructuredActivityNode');
      const pin = moddle.create('uml:InputPin');

      structured.$parent = activity;
      pin.$parent = structured;

      expect(getOwners(pin)).toEqual([ structured, activity ]);
    });

  });


  describe('labels', function() {

    const action = shape('uml:OpaqueAction', { x: 100, y: 100, width: 120, height: 60 });
    const size = { width: 40, height: 15 };

    it('should put the label of a pin at the bottom beside it', function() {
      const pin = { ...shape('uml:OutputPin', { x: 152, y: 152, width: 16, height: 16 }), host: action };

      expect(getExternalLabelBounds(pin, size)).toEqual({ x: 172, y: 172, width: 40, height: 15 });
    });

    it('should put the label of a pin on the right outside the action', function() {
      const pin = { ...shape('uml:OutputPin', { x: 212, y: 122, width: 16, height: 16 }), host: action };

      expect(getExternalLabelBounds(pin, size).x).toBeGreaterThan(228);
    });

  });

});
