import { isLabel } from '../../../core/util/ModelUtil.js';

import { getActionKind, getDefaultSize } from '../../util/ElementUtil.js';

import { getBounds, layoutConnections, makeSpace } from '../../../core/util/ContentMoveUtil.js';

export const ACTION_TYPES = {
  opaque: 'uml:OpaqueAction',
  call: 'uml:CallBehaviorAction',
  structured: 'uml:StructuredActivityNode'
};


/**
 * Changes the kind of an action where no content is carried over: between
 * actions and call behavior actions, into an empty structured activity node,
 * or from a structured activity node into an action, removing its content.
 *
 * The action is resized to the size of its new kind.
 */
export default function ChangeActionKindHandler(modeling, injector) {
  this._modeling = modeling;
  this._injector = injector;
}

ChangeActionKindHandler.$inject = [ 'modeling', 'injector' ];

ChangeActionKindHandler.prototype.preExecute = function(context) {
  const { element, kind } = context;

  // the nodes and edges inside a structured activity node
  if (getActionKind(element) === 'structured') {
    const children = element.children.filter(child => !isLabel(child));

    if (children.length) {
      this._modeling.removeElements(children);
    }
  }

  this._modeling.changeNodeType(element, ACTION_TYPES[kind]);
};

ChangeActionKindHandler.prototype.execute = function() {};

ChangeActionKindHandler.prototype.revert = function() {};

ChangeActionKindHandler.prototype.postExecute = function(context) {
  const { element } = context;

  const size = getDefaultSize(element.businessObject);

  if (size.width === element.width && size.height === element.height) {
    return;
  }

  // grow to the bottom right, making space, shrink towards the center
  const grow = size.width > element.width;

  const oldBounds = getBounds(element);

  this._modeling.resizeShape(element, grow ? {
    x: element.x,
    y: element.y,
    ...size
  } : {
    x: Math.round(element.x + (element.width - size.width) / 2),
    y: Math.round(element.y + (element.height - size.height) / 2),
    ...size
  });

  if (grow) {
    makeSpace(element, oldBounds, this._injector);
  }

  layoutConnections(element, this._modeling);
};
