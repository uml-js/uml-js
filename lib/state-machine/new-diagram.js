import { NAMESPACES, XMI_VERSION } from '../moddle/xmi/namespaces.js';

/**
 * XMI of a new model with an empty state machine and its diagram.
 *
 * @param {string} [name='StateMachine']
 *
 * @return {string}
 */
export function createStateMachineXML(name = 'StateMachine') {
  const escaped = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="${ XMI_VERSION }" xmlns:xmi="${ NAMESPACES.xmi }" xmlns:uml="${ NAMESPACES.uml }" xmlns:umldi="${ NAMESPACES.umldi }" xmlns:dc="${ NAMESPACES.dc }" xmlns:di="${ NAMESPACES.di }">
  <uml:Model xmi:id="Model_1" name="Model">
    <packagedElement xmi:type="uml:StateMachine" xmi:id="StateMachine_1" name="${ escaped }">
      <region xmi:id="Region_1">
        <subvertex xmi:type="uml:Pseudostate" xmi:id="Pseudostate_1" kind="initial"/>
      </region>
    </packagedElement>
  </uml:Model>
  <umldi:UMLStateMachineDiagram xmi:id="StateMachineDiagram_1" name="${ escaped }" modelElement="StateMachine_1">
    <ownedElement xmi:type="umldi:UMLShape" xmi:id="Pseudostate_1_di" modelElement="Pseudostate_1">
      <bounds x="100" y="100" width="24" height="24"/>
    </ownedElement>
  </umldi:UMLStateMachineDiagram>
</xmi:XMI>
`;
}
