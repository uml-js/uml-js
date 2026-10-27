/**
 * The content of an XMI file: a list of top level elements, e.g. a
 * `uml:Model` and the `umldi:UMLDiagram`s showing it.
 *
 * Elements in `contents` are either moddle elements or raw XML nodes that
 * this library does not understand (and writes back unchanged).
 */
export default class XMIDocument {

  constructor(options = {}) {

    /**
     * @type {Array<ModdleElement|RawNode>}
     */
    this.contents = options.contents || [];

    /**
     * Additional root attributes, including namespace
     * declarations of namespaces unknown to this library.
     *
     * @type {Record<string, string>}
     */
    this.attrs = options.attrs || {};

    /**
     * Whether the document is wrapped in an `<xmi:XMI>` element. Documents
     * read from Eclipse UML2 files often have a `<uml:Model>` root instead.
     *
     * @type {boolean}
     */
    this.isWrapped = options.isWrapped !== false;
  }

  /**
   * Return top level moddle elements of the given type.
   *
   * @param {string} type
   *
   * @return {Array<ModdleElement>}
   */
  getElements(type) {
    return this.contents.filter(element => element.$instanceOf && element.$instanceOf(type));
  }
}
