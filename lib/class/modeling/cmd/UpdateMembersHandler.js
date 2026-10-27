import { is } from '../../../core/util/ModelUtil.js';

import { replaceReferences, revertReferences, visit } from '../../../core/util/ReferenceUtil.js';

import {
  parseAttribute,
  parseOperation
} from '../../util/MemberUtil.js';

import { getAttributes, getContentHeight, getContentWidth } from '../../util/CompartmentUtil.js';

const TYPES = [ 'uml:Class', 'uml:Interface', 'uml:DataType' ];


/**
 * Updates a compartment of a classifier from its text, one member per line:
 * the name, the attributes, the operations or the literals.
 *
 * Members are re-created from the text, keeping the IDs of members with the
 * same name. Types are looked up by name in the package of the diagram;
 * unknown types are created as primitive types, primitive types no longer
 * used after the update are removed. A classifier named like a primitive
 * type replaces it.
 *
 * The classifier box is resized to show all members, each on one line.
 */
export default function UpdateMembersHandler(umlFactory, modeling, canvas, textRenderer) {
  this._umlFactory = umlFactory;
  this._modeling = modeling;
  this._canvas = canvas;
  this._textRenderer = textRenderer;
}

UpdateMembersHandler.$inject = [ 'umlFactory', 'modeling', 'canvas', 'textRenderer' ];

UpdateMembersHandler.prototype.execute = function(context) {
  const { element, compartment, text } = context;

  const bo = element.businessObject;
  const pkg = context.pkg = this._canvas.getRootElement().businessObject;

  context.oldPackaged = [ ...pkg.get('packagedElement') ];

  if (compartment === 'name') {
    context.oldName = bo.name;

    bo.set('name', text.trim() || undefined);

    // the classifier takes the place of a primitive type of the same name, e.g. used before the classifier existed
    const primitive = bo.name && pkg.get('packagedElement').find(packaged => is(packaged, 'uml:PrimitiveType') && packaged.name === bo.name);

    if (primitive) {
      context.references = replaceReferences(pkg, primitive, bo);

      pkg.set('packagedElement', pkg.get('packagedElement').filter(packaged => packaged !== primitive));
    }

    return [ element ];
  }

  const property = getProperty(compartment);

  context.oldMembers = [ ...bo.get(property) ];

  const usedBefore = getUsedTypes(pkg);

  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

  const members = compartment === 'attributes'
    ? this._createAttributes(bo, lines)
    : compartment === 'operations'
      ? this._createOperations(bo, lines)
      : this._createLiterals(bo, lines);

  // association ends owned by the classifier are kept
  const kept = compartment === 'attributes' ? bo.get('ownedAttribute').filter(attribute => attribute.association) : [];

  bo.set(property, [ ...kept, ...members ]);

  members.forEach(member => {
    member.$parent = bo;
  });

  // remove primitive types this update stopped using
  const usedAfter = getUsedTypes(pkg);

  pkg.set('packagedElement', pkg.get('packagedElement').filter(packaged => {
    return !is(packaged, 'uml:PrimitiveType') || usedAfter.has(packaged) || !usedBefore.has(packaged);
  }));

  return [ element ];
};

UpdateMembersHandler.prototype.revert = function(context) {
  const { element, compartment, pkg } = context;

  const bo = element.businessObject;

  if (compartment === 'name') {
    bo.set('name', context.oldName);

    if (context.references) {
      revertReferences(context.references);
    }
  } else {
    bo.set(getProperty(compartment), context.oldMembers);
  }

  pkg.set('packagedElement', context.oldPackaged);

  return [ element ];
};

UpdateMembersHandler.prototype.postExecute = function(context) {
  const { element } = context;

  const bo = element.businessObject;

  // all members shown, each on one line
  const height = getContentHeight(bo);
  const width = Math.max(element.width, getContentWidth(bo, this._textRenderer));

  if (height !== element.height || width !== element.width) {
    this._modeling.resizeShape(element, { x: element.x, y: element.y, width, height });
  }
};

