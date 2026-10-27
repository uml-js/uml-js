/**
 * Sets the aggregation of an association: the source is the whole
 * (drawn with the diamond), the target the part, whose end carries
 * the aggregation kind (UML 2.5.1, 11.5.3).
 */
export default function SetAggregationHandler() {}

SetAggregationHandler.prototype.execute = function(context) {
  const { connection, aggregation } = context;

  const [ wholeEnd, partEnd ] = connection.businessObject.get('memberEnd');

  context.old = [ wholeEnd.aggregation, partEnd.aggregation ];

  wholeEnd.set('aggregation', undefined);
  partEnd.set('aggregation', aggregation === 'none' ? undefined : aggregation);

  return [ connection ];
};

SetAggregationHandler.prototype.revert = function(context) {
  const { connection, old } = context;

  const [ wholeEnd, partEnd ] = connection.businessObject.get('memberEnd');

  wholeEnd.set('aggregation', old[0]);
  partEnd.set('aggregation', old[1]);

  return [ connection ];
};
