import { parseEnd, formatEnd } from '../../util/MemberUtil.js';

import { getEndData } from '../../util/CompartmentUtil.js';

import { getEndLabelBounds } from '../../util/EndLabelUtil.js';

const NULL_DIMENSIONS = { width: 0, height: 0 };


/**
 * Updates the name, visibility and multiplicity of an association end from
 * its text (see MemberUtil#parseEnd). The label of the end is created,
 * resized or removed accordingly.
 */
export default function UpdateEndHandler(modeling, textRenderer, umlFactory) {
  this._modeling = modeling;
  this._textRenderer = textRenderer;
  this._umlFactory = umlFactory;
}

UpdateEndHandler.$inject = [
  'modeling',
  'textRenderer',
  'umlFactory'
];

UpdateEndHandler.prototype.execute = function(context) {
  const { connection, index, text } = context;

  const end = context.end = connection.businessObject.get('memberEnd')[index];

  context.old = {
    name: end.name,
    visibility: end.visibility,
    lowerValue: end.lowerValue,
    upperValue: end.upperValue
  };

  const data = parseEnd(text);

  end.set('name', data.name);
  end.set('visibility', data.visibility);

  if (data.multiplicity) {
    end.set('lowerValue', this._createChild(end, 'uml:LiteralInteger', { value: data.multiplicity.lower }));
    end.set('upperValue', this._createChild(end, 'uml:LiteralUnlimitedNatural', { value: String(data.multiplicity.upper) }));
  } else {
    end.set('lowerValue', undefined);
    end.set('upperValue', undefined);
  }

  return [ connection, ...connection.labels ];
};

UpdateEndHandler.prototype.revert = function(context) {
  const { connection, end, old } = context;

  for (const name of Object.keys(old)) {
    end.set(name, old[name]);
  }

  return [ connection, ...connection.labels ];
};

UpdateEndHandler.prototype.postExecute = function(context) {
  const { connection, index, end } = context;

  const modeling = this._modeling;

  const text = formatEnd(getEndData(end));
  const label = connection.labels.find(label => label.businessObject === end);

  if (!text) {
    if (label) {
      modeling.removeShape(label);
    }

    return;
  }

  const size = this._textRenderer.getExternalLabelBounds({ x: 0, y: 0, width: 0, height: 0 }, text);

  if (!label) {
    const bounds = getEndLabelBounds(connection.waypoints, index, size);

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

  const newBounds = this._textRenderer.getExternalLabelBounds(label, text);

  if (newBounds.width !== label.width || newBounds.height !== label.height) {
    modeling.resizeShape(label, newBounds, NULL_DIMENSIONS);
  }
};

UpdateEndHandler.prototype._createChild = function(parent, type, attrs) {
  const child = this._umlFactory.create(type, attrs);

  child.$parent = parent;

  return child;
};
