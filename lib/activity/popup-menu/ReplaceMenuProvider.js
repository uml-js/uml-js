import { REPLACE_MENU_ID } from '../../core/popup-menu/ReplaceMenu.js';
import { getRotateEntry } from '../../core/popup-menu/RotateEntry.js';

import { hasCrossingConnections, is, isLabel } from '../../core/util/ModelUtil.js';

import {
  getActionKind,
  hasCrossingEdges,
  isAction,
  isCalledByOthers,
  isControlFlow,
  isExpansionNode,
  isExpansionRegion,
  isForkOrJoin,
  isInput,
  isInterruptibleRegion,
  isPin,
  isStructured
} from '../util/ElementUtil.js';

import { ICONS } from '../icons.js';

const FINAL_NODES = [
  { type: 'uml:ActivityFinalNode', label: 'Activity final node', icon: ICONS.activityFinal },
  { type: 'uml:FlowFinalNode', label: 'Flow final node', icon: ICONS.flowFinal }
];

const BUFFERS = [
  { type: 'uml:CentralBufferNode', label: 'Central buffer node', icon: ICONS.centralBuffer },
  { type: 'uml:DataStoreNode', label: 'Data store node', icon: ICONS.dataStore }
];

const ACTIONS = [
  { kind: 'opaque', label: 'Action', icon: ICONS.action },
  { kind: 'call', label: 'Call behavior action', icon: ICONS.callBehavior },
  { kind: 'structured', label: 'Structured activity', icon: ICONS.structured },
  { kind: 'expansion', label: 'Expansion region', icon: ICONS.expansion }
];

const MODES = [ 'parallel', 'iterative', 'stream' ];


/**
 * Replace menu provider for activity diagrams: the kinds of actions (actions, call
 * behavior actions, structured activity nodes, expansion regions), the modes of
 * expansion regions, activity final and flow final nodes, input and output pins,
 * central buffer and data store nodes, input and output expansion nodes, rotating
 * fork / join bars, flows interrupting a region. Changes that are not possible are
 * disabled, with the reason.
 */
export default function ReplaceMenuProvider(popupMenu, modeling, elementRegistry, injector) {
  this._modeling = modeling;
  this._elementRegistry = elementRegistry;

  // the manager of all diagrams (see lib/uml.js), which calling a new activity requires
  this._umlManager = injector.get('umlManager', false);

  popupMenu.registerProvider(REPLACE_MENU_ID, this);
}

ReplaceMenuProvider.$inject = [
  'popupMenu',
  'modeling',
  'elementRegistry',
  'injector'
];

ReplaceMenuProvider.prototype.getPopupMenuEntries = function(element) {
  const modeling = this._modeling;

  const entries = {};

  if (isForkOrJoin(element)) {
    entries['rotate'] = getRotateEntry(element, modeling);

    return entries;
  }

  if (isLabel(element)) {
    return entries;
  }

  if (isControlFlow(element)) {
    return this._getFlowEntries(element);
  }

  if (isAction(element)) {
    return this._getActionEntries(element);
  }

  if (isPin(element)) {
    return this._getPinEntries(element);
  }

  if (isExpansionNode(element)) {
    return this._getExpansionNodeEntries(element);
  }

  const alternatives = is(element, 'uml:FinalNode') ? FINAL_NODES : is(element, 'uml:CentralBufferNode') ? BUFFERS : [];

  // data store nodes are central buffer nodes, so compare the exact type
  for (const { type, label, icon } of alternatives) {
    if (element.businessObject.$type !== type) {
      entries[`replace-with-${ type.split(':')[1] }`] = {
        label,
        imageUrl: icon,
        action: () => modeling.changeNodeType(element, type)
      };
    }
  }

  return entries;
};

ReplaceMenuProvider.prototype._getActionEntries = function(element) {
  const modeling = this._modeling;

  const current = getActionKind(element);

  const entries = {};

  for (const { kind, label, icon } of ACTIONS) {
    if (kind === current) {
      continue;
    }

    const obstacle = this._getObstacle(element, kind);

    entries[`replace-with-${ kind }`] = {
      label,
      imageUrl: icon,
      disabled: !!obstacle,
      title: obstacle || undefined,
      action: () => !obstacle && modeling.changeActionKind(element, kind)
    };
  }

  if (isExpansionRegion(element)) {
    const mode = element.businessObject.mode || 'iterative';

    for (const other of MODES.filter(m => m !== mode)) {
      entries[`mode-${ other }`] = {
        label: `«${ other }»`,
        imageUrl: ICONS.expansion,
        action: () => modeling.updateProperties(element, { mode: other })
      };
    }
  }

  return entries;
};

