import { NAMESPACES, XMI_VERSION } from '../moddle/xmi/namespaces.js';

/**
 * XMI of a new model with an empty component diagram.
 *
 * @param {string} [name='Components']
 *
 * @return {string}
 */
export function createComponentXML(name = 'Components') {
  const escaped = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="${ XMI_VERSION }" xmlns:xmi="${ NAMESPACES.xmi }" xmlns:uml="${ NAMESPACES.uml }" xmlns:umldi="${ NAMESPACES.umldi }" xmlns:dc="${ NAMESPACES.dc }" xmlns:di="${ NAMESPACES.di }">
  <uml:Model xmi:id="Model_1" name="Model"/>
  <umldi:UMLComponentDiagram xmi:id="ComponentDiagram_1" name="${ escaped }" modelElement="Model_1"/>
</xmi:XMI>
`;
}
