import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { isActor } from '../../util/ElementUtil.js';

import { updateActorLabel } from '../cmd/UpdateLabelHandler.js';


/**
 * Creates the label of named actors when they are created.
 */
export default function ActorLabelBehavior(eventBus, modeling, textRenderer, umlFactory) {

  CommandInterceptor.call(this, eventBus);

  this.postExecuted('shape.create', function(event) {
    const shape = event.context.shape;

    if (isActor(shape) && !shape.labels.length) {
      updateActorLabel(shape, modeling, textRenderer, umlFactory);
    }
  });
}

inherits(ActorLabelBehavior, CommandInterceptor);

ActorLabelBehavior.$inject = [
  'eventBus',
  'modeling',
  'textRenderer',
  'umlFactory'
];
