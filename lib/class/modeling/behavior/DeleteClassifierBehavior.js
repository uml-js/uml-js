import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { isClassifier } from '../../util/ElementUtil.js';


/**
 * References to deleted classifiers, e.g. attribute types,
 * are kept as primitive types of the same name.
 */
export default function DeleteClassifierBehavior(eventBus, commandStack, canvas) {

  CommandInterceptor.call(this, eventBus);

  this.postExecuted('shape.delete', function(event) {
    const shape = event.context.shape;

    if (isClassifier(shape)) {
      commandStack.execute('type.unreference', {
        classifier: shape.businessObject,
        pkg: canvas.getRootElement().businessObject
      });
    }
  });
}

inherits(DeleteClassifierBehavior, CommandInterceptor);

DeleteClassifierBehavior.$inject = [
  'eventBus',
  'commandStack',
  'canvas'
];