/**
 * Input and output pins: objects only leave input pins and enter output pins of
 * structured activity nodes, flowing into and out of their content.
 */
ReplaceMenuProvider.prototype._getPinEntries = function(element) {
  const modeling = this._modeling;

  const input = isInput(element);
  const type = input ? 'uml:OutputPin' : 'uml:InputPin';

  // as an output pin, flows would enter it, as an input pin leave it
  const crossing = !isStructured(element.host) && (input ? element.incoming.length : element.outgoing.length);

  return {
    [ `replace-with-${ type.split(':')[1] }` ]: {
      label: input ? 'Output pin' : 'Input pin',
      imageUrl: input ? ICONS.outputPin : ICONS.inputPin,
      disabled: !!crossing,
      title: crossing ? (input ? 'Flows enter the pin' : 'Flows leave the pin') : undefined,
      action: () => !crossing && modeling.changeNodeType(element, type)
    }
  };
};

ReplaceMenuProvider.prototype._getExpansionNodeEntries = function(element) {
  const modeling = this._modeling;

  const region = element.host && element.host.businessObject;

  if (!region) {
    return {};
  }

  const input = isInput(element);

  return {
    'expansion-node-role': {
      label: input ? 'Output expansion node' : 'Input expansion node',
      imageUrl: ICONS.expansionNode,
      action: () => modeling.updateProperties(element, input
        ? { regionAsInput: undefined, regionAsOutput: region }
        : { regionAsInput: region, regionAsOutput: undefined })
    }
  };
};

/**
 * Flows leaving an interruptible region may interrupt it (UML 2.5.1, 15.6.3.2).
 */
ReplaceMenuProvider.prototype._getFlowEntries = function(element) {
  const modeling = this._modeling;

  const flow = element.businessObject;

  const entries = {};

  if (flow.interrupts) {
    entries['interrupting-off'] = {
      label: 'Not interrupting',
      imageUrl: ICONS.interruptible,
      action: () => modeling.updateProperties(element, { interrupts: undefined })
    };

    return entries;
  }

  const source = getMid(element.source), target = getMid(element.target);

  const regions = this._elementRegistry.filter(region => {
    return isInterruptibleRegion(region) && region.parent && contains(region, source) && !contains(region, target);
  });

  for (const region of regions) {
    const name = region.businessObject.name;

    entries[`interrupting-${ region.id }`] = {
      label: regions.length > 1 && name ? `Interrupting ${ name }` : 'Interrupting',
      imageUrl: ICONS.interruptible,
      action: () => modeling.updateProperties(element, { interrupts: region.businessObject })
    };
  }

  return entries;
};

/**
 * @return {string|null} why an action cannot change to a kind, carrying over its content
 */
ReplaceMenuProvider.prototype._getObstacle = function(element, kind) {
  const current = getActionKind(element);
  const bo = element.businessObject;

  if (current === 'expansion' && kind === 'call') {
    return 'Change into a structured activity first';
  }

  if (current === 'structured' && kind === 'call') {
    if (!this._umlManager) {
      return 'Requires the manager of all diagrams';
    }

    return hasCrossingEdges(element) || hasCrossingConnections(element) ? 'Edges cross the border of the structured activity' : null;
  }

  if (current === 'call' && kind === 'structured') {
    const activity = bo.behavior;

    if (!is(activity, 'uml:Activity')) {
      return 'Calls no activity';
    }

    for (let owner = bo.$parent; owner; owner = owner.$parent) {
      if (owner === activity) {
        return 'Calls the activity it belongs to';
      }
    }

    return isCalledByOthers(activity, bo) ? `Other actions call ${ activity.name || 'the activity' }` : null;
  }

  return null;
};


function getMid(shape) {
  return {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2
  };
}

function contains(bounds, point) {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y && point.y <= bounds.y + bounds.height;
}
