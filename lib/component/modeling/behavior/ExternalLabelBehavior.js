import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { hasExternalLabel } from '../../util/ElementUtil.js';

import { updateExternalLabel } from '../cmd/UpdateLabelHandler.js';


/**
 * Creates the external label of named ports and balls when they are created.
 */
export default function ExternalLabelBehavior(eventBus, modeling, textRenderer, umlFactory) {

  CommandInterceptor.call(this, eventBus);

  this.postExecuted('shape.create', function(event) {
    const shape = event.context.shape;

    if (hasExternalLabel(shape) && !shape.labels.length) {
      updateExternalLabel(shape, modeling, textRenderer, umlFactory);
    }
  });
}

inherits(ExternalLabelBehavior, CommandInterceptor);

ExternalLabelBehavior.$inject = [
  'eventBus',
  'modeling',
  'textRenderer',
  'umlFactory'
];
