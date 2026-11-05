import { parseEnd, formatEnd, parseQualifiers } from '../../util/MemberUtil.js';

import { getEndData } from '../../util/CompartmentUtil.js';

import { getEnd, getEndLabelBounds } from '../../util/EndLabelUtil.js';

import { getQualifierExtent } from '../../util/QualifierUtil.js';

import { getType, getUsedTypes, removeUnusedPrimitiveTypes } from '../../util/TypeUtil.js';

const NULL_DIMENSIONS = { width: 0, height: 0 };


/**
 * Updates the qualifiers, name, visibility and multiplicity of an association
 * end from its text, e.g. `[node: Node] 0..1` (see MemberUtil#parseQualifiers and
 * MemberUtil#parseEnd). The types of qualifiers are looked up like those of
 * attributes (see TypeUtil#getType). The label of the end is created, resized
 * or removed accordingly, and moved along the line when the box of the
 * qualifiers changes its length.
 */
export default function UpdateEndHandler(modeling, textRenderer, umlFactory, canvas) {
  this._modeling = modeling;
  this._textRenderer = textRenderer;
  this._umlFactory = umlFactory;
  this._canvas = canvas;
}

UpdateEndHandler.$inject = [
  'modeling',
  'textRenderer',
  'umlFactory',
  'canvas'
];

UpdateEndHandler.prototype.execute = function(context) {
  const { connection, index, text } = context;

  const end = context.end = connection.businessObject.get('memberEnd')[index];
  const pkg = context.pkg = this._canvas.getRootElement().businessObject;

  context.old = {
    name: end.name,
    visibility: end.visibility,
    lowerValue: end.lowerValue,
    upperValue: end.upperValue,
    qualifier: [ ...end.get('qualifier') ]
  };

  context.oldPackaged = [ ...pkg.get('packagedElement') ];
  context.oldExtent = getQualifierExtent(end, connection.waypoints, index, this._textRenderer);

  // computed once, so re-doing re-uses the same model elements
  if (!context.new) {
    const { qualifiers, rest } = parseQualifiers(text);
    const data = parseEnd(rest);

    const usedBefore = getUsedTypes(pkg);

    context.new = {
      name: data.name,
      visibility: data.visibility,
      lowerValue: data.multiplicity ? this._createChild(end, 'uml:LiteralInteger', { value: data.multiplicity.lower }) : undefined,
      upperValue: data.multiplicity ? this._createChild(end, 'uml:LiteralUnlimitedNatural', { value: String(data.multiplicity.upper) }) : undefined,
      qualifier: this._createQualifiers(end, qualifiers, pkg)
    };

    end.set('qualifier', context.new.qualifier);

    removeUnusedPrimitiveTypes(pkg, usedBefore);

    context.newPackaged = [ ...pkg.get('packagedElement') ];
  }

  for (const name of Object.keys(context.new)) {
    end.set(name, context.new[name]);
  }

  pkg.set('packagedElement', context.newPackaged);
  context.newPackaged.forEach(packaged => packaged.$parent = pkg);

  return [ connection, ...connection.labels ];
};

UpdateEndHandler.prototype.revert = function(context) {
  const { connection, end, old, pkg } = context;

  for (const name of Object.keys(old)) {
    end.set(name, old[name]);
  }

  pkg.set('packagedElement', context.oldPackaged);

  return [ connection, ...connection.labels ];
};

UpdateEndHandler.prototype.postExecute = function(context) {
  const { connection, index, end, oldExtent } = context;

  const modeling = this._modeling;

  const text = formatEnd(getEndData(end));
  const label = connection.labels.find(label => label.businessObject === end);

  const extent = getQualifierExtent(end, connection.waypoints, index, this._textRenderer);

  if (!text) {
    if (label) {
      modeling.removeShape(label);
    }

    return;
  }

  const size = this._textRenderer.getExternalLabelBounds({ x: 0, y: 0, width: 0, height: 0 }, text);

  if (!label) {
    const bounds = getEndLabelBounds(connection.waypoints, index, size, extent);

    modeling.createLabel(connection, {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    }, {
      id: end.id + '_label',
      type: end.$type,
      businessObject: end,
      di: this._umlFactory.createDiLabel(end),
      width: bounds.width,
      height: bounds.height
    });

    return;
  }

  // beyond the box of the qualifiers, which may have changed its length
  if (extent !== oldExtent) {
    const { direction } = getEnd(connection.waypoints, index);

    modeling.moveShape(label, {
      x: Math.round(direction.x * (extent - oldExtent)),
      y: Math.round(direction.y * (extent - oldExtent))
    });
  }

  const newBounds = this._textRenderer.getExternalLabelBounds(label, text);

  if (newBounds.width !== label.width || newBounds.height !== label.height) {
    modeling.resizeShape(label, newBounds, NULL_DIMENSIONS);
  }
};

/**
 * @return {Array<ModdleElement>} the qualifiers of an end, keeping the IDs of those of the same name
 */
UpdateEndHandler.prototype._createQualifiers = function(end, qualifiers, pkg) {
  const available = [ ...end.get('qualifier') ];

  return qualifiers.map(({ name, type }) => {
    const index = available.findIndex(qualifier => qualifier.name === name);
    const id = index === -1 ? undefined : available.splice(index, 1)[0].id;

    const qualifier = this._umlFactory.create('uml:Property', { id, name });

    if (type) {
      qualifier.set('type', getType(pkg, type, this._umlFactory));
    }

    qualifier.$parent = end;

    return qualifier;
  });
};

UpdateEndHandler.prototype._createChild = function(parent, type, attrs) {
  const child = this._umlFactory.create(type, attrs);

  child.$parent = parent;

  return child;
};
