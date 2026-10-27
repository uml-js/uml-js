import { describe, it, expect } from 'vitest';

import { readFileSync } from 'node:fs';

import UmlModdle from '../lib/moddle/index.js';

const doorXML = readFileSync(new URL('../examples/state-machine/door.uml', import.meta.url), 'utf8');


describe('moddle - XMI', function() {

  it('should read state machine with diagram', async function() {
    const moddle = new UmlModdle();

    const { document, warnings } = await moddle.fromXML(doorXML);

    expect(warnings).toEqual([]);

    const [ model ] = document.getElements('uml:Model');
    const [ diagram ] = document.getElements('umldi:UMLStateMachineDiagram');

    const stateMachine = model.packagedElement[0];

    expect(stateMachine.$type).toBe('uml:StateMachine');
    expect(stateMachine.region[0].subvertex.map(v => v.id)).toEqual([ 'initial', 'Closed', 'Open', 'Locked', 'final' ]);

    const open = stateMachine.region[0].transition.find(t => t.id === 't_open');

    expect(open.source.name).toBe('Closed');
    expect(open.trigger[0].name).toBe('open');
    expect(open.guard.specification.body).toEqual([ '!locked' ]);
    expect(open.$parent).toBe(stateMachine.region[0]);

    expect(diagram.modelElement[0]).toBe(stateMachine);

    const lockedShape = diagram.ownedElement.find(e => e.id === 'Locked_di');

    expect(lockedShape.bounds).toMatchObject({ x: 160, y: 330, width: 380, height: 160 });
    expect(lockedShape.ownedElement).toHaveLength(3);

    const openEdge = diagram.ownedElement.find(e => e.id === 't_open_di');

    expect(openEdge.source).toBe(diagram.ownedElement.find(e => e.id === 'Closed_di'));
    expect(openEdge.waypoint.map(p => [ p.x, p.y ])).toEqual([ [ 320, 145 ], [ 480, 145 ] ]);
    expect(openEdge.ownedElement[0].$type).toBe('umldi:UMLLabel');
  });


  it('should round-trip', async function() {
    const moddle = new UmlModdle();

    const { document } = await moddle.fromXML(doorXML);
    const { xml } = await moddle.toXML(document);

    const { document: reimported, warnings } = await moddle.fromXML(xml);
    const { xml: xml2 } = await moddle.toXML(reimported);

    expect(warnings).toEqual([]);
    expect(xml2).toBe(xml);

    expect(xml).toContain('<subvertex xmi:type="uml:State" xmi:id="Closed" name="Closed"/>');
    expect(xml).toContain('<transition xmi:id="t_open" source="Closed" target="Open" guard="t_open_guard">');
    expect(xml).toContain('<bounds x="200" y="130" width="120" height="60"/>');
    expect(xml).toContain('<body>!locked</body>');
  });


  it('should preserve unknown content', async function() {
    const moddle = new UmlModdle();

    const input = `<?xml version="1.0" encoding="UTF-8"?>
<uml:Model xmi:version="20131001" xmlns:xmi="http://www.omg.org/spec/XMI/20131001"
    xmlns:uml="http://www.eclipse.org/uml2/5.0.0/UML" xmlns:foo="http://foo" xmi:id="m" name="M" foo:bar="baz">
  <packagedElement xmi:type="uml:Class" xmi:id="C" name="C" isAbstract="true">
    <ownedAttribute xmi:id="C_a" name="a" type="C"/>
    <ownedBehavior xmi:type="uml:StateMachine" xmi:id="sm" name="SM">
      <region xmi:id="r">
        <subvertex xmi:type="uml:State" xmi:id="s" name="S"/>
        <subvertex xmi:type="uml:ConnectionPointReference" xmi:id="cpr"/>
        <transition xmi:id="t" source="s" target="cpr"/>
      </region>
    </ownedBehavior>
    <xmi:Extension extender="test"><foo a="1">text &amp; more</foo></xmi:Extension>
  </packagedElement>
</uml:Model>`;

    const { document, warnings } = await moddle.fromXML(input);

    expect(warnings).toEqual([]);
    expect(document.isWrapped).toBe(false);

    const [ model ] = document.contents;

    expect(model.$attrs['foo:bar']).toBe('baz');

    const cls = model.packagedElement[0];

    expect(cls.isAbstract).toBe(true);
    expect(cls.ownedBehavior[0].region[0].transition[0].target.id).toBe('cpr');

    const { xml } = await moddle.toXML(document);

    expect(xml).toContain('<uml:Model xmi:version="20131001"');
    expect(xml).toContain('xmlns:uml="http://www.omg.org/spec/UML/20161101"');
    expect(xml).toContain('xmlns:foo="http://foo"');
    expect(xml).toContain('foo:bar="baz"');
    expect(xml).toContain('<ownedAttribute xmi:id="C_a" name="a" type="C"/>');
    expect(xml).toContain('<subvertex xmi:type="uml:ConnectionPointReference" xmi:id="cpr"/>');
    expect(xml).toContain('<transition xmi:id="t" source="s" target="cpr"/>');
    expect(xml).toContain('<foo a="1">text &amp; more</foo>');
  });

});


