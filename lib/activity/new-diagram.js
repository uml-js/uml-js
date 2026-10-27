import { NAMESPACES, XMI_VERSION } from '../moddle/xmi/namespaces.js';

/**
 * XMI of a new model with an activity and its diagram, starting with an initial node.
 *
 * @param {string} [name='Activity']
 *
 * @return {string}
 */
export function createActivityXML(name = 'Activity') {
  const escaped = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="${ XMI_VERSION }" xmlns:xmi="${ NAMESPACES.xmi }" xmlns:uml="${ NAMESPACES.uml }" xmlns:umldi="${ NAMESPACES.umldi }" xmlns:dc="${ NAMESPACES.dc }" xmlns:di="${ NAMESPACES.di }">
  <uml:Model xmi:id="Model_1" name="Model">
    <packagedElement xmi:type="uml:Activity" xmi:id="Activity_1" name="${ escaped }">
      <node xmi:type="uml:InitialNode" xmi:id="InitialNode_1"/>
    </packagedElement>
  </uml:Model>
  <umldi:UMLActivityDiagram xmi:id="ActivityDiagram_1" name="${ escaped }" modelElement="Activity_1">
    <ownedElement xmi:type="umldi:UMLShape" xmi:id="InitialNode_1_di" modelElement="InitialNode_1">
      <bounds x="100" y="100" width="24" height="24"/>
    </ownedElement>
  </umldi:UMLActivityDiagram>
</xmi:XMI>
`;
}
