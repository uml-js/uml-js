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


/**
 * The collection holding an activity, e.g. the packaged elements of its package or
 * the owned behaviors of its class, or else the packaged elements of the nearest package.
 *
 * @param {ModdleElement} activity
 *
 * @return { { owner: ModdleElement, collection: Array<ModdleElement> } }
 */
function getSiblings(activity) {
  const owner = activity.$parent;

  if (owner) {
    for (const property of owner.$descriptor.properties) {
      const value = owner.get(property.name);

      if (property.isMany && !property.isReference && Array.isArray(value) && value.includes(activity)) {
        return { owner, collection: value };
      }
    }
  }

  let pkg = owner;

  while (pkg && !pkg.$instanceOf('uml:Package')) {
    pkg = pkg.$parent;
  }

  if (!pkg) {
    throw new Error(`no package to place an activity called by <${ activity.id }> in`);
  }

  return { owner: pkg, collection: pkg.get('packagedElement') };
}
