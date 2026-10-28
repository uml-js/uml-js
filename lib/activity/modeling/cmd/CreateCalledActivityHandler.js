import { getSiblings } from '../../../core/util/ModelUtil.js';


/**
 * Creates the activity a call behavior action calls, UML 2.5.1 requiring
 * a call behavior action to have a behavior. Like a BPMN call activity, the
 * called activity is not part of the calling one but placed next to it (in the
 * same package or class), so other actions can call it, too.
 */
export default function CreateCalledActivityHandler(umlFactory, canvas) {
  this._umlFactory = umlFactory;
  this._canvas = canvas;
}

CreateCalledActivityHandler.$inject = [ 'umlFactory', 'canvas' ];

CreateCalledActivityHandler.prototype.execute = function(context) {
  const { element } = context;
  const action = element.businessObject;

  // create once, so re-doing re-uses the same model element
  if (!context.activity) {
    context.activity = this._umlFactory.create('uml:Activity', { name: action.name || 'Activity' });
    context.siblings = getSiblings(this._canvas.getRootElement().businessObject);
  }

  const { activity, siblings } = context;

  siblings.collection.push(activity);
  activity.$parent = siblings.owner;

  context.oldBehavior = action.get('behavior');
  action.set('behavior', activity);

  return [ element ];
};

CreateCalledActivityHandler.prototype.revert = function(context) {
  const { element, activity, siblings, oldBehavior } = context;

  const collection = siblings.collection;

  collection.splice(collection.indexOf(activity), 1);
  activity.$parent = null;

  element.businessObject.set('behavior', oldBehavior);

  return [ element ];
};

