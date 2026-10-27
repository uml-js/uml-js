import { Parser } from 'saxen';

import XMIDocument from './XMIDocument.js';

import { KNOWN_NAMESPACES, isSimpleType } from './namespaces.js';

/**
 * @typedef { {
 *   name: string,
 *   attrs: Record<string, string>,
 *   children: Array<RawNode|string>
 * } } RawNode
 */


/**
 * Reads XMI into moddle elements.
 *
 * Elements, attributes and properties not known to the meta-model are kept
 * as raw XML (elements) or `$attrs` (attributes), so they survive a round trip.
 */
export default class XMIReader {

  constructor(moddle) {
    this._moddle = moddle;
  }

  async fromXML(xml) {
    const root = parse(xml);

    this._warnings = [];
    this._elementsById = {};
    this._references = [];

    const document = new XMIDocument();

    // prefixes used within xmi:type values, e.g. `xmi:type="UML:State"`
    this._prefixes = getPrefixMap(root.attrs);

    if (root.name === 'xmi:XMI') {
      document.attrs = getRootAttrs(root.attrs);

      for (const child of root.children) {
        if (typeof child !== 'string') {
          document.contents.push(this._readTopLevel(child));
        }
      }
    } else {
      document.isWrapped = false;
      document.attrs = pick(getRootAttrs(root.attrs), name => name.startsWith('xmlns'));

      document.contents.push(this._readTopLevel(root));
    }

    this._resolveReferences();

    return {
      document,
      elementsById: this._elementsById,
      warnings: this._warnings
    };
  }

  _readTopLevel(node) {
    const type = this._normalizeType(node.attrs['xmi:type']) || node.name;

    if (!this._isKnownType(type)) {
      this._collectRawIds(node);

      return node;
    }

    return this._readElement(node, type);
  }

  _normalizeType(type) {
    if (!type) {
      return type;
    }

    const [ prefix, localName ] = type.split(':');

    return localName && this._prefixes[prefix] ? `${this._prefixes[prefix]}:${localName}` : type;
  }

  _isKnownType(type) {
    if (!/^(uml|umldi|dc|di):/.test(type)) {
      return false;
    }

    try {
      return !!this._moddle.getType(type);
    } catch (e) {
      return false;
    }
  }

  /**
   * @param {RawNode} node
   * @param {string} type
   *
   * @return {ModdleElement}
   */
  _readElement(node, type) {
    const moddle = this._moddle;

    const element = moddle.create(type);
    const descriptor = moddle.getElementDescriptor(element);

    for (const [ name, value ] of Object.entries(node.attrs)) {

      if (name === 'xmi:id') {
        element.id = value;
        this._elementsById[value] = element;
        continue;
      }

      if (name === 'xmi:type' || name === 'xsi:type' || name.startsWith('xmlns') || name === 'xmi:version') {
        continue;
      }

      const property = name.includes(':') ? null : descriptor.propertiesByName[name];

      if (!property || property.isId) {
        element.$attrs[name] = value;
        continue;
      }

      if (property.isReference) {
        this._references.push({ element, property, ids: value.trim().split(/\s+/) });
      } else if (isSimpleType(moddle, property.type)) {
        const parsed = parseValue(value, property.type);

        if (property.isMany) {
          element.get(property.name).push(parsed);
        } else {
          element.set(property.name, parsed);
        }
      } else {
        element.$attrs[name] = value;
      }
    }

    for (const child of node.children) {

      if (typeof child === 'string') {
        continue;
      }

      const property = child.name.includes(':') ? null : descriptor.propertiesByName[child.name];

      if (!property) {
        this._addRaw(element, child);
        continue;
      }

      if (property.isReference) {
        const id = child.attrs['xmi:idref'];
        const href = child.attrs.href;

        if (id) {
          this._references.push({ element, property, ids: [ id ] });
        } else if (href) {
          setOrAdd(element, property, { $href: href });
        } else {
          this._addRaw(element, child);
        }

        continue;
      }

      if (isSimpleType(moddle, property.type)) {
        setOrAdd(element, property, parseValue(getText(child), property.type));
        continue;
      }

      const childType = this._normalizeType(child.attrs['xmi:type'] || child.attrs['xsi:type']) || property.type;

      if (!this._isKnownType(childType)) {
        this._addRaw(element, child);
        continue;
      }

      const childElement = this._readElement(child, childType);

      childElement.$parent = element;

      setOrAdd(element, property, childElement);
    }

    return element;
  }

