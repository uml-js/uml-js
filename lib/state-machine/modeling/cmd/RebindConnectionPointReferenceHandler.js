import { getConnectionPointKind } from '../../util/ElementUtil.js';


/**
 * Makes a connection point reference refer to another entry or exit point of the
 * state machine: the one of the name it is given, or a new one, added next to the
 * point it referred to before.
 */
export default function RebindConnectionPointReferenceHandler() {}

RebindConnectionPointReferenceHandler.prototype.execute = function(context) {
  const { reference, point } = context;

  const bo = reference.businessObject;
  const property = getConnectionPointKind(bo) === 'entryPoint' ? 'entry' : 'exit';

  context.property = property;
  context.oldPoints = [ ...bo.get(property) ];

  const oldPoint = context.oldPoints[0];

  // a new point
  if (!point.$parent) {
    const points = oldPoint.$parent.get('connectionPoint');

    points.splice(points.indexOf(oldPoint) + 1, 0, point);
    point.$parent = oldPoint.$parent;

    context.added = true;
  }

  bo.set(property, [ point ]);

  return [ reference, ...reference.labels ];
};

RebindConnectionPointReferenceHandler.prototype.revert = function(context) {
  const { reference, point, property, oldPoints } = context;

  reference.businessObject.set(property, oldPoints);

  if (context.added) {
    const points = point.$parent.get('connectionPoint');

    points.splice(points.indexOf(point), 1);
    point.$parent = null;
  }

  return [ reference, ...reference.labels ];
};
