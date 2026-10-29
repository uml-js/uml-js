import { getDescendantShapes, hasCrossingConnections, is, isLabel, someElement } from '../../core/util/ModelUtil.js';

export { getDescendantShapes };


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
 * A composite state whose sub-states are not shown in the diagram, but in a
 * diagram of the state, with the composite icon (UML 2.5.1: hidden decomposition).
 */
export function isCollapsed(element) {
  return isState(element) && isComposite(element) &&
    !element.children.some(child => !isLabel(child)) &&
    element.businessObject.get('region').some(region => region.get('subvertex').length);
}

/**
 * The view of the diagram showing the sub-states of a composite state whose
 * decomposition is hidden: a diagram of its state machine (UML DI allows no
 * other model element for state machine diagrams) with the state shown expanded.
 *
 * @param {Manager} manager the manager of all diagrams (see lib/uml.js)
 * @param {ModdleElement} state
 *
 * @return {Object|undefined}
 */
export function getDecompositionView(manager, state) {
  return manager.getViews().find(view => getDecompositionShape(view.element, state));
}

/**
 * @param {ModdleElement} diagram
 * @param {ModdleElement} state
 *
 * @return {ModdleElement|undefined} the shape of a state showing its sub-states in a diagram
 */
export function getDecompositionShape(diagram, state) {
  return diagram.get('ownedElement').find(di => {
    return isShapeDi(di) && di.modelElement[0] === state && di.get('ownedElement').some(isShapeDi);
  });
}

/**
 * A shape of a model element, not a label.
 */
export function isShapeDi(di) {
  return is(di, 'umldi:UMLShape') && !is(di, 'umldi:UMLLabel') && !!(di.modelElement && di.modelElement[0]);
}

/**
 * Whether a composite state can be collapsed: it shows sub-states, and no transitions
 * (nor lines of notes) cross its border, which neither diagram could show then, nor
 * lead through entry or exit points on it.
 */
export function canCollapse(element) {
  if (!isState(element) || !isComposite(element) || isCollapsed(element)) {
    return false;
  }

  return getDescendantShapes(element).length > 0 && !hasCrossingTransitions(element) && !hasCrossingConnections(element) &&
    !hasConnectionPoints(element);
}

/**
 * Whether transitions connect vertices inside a state to vertices outside,
 * which prevents moving its sub-states to a diagram or state machine of their own.
 */
export function hasCrossingTransitions(element) {
  const descendants = getDescendants(element.businessObject);

  return getTransitions(getStateMachine(element.businessObject)).some(transition => {
    return descendants.has(transition.source) !== descendants.has(transition.target);
  });
}

/**
 * Whether any other state than the given one refers to a state machine as submachine.
 *
 * @param {ModdleElement} stateMachine
 * @param {ModdleElement} state
 */
export function isReferredToByOthers(stateMachine, state) {
  let root = stateMachine;

  while (root.$parent) {
    root = root.$parent;
  }

  return someElement(root, element => element !== state && is(element, 'uml:State') && element.submachine === stateMachine);
}



/**
 * The vertices inside a state, at any depth.
 */
function getDescendants(state) {
  const descendants = new Set();

  const add = bo => {
    for (const region of bo.get('region')) {
      for (const vertex of region.get('subvertex')) {
        descendants.add(vertex);

        if (is(vertex, 'uml:State')) {
          add(vertex);
        }
      }
    }
  };

  add(state);

  return descendants;
}

function getStateMachine(bo) {
  while (bo.$parent && !is(bo, 'uml:StateMachine')) {
    bo = bo.$parent;
  }

  return bo;
}

/**
 * The transitions of a state machine or state, at any depth.
 */
function getTransitions(bo) {
  return bo.get('region').flatMap(region => [
    ...region.get('transition'),
    ...region.get('subvertex').filter(vertex => is(vertex, 'uml:State')).flatMap(getTransitions)
  ]);
}


/**
 * A state referring to a state machine (UML 2.5.1, State::isSubmachineState),
 * whose states are shown in the state machine's own diagram.
 */
export function isSubmachineState(element) {
  return isState(element) && !!element.businessObject.submachine;
}

/**
 * @param {Shape} state
 *
 * @return {'simple'|'composite'|'submachine'} the kind of a state
 */
