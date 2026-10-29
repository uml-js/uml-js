import { getReferences, getShapes } from '../../util/ElementUtil.js';

import { getRoot } from '../../../core/util/ModelUtil.js';


/**
 * Makes the shape of an entry or exit point show another point of the same owner:
 * one of the same name, or a new one when the shape gets a name of its own. The
 * transitions drawn at the shape start or end at the point it shows then. The point
 * it showed before is removed if no other shape shows it, and the references to it
 * refer to the point the shape shows then.
 */
export default function RebindConnectionPointHandler() {}

RebindConnectionPointHandler.prototype.execute = function(context) {
  const { shape, point } = context;

  const oldPoint = context.oldPoint = shape.businessObject;
  const owner = oldPoint.$parent;
  const points = owner.get('connectionPoint');

  // a new point is added next to the one shown before
  context.added = !points.includes(point);

  if (context.added) {
    points.splice(points.indexOf(oldPoint) + 1, 0, point);
    point.$parent = owner;
  }

  setPoint(shape, point);

  context.transitions = [
    ...shape.incoming.filter(connection => connection.businessObject.target === oldPoint).map(connection => [ connection.businessObject, 'target' ]),
    ...shape.outgoing.filter(connection => connection.businessObject.source === oldPoint).map(connection => [ connection.businessObject, 'source' ])
  ];

  context.transitions.forEach(([ transition, end ]) => transition.set(end, point));

  // the point shown before is no longer shown
  context.removed = !getShapes(oldPoint, getRoot(shape)).length;

  if (context.removed) {
    context.references = getReferences(oldPoint).map(reference => {
      const property = reference.get('entry').includes(oldPoint) ? 'entry' : 'exit';
      const referred = reference.get(property);

      const index = referred.indexOf(oldPoint);

      referred.splice(index, 1, point);

      return [ reference, property, index ];
    });

    context.index = points.indexOf(oldPoint);

    points.splice(context.index, 1);
    oldPoint.$parent = null;
  }

  return getChanged(shape, point);
};

RebindConnectionPointHandler.prototype.revert = function(context) {
  const { shape, point, oldPoint } = context;

  const owner = point.$parent;
  const points = owner.get('connectionPoint');

  if (context.removed) {
    points.splice(context.index, 0, oldPoint);
    oldPoint.$parent = owner;

    context.references.forEach(([ reference, property, index ]) => {
      reference.get(property).splice(index, 1, oldPoint);
    });
  }

  context.transitions.forEach(([ transition, end ]) => transition.set(end, oldPoint));

  setPoint(shape, oldPoint);

  if (context.added) {
    points.splice(points.indexOf(point), 1);
    point.$parent = null;
  }

  return [ ...getChanged(shape, point), ...getChanged(shape, oldPoint) ];
};


function setPoint(shape, point) {
  for (const element of [ shape, ...shape.labels ]) {
    element.businessObject = point;

    if (element.di) {
      element.di.set('modelElement', [ point ]);
    }
  }
}

/**
 * The shape, the other shapes of the point and their labels, and the transitions at the shape.
 */
function getChanged(shape, point) {
  const shapes = shape.parent ? getShapes(point, getRoot(shape)) : [ shape ];

  return [
    ...shapes.flatMap(element => [ element, ...element.labels ]),
    ...shape.incoming,
    ...shape.outgoing
  ];
}
