/**
 * Removes an entry or exit point from the model, e.g. one neither drawn nor referred to anymore.
 */
export default function RemoveConnectionPointHandler() {}

RemoveConnectionPointHandler.prototype.execute = function(context) {
  const point = context.point;

  const owner = context.owner = point.$parent;
  const points = owner.get('connectionPoint');

  context.index = points.indexOf(point);

  points.splice(context.index, 1);
  point.$parent = null;

  return [];
};

RemoveConnectionPointHandler.prototype.revert = function(context) {
  const { point, owner, index } = context;

  owner.get('connectionPoint').splice(index, 0, point);
  point.$parent = owner;

  return [];
};
