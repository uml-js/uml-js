import { is } from '../../core/util/ModelUtil.js';

import { getKeyword } from './ElementUtil.js';

import {
  formatAttribute,
  formatOperation
} from './MemberUtil.js';

export const LINE_HEIGHT = 16;
export const PADDING = 6;

// left of members, around names
export const PADDING_X = 8;


/**
 * The compartments of a classifier box: the name (with keyword), then
 * attributes and operations, for enumerations the literals instead.
 *
 * @param {ModdleElement} bo
 *
 * @return {Array<{ id: string, lines: string[], height: number }>}
 */
export function getCompartments(bo) {
  const keyword = getKeyword(bo);

  const nameLines = [ ...(keyword ? [ `«${ keyword }»` ] : []), bo.name || '' ];

  const compartments = [
    { id: 'name', lines: nameLines }
  ];

  if (is(bo, 'uml:Enumeration')) {
    compartments.push({ id: 'literals', lines: bo.get('ownedLiteral').map(literal => literal.name || '') });
  } else {
    compartments.push({ id: 'attributes', lines: getAttributes(bo).map(attribute => formatAttribute(getAttributeData(attribute))) });
    compartments.push({ id: 'operations', lines: bo.get('ownedOperation').map(operation => formatOperation(getOperationData(operation))) });
  }

  let y = 0;

  return compartments.map(compartment => {
    const height = PADDING * 2 + compartment.lines.length * LINE_HEIGHT;
    const result = { ...compartment, y, height };

    y += height;

    return result;
  });
}

/**
 * @param {ModdleElement} bo
 *
 * @return {number} the height of a classifier box showing all members
 */
export function getContentHeight(bo) {
  return getCompartments(bo).reduce((height, compartment) => height + compartment.height, 0);
}

/**
 * @param {ModdleElement} bo
 * @param {TextRenderer} textRenderer
 *
 * @return {number} the width of a classifier box showing all members on one line each
 */
export function getContentWidth(bo, textRenderer) {
  let width = 0;

  for (const compartment of getCompartments(bo)) {
    compartment.lines.forEach((line, index) => {
      const isName = compartment.id === 'name' && index === compartment.lines.length - 1;

      width = Math.max(width, textRenderer.getTextWidth(line, isName ? { fontWeight: 'bold' } : {}) + 2 * PADDING_X);
    });
  }

  return width;
}

/**
 * @param {ModdleElement} bo
 * @param {number} y relative to the box
 *
 * @return {string} the ID of the compartment at the given position
 */
export function getCompartmentAt(bo, y) {
  const compartments = getCompartments(bo);

  const compartment = compartments.find(c => y >= c.y && y < c.y + c.height);

  return (compartment || compartments[compartments.length - 1]).id;
}

/**
 * Attributes shown in the attributes compartment: owned attributes
 * which are not ends of associations (those are shown at the line).
 */
export function getAttributes(bo) {
  return bo.get('ownedAttribute').filter(attribute => !attribute.association);
}


// model to notation //////////

export function getAttributeData(property) {
  return {
    visibility: property.visibility,
    isDerived: !!property.isDerived,
    name: property.name,
    type: property.type && property.type.name,
    multiplicity: getMultiplicity(property),
    defaultValue: getValueText(property.defaultValue)
  };
}

export function getOperationData(operation) {
  const parameters = operation.get('ownedParameter');
  const result = parameters.find(parameter => parameter.direction === 'return');

  return {
    visibility: operation.visibility,
    name: operation.name,
    parameters: parameters.filter(parameter => parameter !== result).map(parameter => ({
      direction: parameter.direction,
      name: parameter.name,
      type: parameter.type && parameter.type.name,
      multiplicity: getMultiplicity(parameter)
    })),
    type: result && result.type && result.type.name
  };
}

export function getEndData(property) {
  return {
    visibility: property.visibility,
    name: property.name,
    multiplicity: getMultiplicity(property)
  };
}

/**
 * @return {{ lower: number, upper: number|'*' }|null}
 */
export function getMultiplicity(element) {
  const lower = element.lowerValue, upper = element.upperValue;

  if (!lower && !upper) {
    return null;
  }

  const upperValue = upper ? (upper.value === '*' || upper.value === -1 ? '*' : parseInt(upper.value, 10)) : 1;
  const lowerValue = lower ? (lower.value || 0) : upperValue === '*' ? 0 : upperValue;

  return { lower: lowerValue, upper: upperValue };
}

function getValueText(value) {
  if (!value) {
    return undefined;
  }

  if (is(value, 'uml:OpaqueExpression')) {
    return value.get('body')[0];
  }

  return value.value !== undefined ? String(value.value) : undefined;
}
