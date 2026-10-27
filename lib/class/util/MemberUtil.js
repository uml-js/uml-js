/**
 * Text notation of the members of classifiers and of association ends
 * (UML 2.5.1, 9.5.4 Property, 9.6.4 Operation, 11.5.4 Association):
 *
 *   attribute:        [visibility] [/]name [: Type] [[multiplicity]] [= default]
 *   operation:        [visibility] name([parameter, ...]) [: Type]
 *   parameter:        [direction] name [: Type] [[multiplicity]]
 *   association end:  [visibility] [name] [multiplicity]
 *
 * Parsing yields plain objects, independent of the model.
 */

const VISIBILITIES = {
  '+': 'public',
  '-': 'private',
  '#': 'protected',
  '~': 'package'
};

const VISIBILITY_SYMBOLS = Object.fromEntries(Object.entries(VISIBILITIES).map(([ symbol, name ]) => [ name, symbol ]));

const MULTIPLICITY = /^(?:(\d+)\.\.)?(\d+|\*)$/;

const ATTRIBUTE = /^\s*([+\-#~])?\s*(\/)?\s*([^:=[\]]*?)\s*(?::\s*([^=[\]]*?))?\s*(?:\[\s*([^\]]*?)\s*\])?\s*(?:=\s*(.*?))?\s*$/;

const OPERATION = /^\s*([+\-#~])?\s*([^(]*?)\s*\((.*)\)\s*(?::\s*(.*?))?\s*$/;

const PARAMETER = /^\s*(?:(in|out|inout)\s+)?([^:[\]]*?)\s*(?::\s*([^[\]]*?))?\s*(?:\[\s*([^\]]*?)\s*\])?\s*$/;


// multiplicity //////////

/**
 * @param {string} text e.g. `0..*`, `1`, `*`
 *
 * @return {{ lower: number, upper: number|'*' }|null}
 */
export function parseMultiplicity(text) {
  const match = MULTIPLICITY.exec((text || '').trim());

  if (!match) {
    return null;
  }

  const upper = match[2] === '*' ? '*' : parseInt(match[2], 10);
  const lower = match[1] !== undefined ? parseInt(match[1], 10) : (upper === '*' ? 0 : upper);

  return { lower, upper };
}

/**
 * @param {{ lower: number, upper: number|'*' }|null} multiplicity
 *
 * @return {string}
 */
export function formatMultiplicity(multiplicity) {
  if (!multiplicity) {
    return '';
  }

  const { lower, upper } = multiplicity;

  if (String(lower) === String(upper)) {
    return String(upper);
  }

  if (lower === 0 && upper === '*') {
    return '*';
  }

  return `${ lower }..${ upper }`;
}


// attributes //////////

/**
 * @param {string} text
 *
 * @return {Object|null} { visibility, isDerived, name, type, multiplicity, defaultValue }
 */
export function parseAttribute(text) {
  const match = ATTRIBUTE.exec(text);

  if (!match || !match[3]) {
    return null;
  }

  return {
    visibility: VISIBILITIES[match[1]],
    isDerived: !!match[2],
    name: match[3],
    type: match[4] || undefined,
    multiplicity: match[5] ? parseMultiplicity(match[5]) : null,
    defaultValue: match[6] || undefined
  };
}

/**
 * @param {Object} attribute as returned by `parseAttribute`
 *
 * @return {string}
 */
export function formatAttribute(attribute) {
  const { visibility, isDerived, name, type, multiplicity, defaultValue } = attribute;

  let text = `${ formatVisibility(visibility) }${ isDerived ? '/' : '' }${ name || '' }`;

  if (type) {
    text += `: ${ type }`;
  }

  if (multiplicity) {
    text += ` [${ formatMultiplicity(multiplicity) }]`;
  }

  if (defaultValue) {
    text += ` = ${ defaultValue }`;
  }

  return text;
}


// operations //////////

/**
 * @param {string} text
 *
 * @return {Object|null} { visibility, name, parameters, type }
 */
export function parseOperation(text) {
  const match = OPERATION.exec(text);

  if (!match || !match[2]) {
    return null;
  }

  const parameters = splitParameters(match[3]).map(parseParameter);

  if (parameters.includes(null)) {
    return null;
  }

  return {
    visibility: VISIBILITIES[match[1]],
    name: match[2],
    parameters,
    type: match[4] || undefined
  };
}

/**
 * @param {Object} operation as returned by `parseOperation`
 *
 * @return {string}
 */
export function formatOperation(operation) {
  const { visibility, name, parameters, type } = operation;

  return `${ formatVisibility(visibility) }${ name || '' }(${ parameters.map(formatParameter).join(', ') })${ type ? `: ${ type }` : '' }`;
}

function splitParameters(text) {
  const parameters = [];

  let depth = 0, current = '';

  for (const char of text) {
    if (char === ',' && !depth) {
      parameters.push(current);
      current = '';

      continue;
    }

    if (char === '[' || char === '(' || char === '<') {
      depth++;
    } else if (char === ']' || char === ')' || char === '>') {
      depth--;
    }

    current += char;
  }

  if (current.trim() || parameters.length) {
    parameters.push(current);
  }

  return parameters;
}

function parseParameter(text) {
  const match = PARAMETER.exec(text);

  if (!match || !match[2]) {
    return null;
  }

  return {
    direction: match[1] || undefined,
    name: match[2],
    type: match[3] || undefined,
    multiplicity: match[4] ? parseMultiplicity(match[4]) : null
  };
}

function formatParameter(parameter) {
  const { direction, name, type, multiplicity } = parameter;

  let text = `${ direction && direction !== 'in' ? direction + ' ' : '' }${ name }`;

  if (type) {
    text += `: ${ type }`;
  }

  if (multiplicity) {
    text += ` [${ formatMultiplicity(multiplicity) }]`;
  }

  return text;
}


// association ends //////////

/**
 * @param {string} text e.g. `+items 0..*`, `owner`, `1`
 *
 * @return {{ visibility, name, multiplicity }}
 */
export function parseEnd(text) {
  let rest = (text || '').trim();

  let visibility;

  if (VISIBILITIES[rest[0]] && !MULTIPLICITY.test(rest)) {
    visibility = VISIBILITIES[rest[0]];
    rest = rest.slice(1).trim();
  }

  const tokens = rest.split(/\s+/).filter(Boolean);

  let multiplicity = null;

  if (tokens.length && parseMultiplicity(tokens[tokens.length - 1])) {
    multiplicity = parseMultiplicity(tokens.pop());
  }

  return {
    visibility,
    name: tokens.join(' ') || undefined,
    multiplicity
  };
}

/**
 * @param {{ visibility, name, multiplicity }} end
 *
 * @return {string}
 */
export function formatEnd(end) {
  return [
    end.name ? formatVisibility(end.visibility) + end.name : '',
    formatMultiplicity(end.multiplicity)
  ].filter(Boolean).join(' ');
}


// helpers //////////

function formatVisibility(visibility) {
  return VISIBILITY_SYMBOLS[visibility] ? VISIBILITY_SYMBOLS[visibility] + ' ' : '';
}
