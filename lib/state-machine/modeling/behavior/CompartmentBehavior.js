import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { getDiCompartments, isState } from '../../util/ElementUtil.js';


/**
 * States get a separator line once something is put into them: sub-states
 * are shown below the line. The line stays when the sub-states are removed,
 * also for states that show it for their sub-states only, e.g. imported.
 */
export default function CompartmentBehavior(eventBus, modeling) {

  CommandInterceptor.call(this, eventBus);

  function addCompartment(parent) {
    if (isState(parent) && parent.di && !getDiCompartments(parent.di).length) {
      modeling.updateBehavioursCompartment(parent, true);
    }
  }

  this.postExecuted('shape.create', function(event) {
    addCompartment(event.context.parent);
  });

  this.postExecuted('elements.move', function(event) {
    addCompartment(event.context.newParent);
  });

  this.postExecuted([ 'shape.move', 'shape.delete' ], function(event) {
    const { context } = event;

    if (context.oldParent !== context.shape.parent) {
      addCompartment(context.oldParent);
    }
  });
}

inherits(CompartmentBehavior, CommandInterceptor);

CompartmentBehavior.$inject = [
  'eventBus',
  'modeling'
];
