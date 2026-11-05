import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { isBorderNode } from '../../util/ElementUtil.js';

import { updateExternalLabel } from '../cmd/UpdateLabelHandler.js';


/**
 * Creates the external label of named pins and expansion nodes when they are created.
 */
export default function ExternalLabelBehavior(eventBus, modeling, textRenderer, umlFactory) {

  CommandInterceptor.call(this, eventBus);

  this.postExecuted('shape.create', function(event) {
    const { shape, hints = {} } = event.context;

    // pasted with its label
    if (hints.createElementsBehavior === false) {
      return;
    }

    if (isBorderNode(shape) && !shape.labels.length) {
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
