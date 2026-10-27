import { NAMESPACES, XMI_VERSION } from '../moddle/xmi/namespaces.js';

/**
 * XMI of a new model with an empty interaction and its sequence diagram.
 *
 * @param {string} [name='Interaction']
 *
 * @return {string}
 */
export function createSequenceXML(name = 'Interaction') {
  const escaped = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="${ XMI_VERSION }" xmlns:xmi="${ NAMESPACES.xmi }" xmlns:uml="${ NAMESPACES.uml }" xmlns:umldi="${ NAMESPACES.umldi }" xmlns:dc="${ NAMESPACES.dc }" xmlns:di="${ NAMESPACES.di }">
  <uml:Model xmi:id="Model_1" name="Model">
    <packagedElement xmi:type="uml:Interaction" xmi:id="Interaction_1" name="${ escaped }"/>
  </uml:Model>
  <umldi:UMLInteractionDiagram xmi:id="InteractionDiagram_1" name="${ escaped }" modelElement="Interaction_1"/>
</xmi:XMI>
`;
}
