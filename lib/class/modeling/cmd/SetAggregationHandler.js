/**
 * Sets the aggregation of an association: the end of the part carries the
 * aggregation kind, the diamond is drawn at the other end, the whole
 * (UML 2.5.1, 11.5.3). By default the target is the part, the source the whole.
 */
export default function SetAggregationHandler() {}

SetAggregationHandler.prototype.execute = function(context) {
  const { connection, aggregation, part = 1 } = context;

  const ends = connection.businessObject.get('memberEnd');

  context.old = ends.map(end => end.aggregation);

  ends.forEach((end, index) => {
    end.set('aggregation', index === part && aggregation !== 'none' ? aggregation : undefined);
  });

  return [ connection ];
};

SetAggregationHandler.prototype.revert = function(context) {
  const { connection, old } = context;

  connection.businessObject.get('memberEnd').forEach((end, index) => end.set('aggregation', old[index]));

  return [ connection ];
};
