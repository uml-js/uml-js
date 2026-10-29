import { ICONS } from '../icons.js';

/**
 * The vertex types offered by palette, context pad and replace menu.
 *
 * Vertices can be replaced with vertices of the same `replaceGroup` only.
 *
 * Fork and join are offered as a single type: they share their notation and
 * the kind is derived from the number of incoming and outgoing transitions
 * (see ForkJoinBehavior).
 *
 * Entry and exit points are drawn on the border of composite states or anywhere
 * in the diagram of a state machine, the points of the state machine.
 */
export const VERTEX_TYPES = [
  { id: 'state', label: 'State', type: 'uml:State', name: 'State', icon: ICONS.state },
  { id: 'final-state', label: 'Final state', type: 'uml:FinalState', icon: ICONS.final, replaceGroup: 'end' },
  { id: 'initial', label: 'Initial', type: 'uml:Pseudostate', kind: 'initial', icon: ICONS.initial },
  { id: 'choice', label: 'Choice', type: 'uml:Pseudostate', kind: 'choice', icon: ICONS.choice, replaceGroup: 'decision' },
  { id: 'junction', label: 'Junction', type: 'uml:Pseudostate', kind: 'junction', icon: ICONS.junction, replaceGroup: 'decision' },
  { id: 'fork-join', label: 'Fork / join', type: 'uml:Pseudostate', kind: 'fork', kinds: [ 'fork', 'join' ], icon: ICONS.forkJoin },
  { id: 'shallow-history', label: 'Shallow history', type: 'uml:Pseudostate', kind: 'shallowHistory', icon: ICONS.shallowHistory, replaceGroup: 'history' },
  { id: 'deep-history', label: 'Deep history', type: 'uml:Pseudostate', kind: 'deepHistory', icon: ICONS.deepHistory, replaceGroup: 'history' },
  { id: 'terminate', label: 'Terminate', type: 'uml:Pseudostate', kind: 'terminate', icon: ICONS.terminate, replaceGroup: 'end' },
  { id: 'entry-point', label: 'Entry point', type: 'uml:Pseudostate', kind: 'entryPoint', icon: ICONS.entryPoint },
  { id: 'exit-point', label: 'Exit point', type: 'uml:Pseudostate', kind: 'exitPoint', icon: ICONS.exitPoint }
];

/**
 * @param {Object} vertexType one of VERTEX_TYPES
 *
 * @return {Object} attributes for ElementFactory#createShape
 */
export function getShapeAttrs(vertexType) {
  const { type, kind, name } = vertexType;

  return { type, kind, name };
}

/**
 * @param {Element} element
 *
 * @return {Object|undefined} the vertex type of the element
 */
export function getVertexType(element) {
  const bo = element.businessObject;

  return VERTEX_TYPES.find(vertexType => {
    const kinds = vertexType.kinds || (vertexType.kind ? [ vertexType.kind ] : null);

    return bo.$type === vertexType.type && (!kinds || kinds.includes(bo.kind));
  });
}
