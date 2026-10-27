import { is } from '../../../core/util/ModelUtil.js';


/**
 * Changes a relationship into another kind, e.g. an association into a
 * composition or a generalization, in a single command.
 */
export default function ReplaceRelationshipHandler(modeling) {
  this._modeling = modeling;
}

ReplaceRelationshipHandler.$inject = [ 'modeling' ];

ReplaceRelationshipHandler.prototype.preExecute = function(context) {
  const { connection, type, aggregation } = context;

  const modeling = this._modeling;

  let newConnection = connection;

  if (!is(connection, type)) {
    newConnection = modeling.replaceConnection(connection, type);
  }

  if (aggregation) {
    modeling.setAggregation(newConnection, aggregation);
  }

  context.newConnection = newConnection;
};

ReplaceRelationshipHandler.prototype.execute = function() {};

ReplaceRelationshipHandler.prototype.revert = function() {};
