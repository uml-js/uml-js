/**
 * Replaces a connection with a connection of another type,
 * keeping source, target and waypoints.
 */
export default function ReplaceConnectionHandler(modeling) {
  this._modeling = modeling;
}

ReplaceConnectionHandler.$inject = [ 'modeling' ];

ReplaceConnectionHandler.prototype.preExecute = function(context) {
  const { connection, attrs } = context;

  context.newConnection = this._modeling.createConnection(
    connection.source,
    connection.target,
    {
      ...attrs,
      waypoints: connection.waypoints.map(({ x, y, original }) => ({ x, y, original }))
    },
    connection.parent
  );

  this._modeling.removeConnection(connection);
};

ReplaceConnectionHandler.prototype.execute = function() {};

ReplaceConnectionHandler.prototype.revert = function() {};
