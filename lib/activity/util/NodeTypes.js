import { ICONS } from '../icons.js';

/**
 * The node types offered by palette and context pad, in groups of the palette.
 *
 * Decision / merge and fork / join are offered as one type each,
 * which one a node is follows from its flows (see NodeTypeBehavior).
 *
 * Pins and expansion nodes are created on the border of an action or expansion
 * region, partitions and interruptible regions on the activity.
 */
export const NODE_TYPES = [
  { id: 'initial', label: 'Initial node', type: 'uml:InitialNode', icon: ICONS.initial, group: 'nodes' },
  { id: 'action', label: 'Action', type: 'uml:OpaqueAction', name: 'Action', icon: ICONS.action, group: 'nodes' },
  { id: 'activity-final', label: 'Activity final node', type: 'uml:ActivityFinalNode', icon: ICONS.activityFinal, group: 'nodes' },
  { id: 'structured', label: 'Structured activity', type: 'uml:StructuredActivityNode', icon: ICONS.structured, group: 'control' },
  { id: 'decision-merge', label: 'Decision / merge', type: 'uml:DecisionNode', icon: ICONS.decision, group: 'control' },
  { id: 'fork-join', label: 'Fork / join', type: 'uml:ForkNode', icon: ICONS.forkJoin, group: 'control' },
  { id: 'input-pin', label: 'Input pin', type: 'uml:InputPin', icon: ICONS.inputPin, group: 'objects' },
  { id: 'output-pin', label: 'Output pin', type: 'uml:OutputPin', icon: ICONS.outputPin, group: 'objects' },
  { id: 'central-buffer', label: 'Central buffer node', type: 'uml:CentralBufferNode', icon: ICONS.centralBuffer, group: 'objects' },
  { id: 'data-store', label: 'Data store node', type: 'uml:DataStoreNode', icon: ICONS.dataStore, group: 'objects' },
  { id: 'expansion', label: 'Expansion region', type: 'uml:ExpansionRegion', icon: ICONS.expansion, group: 'regions' },
  { id: 'expansion-node', label: 'Expansion node', type: 'uml:ExpansionNode', icon: ICONS.expansionNode, group: 'regions' },
  { id: 'interruptible', label: 'Interruptible region', type: 'uml:InterruptibleActivityRegion', icon: ICONS.interruptible, group: 'regions' },
  { id: 'partition', label: 'Partition', type: 'uml:ActivityPartition', name: 'Partition', icon: ICONS.partition, group: 'regions' }
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
