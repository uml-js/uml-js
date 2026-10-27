import { NAMESPACES, XMI_VERSION } from '../moddle/xmi/namespaces.js';

/**
 * XMI of a new model with a deployment diagram, starting with a node.
 *
 * @param {string} [name='Deployment']
 *
 * @return {string}
 */
export function createDeploymentXML(name = 'Deployment') {
  const escaped = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="${ XMI_VERSION }" xmlns:xmi="${ NAMESPACES.xmi }" xmlns:uml="${ NAMESPACES.uml }" xmlns:umldi="${ NAMESPACES.umldi }" xmlns:dc="${ NAMESPACES.dc }" xmlns:di="${ NAMESPACES.di }">
  <uml:Model xmi:id="Model_1" name="Model">
    <packagedElement xmi:type="uml:Node" xmi:id="Node_1" name="Node"/>
  </uml:Model>
  <umldi:UMLDeploymentDiagram xmi:id="DeploymentDiagram_1" name="${ escaped }" modelElement="Model_1">
    <ownedElement xmi:type="umldi:UMLShape" xmi:id="Node_1_di" modelElement="Node_1">
      <bounds x="100" y="100" width="240" height="160"/>
    </ownedElement>
  </umldi:UMLDeploymentDiagram>
</xmi:XMI>
`;
}
