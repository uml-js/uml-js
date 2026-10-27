import { isPackage, showsContents } from '../util/ElementUtil.js';


/**
 * Redraws packages with contents once imported: their name moves into the
 * tab, which is unknown while they are drawn, before their contents.
 */
export default function PackageContents(eventBus, elementRegistry, graphicsFactory) {

  eventBus.on('import.render.complete', function() {
    elementRegistry
      .filter(element => isPackage(element) && showsContents(element))
      .forEach(element => graphicsFactory.update('shape', element, elementRegistry.getGraphics(element)));
  });
}

PackageContents.$inject = [
  'eventBus',
  'elementRegistry',
  'graphicsFactory'
];
