import { NAMESPACES, XMI_VERSION } from '../moddle/xmi/namespaces.js';

/**
 * XMI of a new model with a class diagram, starting with a class.
 *
 * @param {string} [name='Classes']
 *
 * @return {string}
 */
export function createClassXML(name = 'Classes') {
  const escaped = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="${ XMI_VERSION }" xmlns:xmi="${ NAMESPACES.xmi }" xmlns:uml="${ NAMESPACES.uml }" xmlns:umldi="${ NAMESPACES.umldi }" xmlns:dc="${ NAMESPACES.dc }" xmlns:di="${ NAMESPACES.di }">
  <uml:Model xmi:id="Model_1" name="Model">
    <packagedElement xmi:type="uml:Class" xmi:id="Class_1" name="Class"/>
  </uml:Model>
  <umldi:UMLClassDiagram xmi:id="ClassDiagram_1" name="${ escaped }" modelElement="Model_1">
    <ownedElement xmi:type="umldi:UMLClassifierShape" xmi:id="Class_1_di" modelElement="Class_1">
      <bounds x="100" y="100" width="160" height="52"/>
    </ownedElement>
  </umldi:UMLClassDiagram>
</xmi:XMI>
`;
}
