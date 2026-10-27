import { NAMESPACES, XMI_VERSION, isSimpleType } from './namespaces.js';


/**
 * Writes an XMI document (see XMIDocument) to XML.
 */
export default class XMIWriter {

  constructor(moddle, options = {}) {
    this._moddle = moddle;
    this._format = options.format !== false;
  }

  toXML(document) {
    const lines = [ '<?xml version="1.0" encoding="UTF-8"?>' ];

    const rootAttrs = {
      'xmi:version': XMI_VERSION,
      ...namespaceDeclarations(),
      ...document.attrs
    };

    const contents = document.contents;

    if (!document.isWrapped && contents.length === 1 && !contents[0].$rawRef && contents[0].$type) {
      this._writeElement(lines, contents[0], contents[0].$type, null, 0, rootAttrs);
    } else {
      lines.push(`<xmi:XMI${serializeAttrs(rootAttrs)}>`);

      for (const element of contents) {
        if (element.$type) {
          this._writeElement(lines, element, element.$type, null, 1);
        } else {
          this._writeRaw(lines, element, 1);
        }
      }

      lines.push('</xmi:XMI>');
    }

    return lines.join(this._format ? '\n' : '') + '\n';
  }

  _indent(depth) {
    return this._format ? '  '.repeat(depth) : '';
  }

  /**
   * @param {string[]} lines
   * @param {ModdleElement} element
   * @param {string} tagName
   * @param {string|null} declaredType type of the containing property, if any
   * @param {number} depth
   * @param {Record<string, string>} [extraAttrs]
   */
  _writeElement(lines, element, tagName, declaredType, depth, extraAttrs = {}) {
    const moddle = this._moddle;
    const descriptor = moddle.getElementDescriptor(element);

    const attrs = { ...extraAttrs };
    const children = [];

    if (declaredType && element.$type !== declaredType) {
      attrs['xmi:type'] = element.$type;
    }

    if (element.id) {
      attrs['xmi:id'] = element.id;
    }

    for (const property of descriptor.properties) {
      const name = property.name;

      if (property.isId || !Object.prototype.hasOwnProperty.call(element, name)) {
        continue;
      }

      const value = element[name];

      if (value === undefined || value === null || (Array.isArray(value) && !value.length)) {
        continue;
      }

      const values = property.isMany ? value : [ value ];

      if (property.isReference) {
        const ids = values.filter(v => !v.$href).map(v => v.id);

        if (ids.length) {
          attrs[name] = ids.join(' ');
        }

        for (const v of values.filter(v => v.$href)) {
          children.push(() => lines.push(`${this._indent(depth + 1)}<${name} href="${escapeAttr(v.$href)}"/>`));
        }
      } else if (isSimpleType(moddle, property.type)) {
        if (property.isMany) {
          for (const v of values) {
            children.push(() => lines.push(`${this._indent(depth + 1)}<${name}>${escapeBody(String(v))}</${name}>`));
          }
        } else {
          attrs[name] = String(value);
        }
      } else {
        for (const v of values) {
          children.push(() => this._writeElement(lines, v, name, property.type, depth + 1));
        }
      }
    }

    Object.assign(attrs, element.$attrs);

    const raw = element.$raw || [];

    if (!children.length && !raw.length) {
      lines.push(`${this._indent(depth)}<${tagName}${serializeAttrs(attrs)}/>`);
      return;
    }

    lines.push(`${this._indent(depth)}<${tagName}${serializeAttrs(attrs)}>`);

    children.forEach(writeChild => writeChild());
    raw.forEach(node => this._writeRaw(lines, node, depth + 1));

    lines.push(`${this._indent(depth)}</${tagName}>`);
  }

  _writeRaw(lines, node, depth) {
    const attrs = serializeAttrs(node.attrs);

    const elements = node.children.filter(c => typeof c !== 'string');
    const text = node.children.filter(c => typeof c === 'string').join('');

    if (!elements.length) {
      if (text.trim()) {
        lines.push(`${this._indent(depth)}<${node.name}${attrs}>${escapeBody(text)}</${node.name}>`);
      } else {
        lines.push(`${this._indent(depth)}<${node.name}${attrs}/>`);
      }

      return;
    }

    lines.push(`${this._indent(depth)}<${node.name}${attrs}>`);

    for (const child of elements) {
      this._writeRaw(lines, child, depth + 1);
    }

    lines.push(`${this._indent(depth)}</${node.name}>`);
  }
}


// helpers //////////

function namespaceDeclarations() {
  return Object.fromEntries(
    Object.entries(NAMESPACES)
      .filter(([ prefix ]) => prefix !== 'xsi')
      .map(([ prefix, uri ]) => [ `xmlns:${prefix}`, uri ])
  );
}

function serializeAttrs(attrs) {
  return Object.entries(attrs)
    .map(([ name, value ]) => ` ${name}="${escapeAttr(String(value))}"`)
    .join('');
}

function escapeAttr(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;')
    .replace(/\t/g, '&#9;');
}

function escapeBody(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