  _addRaw(element, node) {
    this._collectRawIds(node);

    (element.$raw = element.$raw || []).push(node);
  }

  /**
   * Make elements we keep raw referenceable by ID.
   */
  _collectRawIds(node) {
    const id = node.attrs['xmi:id'];

    if (id) {
      this._elementsById[id] = { $rawRef: true, id };
    }

    for (const child of node.children) {
      if (typeof child !== 'string') {
        this._collectRawIds(child);
      }
    }
  }

  _resolveReferences() {
    for (const { element, property, ids } of this._references) {
      for (const id of ids) {
        let referenced = this._elementsById[id];

        if (!referenced) {
          this._warnings.push({ message: `unresolved reference <${id}>`, element, property: property.name });

          referenced = { $rawRef: true, id };
        }

        setOrAdd(element, property, referenced);
      }
    }
  }
}


// helpers //////////

function setOrAdd(element, property, value) {
  if (property.isMany) {
    element.get(property.name).push(value);
  } else {
    element.set(property.name, value);
  }
}

function parseValue(value, type) {
  if (type === 'Boolean') {
    return value === 'true';
  }

  if (type === 'Integer' || type === 'Real') {
    const number = Number(value);

    return isNaN(number) ? value : number;
  }

  return value;
}

function getPrefixMap(attrs) {
  const prefixes = {};

  for (const [ name, value ] of Object.entries(attrs)) {
    const [ xmlns, prefix ] = name.split(':');

    if (xmlns === 'xmlns' && prefix && KNOWN_NAMESPACES[value]) {
      prefixes[prefix] = KNOWN_NAMESPACES[value];
    }
  }

  return prefixes;
}

function pick(object, fn) {
  return Object.fromEntries(Object.entries(object).filter(([ key ]) => fn(key)));
}

function getText(node) {
  return node.children.filter(c => typeof c === 'string').join('');
}

function getRootAttrs(attrs) {
  const result = {};

  for (const [ name, value ] of Object.entries(attrs)) {

    // known namespaces are re-declared by the writer
    if (name.startsWith('xmlns') && KNOWN_NAMESPACES[value]) {
      continue;
    }

    if (name === 'xmi:version') {
      continue;
    }

    result[name] = value;
  }

  return result;
}

/**
 * Parse XML into a tree of raw nodes, normalizing known namespace prefixes.
 *
 * @param {string} xml
 *
 * @return {RawNode}
 */
export function parse(xml) {
  const parser = new Parser();

  parser.ns(KNOWN_NAMESPACES);

  const stack = [];

  let root = null;

  // saxen emits <closeTag> for self-closing elements, too
  parser.on('openTag', (name, getAttrs, decodeEntities) => {
    const attrs = {};

    for (const [ key, value ] of Object.entries(getAttrs())) {
      attrs[key] = decodeEntities(value);
    }

    const node = { name, attrs, children: [] };

    if (stack.length) {
      stack[stack.length - 1].children.push(node);
    } else {
      root = node;
    }

    stack.push(node);
  });

  parser.on('closeTag', () => {
    stack.pop();
  });

  parser.on('text', (text, decodeEntities) => {
    if (stack.length) {
      stack[stack.length - 1].children.push(decodeEntities(text));
    }
  });

  parser.on('cdata', (text) => {
    if (stack.length) {
      stack[stack.length - 1].children.push(text);
    }
  });

  parser.on('error', (error) => {
    throw error;
  });

  parser.parse(xml);

  if (!root) {
    throw new Error('no XML root element found');
  }

  return root;
}