UpdateMembersHandler.prototype._createAttributes = function(bo, lines) {
  const reuse = reuseIds(getAttributes(bo));

  return lines.map(line => {
    const data = parseAttribute(line) || { name: line };

    const attribute = this._umlFactory.create('uml:Property', { id: reuse(data.name), name: data.name });

    if (data.visibility) {
      attribute.set('visibility', data.visibility);
    }

    if (data.isDerived) {
      attribute.set('isDerived', true);
    }

    if (data.type) {
      attribute.set('type', this._getType(data.type));
    }

    this._setMultiplicity(attribute, data.multiplicity);

    if (data.defaultValue) {
      attribute.set('defaultValue', this._createChild(attribute, 'uml:OpaqueExpression', { body: [ data.defaultValue ] }));
    }

    return attribute;
  });
};

UpdateMembersHandler.prototype._createOperations = function(bo, lines) {
  const reuse = reuseIds(bo.get('ownedOperation'));

  return lines.map(line => {
    const data = parseOperation(line) || { name: line.replace(/\(.*$/, ''), parameters: [] };

    const operation = this._umlFactory.create('uml:Operation', { id: reuse(data.name), name: data.name });

    if (data.visibility) {
      operation.set('visibility', data.visibility);
    }

    const parameters = data.parameters.map(parameterData => {
      const parameter = this._createChild(operation, 'uml:Parameter', { name: parameterData.name });

      if (parameterData.direction) {
        parameter.set('direction', parameterData.direction);
      }

      if (parameterData.type) {
        parameter.set('type', this._getType(parameterData.type));
      }

      this._setMultiplicity(parameter, parameterData.multiplicity);

      return parameter;
    });

    if (data.type) {
      const result = this._createChild(operation, 'uml:Parameter', { direction: 'return' });

      result.set('type', this._getType(data.type));

      parameters.push(result);
    }

    operation.set('ownedParameter', parameters);

    return operation;
  });
};

UpdateMembersHandler.prototype._createLiterals = function(bo, lines) {
  const reuse = reuseIds(bo.get('ownedLiteral'));

  return lines.map(name => this._umlFactory.create('uml:EnumerationLiteral', { id: reuse(name), name }));
};

UpdateMembersHandler.prototype._setMultiplicity = function(element, multiplicity) {
  if (!multiplicity) {
    return;
  }

  element.set('lowerValue', this._createChild(element, 'uml:LiteralInteger', { value: multiplicity.lower }));
  element.set('upperValue', this._createChild(element, 'uml:LiteralUnlimitedNatural', { value: String(multiplicity.upper) }));
};

UpdateMembersHandler.prototype._createChild = function(parent, type, attrs) {
  const child = this._umlFactory.create(type, attrs);

  child.$parent = parent;

  return child;
};

/**
 * @param {string} name
 *
 * @return {ModdleElement} the type of the given name in the package, created as a primitive type if missing
 */
UpdateMembersHandler.prototype._getType = function(name) {
  const pkg = this._canvas.getRootElement().businessObject;

  // classifiers before primitive types of the same name
  const candidates = pkg.get('packagedElement').filter(element => TYPES.some(type => is(element, type)) && element.name === name);
  const existing = candidates.find(element => !is(element, 'uml:PrimitiveType')) || candidates[0];

  if (existing) {
    return existing;
  }

  const type = this._umlFactory.create('uml:PrimitiveType', { name });

  type.$parent = pkg;
  pkg.get('packagedElement').push(type);

  return type;
};


// helpers //////////

function getProperty(compartment) {
  return {
    attributes: 'ownedAttribute',
    operations: 'ownedOperation',
    literals: 'ownedLiteral'
  }[compartment];
}

/**
 * @return {(name: string) => string|undefined} the ID of an existing member of the given name, each used once
 */
function reuseIds(members) {
  const available = [ ...members ];

  return function(name) {
    const index = available.findIndex(member => member.name === name);

    return index === -1 ? undefined : available.splice(index, 1)[0].id;
  };
}

/**
 * @return {Set<ModdleElement>} the types of properties and parameters in the package
 */
function getUsedTypes(pkg) {
  const used = new Set();

  visit(pkg, element => {
    if ((is(element, 'uml:Property') || is(element, 'uml:Parameter')) && element.type) {
      used.add(element.type);
    }
  });

  return used;
}
