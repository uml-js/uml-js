import { getDefaultSize } from '../util/ElementUtil.js';

import { VERTEX_TYPES, getVertexType } from '../util/VertexTypes.js';

import { isLabel } from '../../core/util/ModelUtil.js';


/**
 * Replaces vertices with vertices of another type of the same group, e.g. a
 * choice with a junction. Transitions are kept where the modeling rules allow it.
 */
export default function StateMachineReplace(replace, umlFactory) {
  this._replace = replace;
  this._umlFactory = umlFactory;
}

StateMachineReplace.$inject = [
  'replace',
  'umlFactory'
];

/**
 * @param {Shape} element
 *
 * @return {Object[]} vertex types the element can be replaced with
 */
StateMachineReplace.prototype.getReplaceOptions = function(element) {
  const current = getVertexType(element);

  if (!current || !current.replaceGroup) {
    return [];
  }

  // only states can own sub-states
  const hasChildren = element.children.some(child => !isLabel(child));

  if (hasChildren) {
    return [];
  }

  return VERTEX_TYPES.filter(vertexType => {
    return vertexType !== current && vertexType.replaceGroup === current.replaceGroup;
  });
};

/**
 * @param {Shape} element
 * @param {Object} vertexType one of VERTEX_TYPES
 *
 * @return {Shape} the new element
 */
StateMachineReplace.prototype.replaceElement = function(element, vertexType) {
  const oldBo = element.businessObject;

  const bo = this._umlFactory.create(vertexType.type, vertexType.kind ? { kind: vertexType.kind } : {});

  const name = oldBo.name || vertexType.name;

  if (name) {
    bo.name = name;
  }

  const size = getDefaultSize(bo);

  return this._replace.replaceElement(element, {
    type: bo.$type,
    businessObject: bo,
    ...size
  });
};