describe('moddle - XMI component diagrams', function() {

  const webshopXML = readFileSync(new URL('../examples/component/webshop.uml', import.meta.url), 'utf8');

  it('should read and round-trip', async function() {
    const moddle = new UmlModdle();

    const { document, warnings } = await moddle.fromXML(webshopXML);

    expect(warnings).toEqual([]);

    const [ model ] = document.getElements('uml:Model');
    const shop = model.packagedElement[0];

    expect(shop.$type).toBe('uml:Component');
    expect(shop.ownedAttribute[0].$type).toBe('uml:Port');
    expect(shop.ownedConnector[0].end.map(end => end.role.id)).toEqual([ 'p_web', 'cat_in' ]);
    expect(shop.interfaceRealization[0].contract.name).toBe('IOrders');

    const [ diagram ] = document.getElements('umldi:UMLComponentDiagram');

    expect(diagram.ownedElement.find(e => e.id === 'IPayment_di').isIcon).toBe(true);

    const { xml } = await moddle.toXML(document);
    const { document: reimported } = await moddle.fromXML(xml);

    expect((await moddle.toXML(reimported)).xml).toBe(xml);
  });

});


describe('moddle - XMI sequence diagrams', function() {

  const loginXML = readFileSync(new URL('../examples/sequence/login.uml', import.meta.url), 'utf8');

  it('should read and round-trip', async function() {
    const moddle = new UmlModdle();

    const { document, warnings } = await moddle.fromXML(loginXML);

    expect(warnings).toEqual([]);

    const [ model ] = document.getElements('uml:Model');
    const interaction = model.packagedElement[0];

    expect(interaction.$type).toBe('uml:Interaction');
    expect(interaction.lifeline.map(l => l.id)).toEqual([ 'User', 'WebApp', 'Auth' ]);

    const [ login ] = interaction.message;

    expect(login.sendEvent.covered[0].id).toBe('User');
    expect(login.receiveEvent.message).toBe(login);
    expect(interaction.message.find(m => m.id === 'm3').messageSort).toBe('reply');

    const [ diagram ] = document.getElements('umldi:UMLInteractionDiagram');

    expect(diagram.kind).toBe('sequence');

    const { xml } = await moddle.toXML(document);
    const { document: reimported } = await moddle.fromXML(xml);

    expect((await moddle.toXML(reimported)).xml).toBe(xml);
  });

});


describe('moddle - XMI activity diagrams', function() {

  const orderXML = readFileSync(new URL('../examples/activity/order.uml', import.meta.url), 'utf8');

  it('should read and round-trip', async function() {
    const moddle = new UmlModdle();

    const { document, warnings } = await moddle.fromXML(orderXML);

    expect(warnings).toEqual([]);

    const [ model ] = document.getElements('uml:Model');
    const activity = model.packagedElement[0];

    expect(activity.$type).toBe('uml:Activity');
    expect(activity.node.find(n => n.id === 'decision').outgoing.map(f => f.id)).toEqual([ 'f3', 'f4' ]);
    expect(activity.edge.find(e => e.id === 'f3').guard.body).toEqual([ 'in stock' ]);

    const { xml } = await moddle.toXML(document);
    const { document: reimported } = await moddle.fromXML(xml);

    expect((await moddle.toXML(reimported)).xml).toBe(xml);
  });

});


describe('moddle - XMI use case diagrams', function() {

  const shopXML = readFileSync(new URL('../examples/use-case/shop.uml', import.meta.url), 'utf8');

  it('should read and round-trip', async function() {
    const moddle = new UmlModdle();

    const { document, warnings } = await moddle.fromXML(shopXML);

    expect(warnings).toEqual([]);

    const [ model ] = document.getElements('uml:Model');

    const shop = model.packagedElement.find(e => e.id === 'Shop');
    const order = shop.ownedUseCase.find(u => u.id === 'Order');

    expect(order.$type).toBe('uml:UseCase');
    expect(order.subject).toEqual([ shop ]);
    expect(order.include.map(i => i.addition.id)).toEqual([ 'LogIn', 'Pay' ]);
    expect(shop.ownedUseCase.find(u => u.id === 'Voucher').extend[0].extendedCase).toBe(order);

    const member = model.packagedElement.find(e => e.id === 'Member');

    expect(member.generalization[0].general.id).toBe('Customer');

    const association = model.packagedElement.find(e => e.id === 'a2');

    expect(association.memberEnd.map(end => end.type.id)).toEqual([ 'Customer', 'Order' ]);

    const { xml } = await moddle.toXML(document);
    const { document: reimported } = await moddle.fromXML(xml);

    expect((await moddle.toXML(reimported)).xml).toBe(xml);
  });

});