export function getStateKind(state) {
  return isSubmachineState(state) ? 'submachine' : isComposite(state) ? 'composite' : 'simple';
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

/**
 * An entry or exit point of a state machine or composite state (UML 2.5.1),
 * drawn on the border of the composite state, or anywhere in the diagram of the state machine.
 */
export function isConnectionPoint(element) {
  return isPseudostate(element, 'entryPoint') || isPseudostate(element, 'exitPoint');
}

/**
 * A usage of an entry or exit point of the state machine a submachine state
 * refers to, drawn on the border of the submachine state.
 */
export function isConnectionPointReference(element) {
  return is(element, 'uml:ConnectionPointReference') && !isLabel(element);
}

/**
 * @param {Element|ModdleElement} element an entry or exit point, or a reference to one
 *
 * @return {'entryPoint'|'exitPoint'|undefined}
 */
export function getConnectionPointKind(element) {
  const bo = element.businessObject || element;

  if (is(bo, 'uml:ConnectionPointReference')) {
    return bo.get('entry').length ? 'entryPoint' : bo.get('exit').length ? 'exitPoint' : undefined;
  }

  return is(bo, 'uml:Pseudostate') && [ 'entryPoint', 'exitPoint' ].includes(bo.kind) ? bo.kind : undefined;
}

/**
 * @param {ModdleElement} reference
 *
 * @return {ModdleElement|undefined} the entry or exit point a connection point reference refers to
 */
export function getReferencedPoint(reference) {
  return reference.get('entry')[0] || reference.get('exit')[0];
}

/**
 * The name of an entry or exit point; of a reference, the name of the point referred to.
 *
 * @param {ModdleElement} bo
 *
 * @return {string}
 */
export function getConnectionPointName(bo) {
  if (is(bo, 'uml:ConnectionPointReference')) {
    const point = getReferencedPoint(bo);

    return bo.name || (point && point.name) || '';
  }

  return bo.name || '';
}

/**
 * Entry and exit points and references to them are named outside the shape.
 */
export function hasExternalLabel(element) {
  return isConnectionPoint(element) || isConnectionPointReference(element);
}

/**
 * Shapes on the border of states: entry and exit points on composite states,
 * connection point references on submachine states.
 */
export function isBorderVertex(element) {
  return isConnectionPoint(element) || isConnectionPointReference(element);
}

/**
 * The state a vertex dragged over the given element would be attached to:
 * composite states showing their decomposition for entry and exit points,
 * submachine states for connection point references.
 *
 * @param {Shape} shape an entry or exit point, or a connection point reference
 * @param {Element} hover
 *
 * @return {Shape|null}
 */
export function getAttachTarget(shape, hover) {
  if (hover && isLabel(hover)) {
    hover = hover.labelTarget;
  }

  if (hover && isBorderVertex(hover)) {
    hover = hover.host;
  }

  if (!hover || !isState(hover)) {
    return null;
  }

  if (isConnectionPointReference(shape)) {
    return isSubmachineState(hover) ? hover : null;
  }

  return isComposite(hover) && !isSubmachineState(hover) && !isCollapsed(hover) ? hover : null;
}

/**
 * The submachine state an entry or exit point dragged over the given element would
 * be added to, creating it in the state machine referred to (see AddConnectionPointHandler).
 *
 * @param {Shape} shape an entry or exit point
 * @param {Element} hover
 *
 * @return {Shape|null}
 */
export function getSubmachineTarget(shape, hover) {
  if (!isConnectionPoint(shape) || !hover) {
    return null;
  }

  if (isLabel(hover)) {
    hover = hover.labelTarget;
  }

  if (isBorderVertex(hover)) {
    hover = hover.host;
  }

  return hover && isSubmachineState(hover) ? hover : null;
}

/**
 * Whether a state has entry or exit points or connection point references,
 * which changing its kind or hiding its decomposition does not carry over.
 */
export function hasConnectionPoints(element) {
  const bo = element.businessObject || element;

  return bo.get('connectionPoint').length > 0 || bo.get('connection').length > 0;
}

/**
 * The connection point references to an entry or exit point, in any diagram.
 *
 * @param {ModdleElement} point
 *
 * @return {ModdleElement[]}
 */
export function getReferences(point) {
  let root = point;

  while (root.$parent) {
    root = root.$parent;
  }

  const references = [];

  someElement(root, element => {
    if (is(element, 'uml:ConnectionPointReference') && getReferencedPoint(element) === point) {
      references.push(element);
    }

    return false;
  });

  return references;
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

  return !!(bo.entry || bo.doActivity || bo.exit) || (isComposite(bo) && !isCollapsed(element)) ||
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

const CONNECTION_POINT_SIZE = DEFAULT_SIZES.entryPoint;

/**
 * @param {ModdleElement} bo
 *
 * @return {Dimensions}
 */
export function getDefaultSize(bo) {
  if (is(bo, 'uml:Pseudostate')) {
    return DEFAULT_SIZES[bo.kind] || DEFAULT_SIZES.initial;
  }

  if (is(bo, 'uml:ConnectionPointReference')) {
    return CONNECTION_POINT_SIZE;
  }

  return DEFAULT_SIZES[bo.$type] || DEFAULT_SIZES['uml:State'];
}

export { getPathMid, getDefaultLabelBounds } from '../../core/util/GeometryUtil.js';
