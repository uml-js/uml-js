import { is } from '../../../core/util/ModelUtil.js';

import { getPinProperty } from '../../util/ElementUtil.js';

/**
 * Changes the type of an activity node in place: a new model element of the
 * given type takes the old one's ID, name, flows, place in the activity, pins,
 * content, partitions and interruptible regions and diagram element. Further
 * attributes of the new model element may be given, e.g. the behavior of a call
 * behavior action.
 */
export default function ChangeNodeTypeHandler(umlFactory) {
  this._umlFactory = umlFactory;
}

ChangeNodeTypeHandler.$inject = [ 'umlFactory' ];

ChangeNodeTypeHandler.prototype.execute = function(context) {
  const { element, type, attrs } = context;

  const oldNode = context.oldNode = element.businessObject;

  // create once, so re-doing re-uses the same model element
  if (!context.newNode) {
    const node = context.newNode = this._umlFactory.create(type, { ...attrs, id: oldNode.id });

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
  const owner = from.$parent;

  if (owner) {
    const fromProperty = getContainingProperty(owner, from);

    // pins changing between input and output change the property of their action owning them
    const toProperty = is(to, 'uml:Pin') ? getPinProperty(owner, is(to, 'uml:InputPin')) : fromProperty;

    const fromList = owner.get(fromProperty);
    const index = fromList.indexOf(from);

    fromList.splice(index, 1);

    if (toProperty === fromProperty) {
      fromList.splice(index, 0, to);
    } else {
      owner.get(toProperty).push(to);
    }
  }

  to.$parent = owner;
  from.$parent = null;

  to.set('incoming', [ ...from.get('incoming') ]);
  to.set('outgoing', [ ...from.get('outgoing') ]);

  // the pins of actions
  if (is(from, 'uml:Action') && is(to, 'uml:Action')) {
    for (const input of [ true, false ]) {
      const pins = [ ...from.get(getPinProperty(from, input)) ];

      from.set(getPinProperty(from, input), []);
      to.set(getPinProperty(to, input), pins);

      pins.forEach(pin => pin.$parent = to);
    }
  }

  // the content of structured activity nodes and expansion regions
  if (is(from, 'uml:StructuredActivityNode') && is(to, 'uml:StructuredActivityNode')) {
    for (const property of [ 'node', 'edge' ]) {
      const elements = [ ...from.get(property) ];

      from.set(property, []);
      to.set(property, elements);

      elements.forEach(e => e.$parent = to);
    }
  }

  // the partitions and interruptible regions grouping the node
  for (const property of [ 'inPartition', 'inInterruptibleRegion' ]) {
    const groups = [ ...from.get(property) ];

    from.set(property, []);
    to.set(property, groups);

    groups.forEach(group => {
      group.set('node', group.get('node').map(node => node === from ? to : node));
    });
  }

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

/**
 * @return {string} the property of an owner containing a model element
 */
function getContainingProperty(owner, bo) {
  return owner.$descriptor.properties.find(p => p.isMany && !p.isReference && owner.get(p.name).includes(bo)).name;
}
