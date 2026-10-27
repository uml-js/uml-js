import { NAMESPACES, XMI_VERSION } from '../moddle/xmi/namespaces.js';

/**
 * XMI of a new model with a package diagram, starting with a package.
 *
 * @param {string} [name='Packages']
 *
 * @return {string}
 */
export function createPackageXML(name = 'Packages') {
  const escaped = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="${ XMI_VERSION }" xmlns:xmi="${ NAMESPACES.xmi }" xmlns:uml="${ NAMESPACES.uml }" xmlns:umldi="${ NAMESPACES.umldi }" xmlns:dc="${ NAMESPACES.dc }" xmlns:di="${ NAMESPACES.di }">
  <uml:Model xmi:id="Model_1" name="Model">
    <packagedElement xmi:type="uml:Package" xmi:id="Package_1" name="Package"/>
  </uml:Model>
  <umldi:UMLPackageDiagram xmi:id="PackageDiagram_1" name="${ escaped }" modelElement="Model_1">
    <ownedElement xmi:type="umldi:UMLShape" xmi:id="Package_1_di" modelElement="Package_1">
      <bounds x="100" y="100" width="200" height="140"/>
    </ownedElement>
  </umldi:UMLPackageDiagram>
</xmi:XMI>
`;
}
