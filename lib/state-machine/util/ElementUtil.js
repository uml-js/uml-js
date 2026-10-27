import { is, isLabel } from '../../core/util/ModelUtil.js';


export function isVertex(element) {
  return is(element, 'uml:Vertex') && !isLabel(element);
}

export function isPseudostate(element, kind) {
  return is(element, 'uml:Pseudostate') && (!kind || getKind(element) === kind);
}

/**
 * A state that may have a name, internal activities and sub-states.
 */
export function isState(element) {
  return is(element, 'uml:State') && !is(element, 'uml:FinalState') && !isLabel(element);
}

export function isTransition(element) {
  return is(element, 'uml:Transition');
}

export function getKind(element) {
  return (element.businessObject || element).kind;
}

/**
 * A state is composite if it has at least one region (UML 2.5.1, State::isComposite).
 */
export function isComposite(element) {
  const bo = element.businessObject || element;

  return is(bo, 'uml:State') && bo.get('region').length > 0;
}

const DEFAULT_SIZES = {
  'uml:State': { width: 120, height: 60 },
  'uml:FinalState': { width: 30, height: 30 },

  initial: { width: 24, height: 24 },
  junction: { width: 16, height: 16 },
  choice: { width: 32, height: 32 },
  shallowHistory: { width: 30, height: 30 },
  deepHistory: { width: 30, height: 30 },
  fork: { width: 8, height: 80 },
  join: { width: 8, height: 80 },
  terminate: { width: 24, height: 24 },
  entryPoint: { width: 20, height: 20 },
  exitPoint: { width: 20, height: 20 }
};

/**
 * @param {ModdleElement} bo
 *
 * @return {Dimensions}
 */
export function getDefaultSize(bo) {
  if (is(bo, 'uml:Pseudostate')) {
    return DEFAULT_SIZES[bo.kind] || DEFAULT_SIZES.initial;
  }

  return DEFAULT_SIZES[bo.$type] || DEFAULT_SIZES['uml:State'];
}

export { getPathMid, getDefaultLabelBounds } from '../../core/util/GeometryUtil.js';
