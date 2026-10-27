import { ICONS } from '../icons.js';

/**
 * The node types offered by palette and context pad.
 *
 * Decision / merge and fork / join are offered as one type each,
 * which one a node is follows from its flows (see NodeTypeBehavior).
 */
export const NODE_TYPES = [
  { id: 'initial', label: 'Initial node', type: 'uml:InitialNode', icon: ICONS.initial },
  { id: 'action', label: 'Action', type: 'uml:OpaqueAction', name: 'Action', icon: ICONS.action },
  { id: 'activity-final', label: 'Activity final node', type: 'uml:ActivityFinalNode', icon: ICONS.activityFinal },
  { id: 'decision-merge', label: 'Decision / merge', type: 'uml:DecisionNode', icon: ICONS.decision },
  { id: 'fork-join', label: 'Fork / join', type: 'uml:ForkNode', icon: ICONS.forkJoin }
];

/**
 * @param {Object} nodeType one of NODE_TYPES
 *
 * @return {Object} attributes for ElementFactory#createShape
 */
export function getShapeAttrs(nodeType) {
  const { type, name } = nodeType;

  return { type, name };
}
