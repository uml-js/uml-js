/**
 * Namespace URIs written by this library, by prefix.
 */
export const NAMESPACES = {
  xmi: 'http://www.omg.org/spec/XMI/20131001',
  uml: 'http://www.omg.org/spec/UML/20161101',
  umldi: 'http://www.omg.org/spec/UML/20161101/UMLDI',
  dc: 'http://www.omg.org/spec/DD/20131001/DC',
  di: 'http://www.omg.org/spec/DD/20131001/DI',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance'
};

export const XMI_VERSION = '20131001';

/**
 * Namespace URIs understood when reading, mapped to the prefix used internally.
 * Covers older OMG releases and the Eclipse UML2 (Papyrus) namespace.
 */
export const KNOWN_NAMESPACES = {
  'http://www.omg.org/spec/XMI/20131001': 'xmi',
  'http://www.omg.org/spec/XMI/20110701': 'xmi',
  'http://www.omg.org/spec/XMI/20100901': 'xmi',
  'http://schema.omg.org/spec/XMI/2.1': 'xmi',
  'http://www.omg.org/XMI': 'xmi',

  'http://www.omg.org/spec/UML/20161101': 'uml',
  'http://www.omg.org/spec/UML/20131001': 'uml',
  'http://www.omg.org/spec/UML/20110701': 'uml',
  'http://www.omg.org/spec/UML/20100901': 'uml',
  'http://www.eclipse.org/uml2/5.0.0/UML': 'uml',
  'http://www.eclipse.org/uml2/4.0.0/UML': 'uml',
  'http://www.eclipse.org/uml2/3.0.0/UML': 'uml',

  'http://www.omg.org/spec/UML/20161101/UMLDI': 'umldi',
  'http://www.omg.org/spec/UML/20131001/UMLDI': 'umldi',

  'http://www.omg.org/spec/DD/20131001/DC': 'dc',
  'http://www.omg.org/spec/DD/20100524/DC': 'dc',
  'http://www.omg.org/spec/DD/20131001/DI': 'di',
  'http://www.omg.org/spec/DD/20100524/DI': 'di',

  'http://www.w3.org/2001/XMLSchema-instance': 'xsi'
};

const BUILTIN_TYPES = new Set([ 'String', 'Boolean', 'Integer', 'Real' ]);

/**
 * Whether a property type is serialized as text (primitive or enumeration).
 */
export function isSimpleType(moddle, type) {
  if (BUILTIN_TYPES.has(type)) {
    return true;
  }

  const [ prefix, localName ] = type.split(':');
  const pkg = moddle.getPackage(prefix);

  return !!(pkg && (pkg.enumerations || []).some(e => e.name === localName));
}
