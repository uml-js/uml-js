/**
 * Appends a lifeline to another one, connected by a message
 * sent at the given height.
 */
export default function AppendLifelineHandler(modeling, eventBus, canvas) {
  this._modeling = modeling;
  this._eventBus = eventBus;
  this._canvas = canvas;
}

AppendLifelineHandler.$inject = [
  'modeling',
  'eventBus',
  'canvas'
];

AppendLifelineHandler.prototype.preExecute = function(context) {
  const { source, shape, y } = context;

  // placed where auto place puts it (see UmlAutoPlace)
  const position = this._eventBus.fire('autoPlace', { source, shape });

  context.shape = this._modeling.createShape(shape, position, this._canvas.getRootElement());

  context.message = this._modeling.connect(source, context.shape, {}, {
    connectionStart: { x: source.x + source.width / 2, y }
  });
};

AppendLifelineHandler.prototype.execute = function() {};

AppendLifelineHandler.prototype.revert = function() {};
