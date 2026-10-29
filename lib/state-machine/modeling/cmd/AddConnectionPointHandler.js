import { getUniqueName } from '../../util/ElementUtil.js';


/**
 * Adds an entry or exit point to the state machine a submachine state refers to,
 * and a connection point reference to it on the border of the submachine state.
 * The point is not drawn in the diagram of the state machine: an entry or exit
 * point drawn there with its name is the point.
 */
export default function AddConnectionPointHandler(modeling, elementFactory, umlFactory) {
  this._modeling = modeling;
  this._elementFactory = elementFactory;
  this._umlFactory = umlFactory;
}

AddConnectionPointHandler.$inject = [ 'modeling', 'elementFactory', 'umlFactory' ];

AddConnectionPointHandler.prototype.execute = function(context) {
  const { element, kind } = context;

  const stateMachine = element.businessObject.submachine;
  const points = stateMachine.get('connectionPoint');

  // create once, so re-doing re-uses the same model element
  if (!context.point) {
    context.point = this._umlFactory.create('uml:Pseudostate', {
      kind,
      name: getUniqueName(points, kind === 'entryPoint' ? 'entry' : 'exit')
    });
  }

  const point = context.point;

  points.push(point);
  point.$parent = stateMachine;

  return [];
};

AddConnectionPointHandler.prototype.revert = function(context) {
  const { element, point } = context;

  const points = element.businessObject.submachine.get('connectionPoint');

  points.splice(points.indexOf(point), 1);
  point.$parent = null;

  return [];
};

AddConnectionPointHandler.prototype.postExecute = function(context) {
  const { element, kind, point, position } = context;

  const reference = this._elementFactory.createShape({
    type: 'uml:ConnectionPointReference',
    [ kind === 'entryPoint' ? 'entry' : 'exit' ]: [ point ]
  });

  context.reference = position
    ? this._modeling.createShape(reference, position, element, { attach: true })
    : this._modeling.addConnectionPointReference(element, point);
};
