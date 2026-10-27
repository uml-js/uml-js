import { Moddle } from 'moddle';

import umlPackage from './resources/uml.json';
import umldiPackage from './resources/umldi.json';
import dcPackage from './resources/dc.json';
import diPackage from './resources/di.json';

import XMIReader from './xmi/Reader.js';
import XMIWriter from './xmi/Writer.js';

export const packages = {
  uml: umlPackage,
  umldi: umldiPackage,
  dc: dcPackage,
  di: diPackage
};


/**
 * A moddle instance aware of UML, UML DI and the underlying
 * Diagram Definition (DC, DI) packages that reads and writes XMI.
 */
export default class UmlModdle extends Moddle {

  constructor(additionalPackages = {}) {
    super(Object.values({ ...packages, ...additionalPackages }));
  }

  /**
   * Parse an XMI string into an XMI document.
   *
   * @param {string} xml
   *
   * @return {Promise<{ document: XMIDocument, warnings: Array<Object> }>}
   */
  async fromXML(xml) {
    return new XMIReader(this).fromXML(xml);
  }

  /**
   * Serialize an XMI document.
   *
   * @param {XMIDocument} document
   * @param {{ format?: boolean }} [options]
   *
   * @return {Promise<{ xml: string }>}
   */
  async toXML(document, options = {}) {
    return { xml: new XMIWriter(this, options).toXML(document) };
  }
}
