import { is, isConnection, isLabel } from '../../core/util/ModelUtil.js';

import { getBorderSide } from '../../core/util/GeometryUtil.js';

import {
  isAction,
  isActivityNode,
  isExpansionRegion,
  isGroup,
  isObjectNode
} from '../util/ElementUtil.js';

import { NODE_TYPES, getShapeAttrs } from '../util/NodeTypes.js';

import { ICONS } from '../icons.js';

/**
 * One representative per class of nodes, like in bpmn-js.
 */
const QUICK_APPEND = [ 'activity-final', 'action', 'decision-merge', 'fork-join' ];

/**
 * Distance between pins or expansion nodes placed next to each other.
 */
const BORDER_NODE_GAP = 8;


/**
 * Context pad entries for activity diagrams, modeled after bpmn-js:
 *
 *   * append a final node, an action, a decision / merge or a fork / join
 *   * add input and output pins to actions, input and output expansion nodes
 *     to expansion regions
 *   * connect using a flow
 *   * change the type of nodes, rotate fork / join bars, mark flows as
 *     interrupting (replace menu)
 *   * delete
 */
export default function ActivityContextPadProvider(
    contextPad, modeling, elementFactory,
    connect, create, autoPlace, replaceMenu) {

  this._modeling = modeling;
  this._elementFactory = elementFactory;
  this._connect = connect;
  this._create = create;
  this._autoPlace = autoPlace;
  this._replaceMenu = replaceMenu;

  contextPad.registerProvider(this);
}

ActivityContextPadProvider.$inject = [
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'autoPlace',
  'replaceMenu'
];

ActivityContextPadProvider.prototype.getContextPadEntries = function(element) {
  const modeling = this._modeling,
        elementFactory = this._elementFactory,
        connect = this._connect,
        create = this._create,
        autoPlace = this._autoPlace,
        replaceMenu = this._replaceMenu;

  const entries = {};

  if (isLabel(element)) {
    return entries;
  }

  // objects flow to object nodes and control nodes only, connected rather than appended
  if (isActivityNode(element) && !is(element, 'uml:FinalNode') && !isObjectNode(element)) {
    for (const id of QUICK_APPEND) {
      const nodeType = NODE_TYPES.find(t => t.id === id);

      entries[`append.${ id }`] = {
        group: 'model',
        title: `Append ${ nodeType.label.toLowerCase() }`,
        imageUrl: nodeType.icon,
        action: {
          dragstart: (event, element) => create.start(event, elementFactory.createShape(getShapeAttrs(nodeType)), { source: element }),
          click: (event, element) => autoPlace.append(element, elementFactory.createShape(getShapeAttrs(nodeType)))
        }
      };
    }
  }

  if (isAction(element)) {
    for (const [ type, label, icon, side ] of [
      [ 'uml:InputPin', 'input pin', ICONS.inputPin, 'left' ],
      [ 'uml:OutputPin', 'output pin', ICONS.outputPin, 'right' ]
    ]) {
      entries[`add.${ type.split(':')[1] }`] = {
        group: 'model',
        title: `Add ${ label }`,
        imageUrl: icon,
        action: {
          click: (event, element) => this._addBorderNode(element, type, side)
        }
      };
    }
  }

  if (isExpansionRegion(element)) {
    for (const [ id, label, side ] of [
      [ 'input', 'input expansion node', 'top' ],
      [ 'output', 'output expansion node', 'bottom' ]
    ]) {
      entries[`add.ExpansionNode.${ id }`] = {
        group: 'model',
        title: `Add ${ label }`,
        imageUrl: ICONS.expansionNode,
        action: {
          click: (event, element) => this._addBorderNode(element, 'uml:ExpansionNode', side)
        }
      };
    }
  }

  if (isActivityNode(element) && !is(element, 'uml:FinalNode')) {
    entries['connect'] = {
      group: 'connect',
      title: isObjectNode(element) ? 'Connect using object flow' : 'Connect using control flow',
      imageUrl: ICONS.connect,
      action: {
        click: (event, element) => connect.start(event, element),
        dragstart: (event, element) => connect.start(event, element)
      }
    };
  }

  if (replaceMenu.isAvailable(element)) {
    entries['replace'] = {
      group: 'edit',
      title: 'Change element',
      imageUrl: ICONS.replace,
      action: {
        click: (event, element) => replaceMenu.open(element)
      }
    };
  }

  if (isActivityNode(element) || isGroup(element) || isConnection(element)) {
    entries['delete'] = {
      group: 'edit',
      title: 'Delete',
      imageUrl: ICONS.remove,
      action: {
        click: (event, element) => modeling.removeElements([ element ])
      }
    };
  }

  return entries;
};

/**
 * Add a pin or an expansion node to the middle of a side of a node, or next to
 * the pins or expansion nodes already there. Expansion nodes added to the bottom
 * of their region are outputs (see BorderNodeBehavior).
 *
 * @param {Shape} host
 * @param {string} type
 * @param {'left'|'right'|'top'|'bottom'} side
 */
ActivityContextPadProvider.prototype._addBorderNode = function(host, type, side) {
  const shape = this._elementFactory.createShape({ type });

  const vertical = side === 'left' || side === 'right';

  // expansion nodes lie along the border
  if (is(shape, 'uml:ExpansionNode') && vertical) {
    [ shape.width, shape.height ] = [ shape.height, shape.width ];
  }

  const length = vertical ? shape.height : shape.width;
  const step = length + BORDER_NODE_GAP;

  const taken = (host.attachers || [])
    .filter(attacher => getBorderSide(getMid(attacher), host) === side)
    .map(attacher => vertical ? getMid(attacher).y : getMid(attacher).x);

  const middle = vertical ? host.y + host.height / 2 : host.x + host.width / 2;
  const min = (vertical ? host.y : host.x) + length / 2;
  const max = (vertical ? host.y + host.height : host.x + host.width) - length / 2;

  const distance = candidate => Math.min(Infinity, ...taken.map(position => Math.abs(position - candidate)));

  // the middle, then alternately further after and before it, or else, on a side too
  // short, the place furthest from the others
  let offset = null;

  for (let i = 0; middle + Math.ceil(i / 2) * step <= max || middle - Math.ceil(i / 2) * step >= min; i++) {
    const candidate = middle + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * step;

    if (candidate >= min && candidate <= max && distance(candidate) >= step) {
      offset = candidate;
      break;
    }
  }

  if (offset === null) {
    offset = middle;

    for (let candidate = Math.ceil(min); candidate <= max; candidate++) {
      if (distance(candidate) > distance(offset)) {
        offset = candidate;
      }
    }
  }

  const position = {
    left: { x: host.x, y: offset },
    right: { x: host.x + host.width, y: offset },
    top: { x: offset, y: host.y },
    bottom: { x: offset, y: host.y + host.height }
  }[side];

  this._modeling.createShape(shape, position, host, { attach: true });
};


function getMid(shape) {
  return {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2
  };
}
