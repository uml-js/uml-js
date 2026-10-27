import { asTRBL, getMid } from 'diagram-js/lib/layout/LayoutUtil.js';

import {
  findFreePosition,
  generateGetNextPosition
} from 'diagram-js/lib/features/auto-place/AutoPlaceUtil.js';

const DISTANCE = 80;


/**
 * Places appended elements right of their source, avoiding overlaps
 * with other elements connected to the source.
 */
export default function UmlAutoPlace(eventBus) {

  eventBus.on('autoPlace', function(context) {
    const { shape, source } = context;

    const sourceTrbl = asTRBL(source);
    const sourceMid = getMid(source);

    const position = {
      x: sourceTrbl.right + DISTANCE + shape.width / 2,
      y: sourceMid.y
    };

    return findFreePosition(source, shape, position, generateGetNextPosition({
      y: {
        margin: 30,
        minDistance: 20
      }
    }));
  });
}

UmlAutoPlace.$inject = [ 'eventBus' ];
