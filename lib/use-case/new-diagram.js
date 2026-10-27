import { NAMESPACES, XMI_VERSION } from '../moddle/xmi/namespaces.js';

/**
 * XMI of a new model with a use case diagram, starting with an actor.
 *
 * @param {string} [name='Use cases']
 *
 * @return {string}
 */
export function createUseCaseXML(name = 'Use cases') {
  const escaped = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="${ XMI_VERSION }" xmlns:xmi="${ NAMESPACES.xmi }" xmlns:uml="${ NAMESPACES.uml }" xmlns:umldi="${ NAMESPACES.umldi }" xmlns:dc="${ NAMESPACES.dc }" xmlns:di="${ NAMESPACES.di }">
  <uml:Model xmi:id="Model_1" name="Model">
    <packagedElement xmi:type="uml:Actor" xmi:id="Actor_1" name="Actor"/>
  </uml:Model>
  <umldi:UMLUseCaseDiagram xmi:id="UseCaseDiagram_1" name="${ escaped }" modelElement="Model_1">
    <ownedElement xmi:type="umldi:UMLShape" xmi:id="Actor_1_di" modelElement="Actor_1">
      <bounds x="100" y="100" width="40" height="70"/>
    </ownedElement>
  </umldi:UMLUseCaseDiagram>
</xmi:XMI>
`;
}
