import { REPLACE_MENU_ID } from '../../core/popup-menu/ReplaceMenu.js';
import { getRotateEntry } from '../../core/popup-menu/RotateEntry.js';

import { hasCrossingConnections, is, isLabel } from '../../core/util/ModelUtil.js';

import { getActionKind, hasCrossingEdges, isAction, isCalledByOthers, isForkOrJoin } from '../util/ElementUtil.js';

import { ICONS } from '../icons.js';

const FINAL_NODES = [
  { type: 'uml:ActivityFinalNode', label: 'Activity final node', icon: ICONS.activityFinal },
  { type: 'uml:FlowFinalNode', label: 'Flow final node', icon: ICONS.flowFinal }
];

const ACTIONS = [
  { kind: 'opaque', label: 'Action', icon: ICONS.action },
  { kind: 'call', label: 'Call behavior action', icon: ICONS.callBehavior },
  { kind: 'structured', label: 'Structured activity', icon: ICONS.structured }
];


/**
 * Replace menu provider for activity diagrams: the kinds of actions (actions, call
 * behavior actions, structured activity nodes), activity final and flow final nodes,
 * rotating fork / join bars. Changes that are not possible are disabled, with the reason.
 */
export default function ReplaceMenuProvider(popupMenu, modeling, injector) {
  this._modeling = modeling;

  // the manager of all diagrams (see lib/uml.js), which calling a new activity requires
  this._umlManager = injector.get('umlManager', false);

  popupMenu.registerProvider(REPLACE_MENU_ID, this);
}

ReplaceMenuProvider.$inject = [
  'popupMenu',
  'modeling',
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

  if (isAction(element)) {
    return this._getActionEntries(element);
  }

  const alternatives = is(element, 'uml:FinalNode') ? FINAL_NODES : [];

  for (const { type, label, icon } of alternatives) {
    if (!is(element, type)) {
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

  return entries;
};

/**
 * @return {string|null} why an action cannot change to a kind, carrying over its content
 */
ReplaceMenuProvider.prototype._getObstacle = function(element, kind) {
  const current = getActionKind(element);
  const bo = element.businessObject;

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
