import { is } from '../../core/util/ModelUtil.js';


/**
 * Pins and expansion nodes are attached to the node they are drawn on.
 */
export default function AttachImporter(eventBus) {

  eventBus.on('import.shape.attach', function(event) {
    return is(event.businessObject, 'uml:Pin') || is(event.businessObject, 'uml:ExpansionNode');
  });
}

AttachImporter.$inject = [ 'eventBus' ];
