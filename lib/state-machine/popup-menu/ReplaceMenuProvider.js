import { REPLACE_MENU_ID } from '../../core/popup-menu/ReplaceMenu.js';
import { getRotateEntry } from '../../core/popup-menu/RotateEntry.js';

import { ICONS } from '../icons.js';

import {
  canCollapse,
  getDecompositionView,
  getDescendantShapes,
  getDiCompartments,
  getStateKind,
  hasConnectionPoints,
  hasCrossingTransitions,
  isCollapsed,
  isComposite,
  isPseudostate,
  isReferredToByOthers,
  isState
} from '../util/ElementUtil.js';


/**
 * Replace menu provider to change the type of a vertex, to change the kind of
 * states (simple, composite, submachine), to hide and show the decomposition of
 * composite states, to add or remove their internal activities (entry / do / exit),
 * and to rotate fork / join bars.
 */
export default function ReplaceMenuProvider(popupMenu, stateMachineReplace, modeling, injector) {
  this._stateMachineReplace = stateMachineReplace;
  this._modeling = modeling;

  // the manager of all diagrams (see lib/uml.js), which collapsing and expanding states requires
  this._umlManager = injector.get('umlManager', false);

  popupMenu.registerProvider(REPLACE_MENU_ID, this);
}

ReplaceMenuProvider.$inject = [
  'popupMenu',
  'stateMachineReplace',
  'modeling',
  'injector'
];

ReplaceMenuProvider.prototype.getPopupMenuEntries = function(element) {
  const stateMachineReplace = this._stateMachineReplace;

  const modeling = this._modeling;

  const entries = {};

  if (isState(element)) {
    Object.assign(entries, this._getKindEntries(element), this._getDecompositionEntries(element));

    // the compartment of entry / do / exit; composite states showing their
    // decomposition always have it, below their name, edited in place
    const hasLowerCompartment = isComposite(element) && !isCollapsed(element);

    if (!hasLowerCompartment && hasInternalActivities(element)) {
      entries['remove-internal-activities'] = {
        label: 'Remove internal activities',
        imageUrl: ICONS.state,
        action: () => modeling.updateBehavioursCompartment(element, false)
      };
    }

    if (!hasLowerCompartment && !hasInternalActivities(element)) {
      entries['add-internal-activities'] = {
        label: 'Add internal activities',
        imageUrl: ICONS.internalActivities,
        action: () => modeling.updateBehavioursCompartment(element, true)
      };
    }
  }

  if (isPseudostate(element, 'fork') || isPseudostate(element, 'join')) {
    entries['rotate'] = getRotateEntry(element, modeling);
  }

  for (const vertexType of stateMachineReplace.getReplaceOptions(element)) {
    entries[`replace-with-${ vertexType.id }`] = {
      label: vertexType.label,
      imageUrl: vertexType.icon,
      action: () => stateMachineReplace.replaceElement(element, vertexType)
    };
  }

  return entries;
};

/**
 * Entries to change the kind of a state, disabled with the reason where not possible.
 */
ReplaceMenuProvider.prototype._getKindEntries = function(element) {
  const modeling = this._modeling;

  const current = getStateKind(element);

  const entries = {};

  const add = (kind, label, imageUrl, disabledReason) => {
    if (kind === current) {
      return;
    }

    entries[`${ kind }-state`] = {
      label,
      imageUrl,
      disabled: !!disabledReason,
      title: disabledReason || undefined,
      action: () => !disabledReason && modeling.changeStateKind(element, kind)
    };
  };

  // entry and exit points belong to composite states, references to them to submachine states
  const connectionPoints = hasConnectionPoints(element) && (current === 'submachine' ? REFERENCES : CONNECTION_POINTS);

  add('simple', 'State', ICONS.state, connectionPoints);
  add('composite', 'Composite state', ICONS.compositeState, connectionPoints || (current === 'submachine' && this._getInlineObstacle(element)));
  add('submachine', 'Submachine state', ICONS.submachineState, connectionPoints || (current === 'composite' && this._getExtractObstacle(element)));

  return entries;
};

/**
 * Entries to show the sub-states of a composite state in the state or in a diagram
 * of the state, its decomposition hidden (UML 2.5.1).
 */
ReplaceMenuProvider.prototype._getDecompositionEntries = function(element) {
  const modeling = this._modeling;
  const manager = this._umlManager;

  if (!manager || !isComposite(element)) {
    return {};
  }

  if (isCollapsed(element)) {
    return getDecompositionView(manager, element.businessObject) ? {
      'show-decomposition': {
        label: 'Show decomposition',
        imageUrl: ICONS.compositeState,
        action: () => modeling.expandState(element)
      }
    } : {};
  }

  if (!getDescendantShapes(element).length) {
    return {};
  }

  const obstacle = canCollapse(element) ? null : (hasConnectionPoints(element) ? CONNECTION_POINTS : CROSSING);

  return {
    'hide-decomposition': {
      label: 'Hide decomposition',
      imageUrl: ICONS.collapsedState,
      disabled: !!obstacle,
      title: obstacle || undefined,
      action: () => !obstacle && modeling.collapseState(element)
    }
  };
};

/**
 * @return {string|null} why the regions of a composite state cannot move to a state machine
 */
ReplaceMenuProvider.prototype._getExtractObstacle = function(element) {
  if (isCollapsed(element)) {
    return hasCrossingTransitions(element) ? CROSSING : null;
  }

  if (!getDescendantShapes(element).length) {
    return null;
  }

  if (!this._umlManager) {
    return 'Requires the manager of all diagrams';
  }

  return canCollapse(element) ? null : CROSSING;
};

/**
 * @return {string|null} why the regions of the state machine a submachine state
 * refers to cannot move to the state
 */
ReplaceMenuProvider.prototype._getInlineObstacle = function(element) {
  const state = element.businessObject;
  const stateMachine = state.submachine;

  let ancestor = state.$parent;

  while (ancestor && ancestor !== stateMachine) {
    ancestor = ancestor.$parent;
  }

  if (ancestor) {
    return 'Refers to the state machine it belongs to';
  }

  const name = stateMachine.name || 'the state machine';

  if (stateMachine.get('connectionPoint').length) {
    return `${ name } has entry or exit points`;
  }

  return isReferredToByOthers(stateMachine, state) ? `Other states refer to ${ name }` : null;
};

const CROSSING = 'Transitions cross the border of the state';
const CONNECTION_POINTS = 'Has entry or exit points';
const REFERENCES = 'Has connection point references';

/**
 * Whether a state shows the compartment of entry / do / exit: if it has any, or if it was added.
 */
function hasInternalActivities(element) {
  const bo = element.businessObject;

  return !!(bo.entry || bo.doActivity || bo.exit) || getDiCompartments(element.di).length > 0;
}
