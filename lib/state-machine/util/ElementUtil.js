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

/**
 * A state referring to a state machine (UML 2.5.1, State::isSubmachineState),
 * whose states are shown in the state machine's own diagram.
 */
export function isSubmachineState(element) {
  return isState(element) && !!element.businessObject.submachine;
}

/**
 * The name shown for a state: for submachine states its name followed by the
 * name of the state machine referred to, `name : StateMachineName` (UML 2.5.1).
 *
 * @param {ModdleElement} bo
 *
 * @return {string}
 */
export function getStateName(bo) {
  const { name, submachine } = bo;

  return submachine ? `${ name || '' } : ${ submachine.name || '' }` : (name || '');
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

export const NAME_COMPARTMENT_HEIGHT = 26;
export const ACTIVITY_LINE_HEIGHT = 15;

/**
 * @param {Shape} element
 *
 * @return {boolean} whether the state shows a separator line below its name,
 * with entry / do / exit and sub-states below: if added via the wrench (then
 * it is part of the DI), if the state has entry / do / exit, other text kept
 * below its name or sub-states
 */
export function hasCompartment(element) {
  if (!isState(element)) {
    return false;
  }

  const bo = element.businessObject;

  return !!(bo.entry || bo.doActivity || bo.exit) || isComposite(bo) ||
    bo.get('ownedComment').some(comment => comment.body) ||
    !!(element.di && getDiCompartments(element.di).length);
}

/**
 * Compartments of a shape: of state shapes in their `compartment`,
 * of other shapes among the owned elements.
 *
 * @param {ModdleElement} di
 *
 * @return {ModdleElement[]}
 */
export function getDiCompartments(di) {
  return hasCompartments(di)
    ? di.get('compartment')
    : di.get('ownedElement').filter(element => is(element, 'umldi:UMLCompartment'));
}

/**
 * @param {ModdleElement} di
 * @param {ModdleElement[]} compartments
 */
export function setDiCompartments(di, compartments) {
  compartments.forEach(compartment => {
    compartment.$parent = di;
  });

  if (hasCompartments(di)) {
    di.set('compartment', compartments);
  } else {
    di.set('ownedElement', [
      ...di.get('ownedElement').filter(element => !is(element, 'umldi:UMLCompartment')),
      ...compartments
    ]);
  }
}

function hasCompartments(di) {
  return !!di.$descriptor.propertiesByName.compartment;
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
