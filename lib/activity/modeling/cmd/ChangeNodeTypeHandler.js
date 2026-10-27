import { is } from '../../../core/util/ModelUtil.js';

/**
 * Changes the type of an activity node in place: a new model element of the
 * given type takes the old one's ID, name, flows, place in the activity and
 * diagram element.
 */
export default function ChangeNodeTypeHandler(umlFactory) {
  this._umlFactory = umlFactory;
}

ChangeNodeTypeHandler.$inject = [ 'umlFactory' ];

ChangeNodeTypeHandler.prototype.execute = function(context) {
  const { element, type } = context;

  const oldNode = context.oldNode = element.businessObject;

  // create once, so re-doing re-uses the same model element
  if (!context.newNode) {
    const node = context.newNode = this._umlFactory.create(type, { id: oldNode.id });

    if (oldNode.name) {
      node.set('name', oldNode.name);
    }
  }

  return swap(element, oldNode, context.newNode);
};

ChangeNodeTypeHandler.prototype.revert = function(context) {
  return swap(context.element, context.newNode, context.oldNode);
};


function swap(element, from, to) {
  const activity = from.$parent;

  if (activity) {
    const nodes = activity.get('node');

    nodes.splice(nodes.indexOf(from), 1, to);
  }

  to.$parent = activity;
  from.$parent = null;

  to.set('incoming', [ ...from.get('incoming') ]);
  to.set('outgoing', [ ...from.get('outgoing') ]);

  for (const connection of element.incoming) {
    const bo = connection.businessObject;

    // notes annotate the node, flows enter it
    if (is(bo, 'uml:Comment')) {
      bo.set('annotatedElement', bo.get('annotatedElement').map(annotated => annotated === from ? to : annotated));
    } else {
      bo.set('target', to);
    }
  }

  for (const connection of element.outgoing) {
    connection.businessObject.set('source', to);
  }

  element.businessObject = to;
  element.type = to.$type;
  element.di.set('modelElement', [ to ]);

  element.labels.forEach(label => {
    label.businessObject = to;
  });

  return [ element, ...element.incoming, ...element.outgoing ];
}
