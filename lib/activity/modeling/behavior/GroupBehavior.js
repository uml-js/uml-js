import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { isGroup, isInterruptibleRegion } from '../../util/ElementUtil.js';

const HIGH_PRIORITY = 1500;


/**
 * Partitions and interruptible regions are drawn on the activity, also when dropped
 * onto other nodes. An edge interrupting a region no longer does once the region
 * is deleted.
 *
 * Which nodes and edges they group follows from where they are drawn, see
 * ActivityUpdater#updateGroups.
 */
export default function GroupBehavior(eventBus, modeling, canvas, elementRegistry) {

  CommandInterceptor.call(this, eventBus);

  eventBus.on([ 'create.end', 'shape.move.end' ], HIGH_PRIORITY, function(event) {
    const context = event.context;

    if (isGroup(context.shape) && context.target && context.target.parent) {
      context.target = canvas.getRootElement();
    }
  });

  this.preExecute('shape.create', HIGH_PRIORITY, function(event) {
    const context = event.context;

    if (isGroup(context.shape) && context.parent && context.parent.parent) {
      context.parent = canvas.getRootElement();
    }
  });

  this.preExecute('shape.delete', function(event) {
    const shape = event.context.shape;

    if (!isInterruptibleRegion(shape)) {
      return;
    }

    const region = shape.businessObject;

    elementRegistry
      .filter(element => element.waypoints && element.businessObject.interrupts === region)
      .forEach(edge => modeling.updateProperties(edge, { interrupts: undefined }));
  });
}

inherits(GroupBehavior, CommandInterceptor);

GroupBehavior.$inject = [
  'eventBus',
  'modeling',
  'canvas',
  'elementRegistry'
];
