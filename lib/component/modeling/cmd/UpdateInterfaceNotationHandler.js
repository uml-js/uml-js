import { getDefaultSize } from '../../util/ElementUtil.js';

import { updateExternalLabel } from './UpdateLabelHandler.js';


/**
 * Switches an interface between rectangle and ball (lollipop) notation,
 * stored as `isIcon` of its UML DI shape.
 */
export default function UpdateInterfaceNotationHandler(modeling, textRenderer, umlFactory) {
  this._modeling = modeling;
  this._textRenderer = textRenderer;
  this._umlFactory = umlFactory;
}

UpdateInterfaceNotationHandler.$inject = [
  'modeling',
  'textRenderer',
  'umlFactory'
];

UpdateInterfaceNotationHandler.prototype.execute = function(context) {
  const { element, ball } = context;

  context.oldIsIcon = element.di.isIcon;

  element.di.set('isIcon', ball || undefined);

  return getChanged(element);
};

UpdateInterfaceNotationHandler.prototype.revert = function(context) {
  const { element, oldIsIcon } = context;

  element.di.set('isIcon', oldIsIcon);

  return getChanged(element);
};

UpdateInterfaceNotationHandler.prototype.postExecute = function(context) {
  const element = context.element;

  const size = getDefaultSize(element.businessObject, element.di);

  if (size.width !== element.width || size.height !== element.height) {
    this._modeling.resizeShape(element, {
      x: Math.round(element.x + (element.width - size.width) / 2),
      y: Math.round(element.y + (element.height - size.height) / 2),
      ...size
    });
  }

  updateExternalLabel(element, this._modeling, this._textRenderer, this._umlFactory);
};


// connections render differently when connected to a ball
function getChanged(element) {
  return [ element, ...element.incoming, ...element.outgoing ];
}
