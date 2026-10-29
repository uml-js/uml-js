import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { getRoot, isLabel } from '../../../core/util/ModelUtil.js';

import {
  findPoint,
  getOtherShapes,
  getPointName,
  getReferencedPoint,
  getUniqueName,
  isConnectionPoint,
  isConnectionPointReference,
  isUsed
} from '../../util/ElementUtil.js';


/**
 * Entry and exit points of the same owner, kind and name, ignoring surrounding
 * whitespace, are the same point, which a diagram may show more than once:
 *
 *   * new points are named entry_1, entry_2, … or exit_1, exit_2, …
 *   * a point created or renamed with the name of another point is shown by its shape
 *     then, the transitions drawn at the shape starting or ending at that point
 *   * renaming one of several shapes of a point gives the shape a point of its own
 *   * a connection point reference renamed refers to the point of the state machine
 *     with that name, else to a new point, not drawn yet
 *   * a point neither drawn nor referred to anymore is removed, e.g. one added with a
 *     reference on a submachine state, when the reference is deleted or refers to another point
 */
export default function ConnectionPointNameBehavior(eventBus, modeling, umlFactory, canvas, injector) {

  CommandInterceptor.call(this, eventBus);

  this.preExecute('shape.create', function(event) {
    const { shape, host, parent } = event.context;

    if (!isConnectionPoint(shape)) {
      return;
    }

    const point = shape.businessObject;

    if (!getPointName(point)) {
      const owner = (host || getRoot(parent)).businessObject;

      point.name = getUniqueName(owner.get('connectionPoint'), point.kind === 'entryPoint' ? 'entry' : 'exit');
    }
  });

  this.postExecuted('shape.create', function(event) {
    const shape = event.context.shape;

    if (!isConnectionPoint(shape)) {
      return;
    }

    const point = shape.businessObject;
    const namesake = findPoint(point.$parent, point.kind, point.name, point);

    if (namesake) {
      modeling.rebindConnectionPoint(shape, namesake);
    }
  });

  this.preExecute('element.updateLabel', function(event) {
    const context = event.context;
    const shape = isLabel(context.element) ? context.element.labelTarget : context.element;

    if (isConnectionPointReference(shape)) {
      return renameReference(shape, context.newLabel);
    }

    if (!isConnectionPoint(shape)) {
      return;
    }

    const point = shape.businessObject;
    const name = (context.newLabel || '').trim();

    if (name === getPointName(point)) {
      return;
    }

    const namesake = findPoint(point.$parent, point.kind, name, point);

    if (namesake) {
      return modeling.rebindConnectionPoint(shape, namesake);
    }

    if (getOtherShapes(shape).length) {
      modeling.rebindConnectionPoint(shape, umlFactory.create('uml:Pseudostate', { kind: point.kind }));
    }
  });

  this.postExecuted('shape.delete', function(event) {
    const shape = event.context.shape;

    if (!isConnectionPointReference(shape)) {
      return;
    }

    removeIfUnused(getReferencedPoint(shape.businessObject));
  });

  function renameReference(reference, newLabel) {
    const point = getReferencedPoint(reference.businessObject);
    const name = (newLabel || '').trim();

    if (!point || !point.$parent || name === getPointName(point)) {
      return;
    }

    // the point of the name, else a new one, not drawn yet
    const namesake = findPoint(point.$parent, point.kind, name, point);

    modeling.rebindConnectionPointReference(reference, namesake || umlFactory.create('uml:Pseudostate', { kind: point.kind }));

    removeIfUnused(point);
  }

  function removeIfUnused(point) {
    if (point && point.$parent && !isUsed(point, getDiagrams())) {
      modeling.removeConnectionPoint(point);
    }
  }

  // all diagrams, with the manager of all diagrams (see lib/uml.js), else the one shown
  function getDiagrams() {
    const umlManager = injector.get('umlManager', false);

    return umlManager ? umlManager.getViews().map(view => view.element) : [ canvas.getRootElement().di ];
  }
}

inherits(ConnectionPointNameBehavior, CommandInterceptor);

ConnectionPointNameBehavior.$inject = [
  'eventBus',
  'modeling',
  'umlFactory',
  'canvas',
  'injector'
];
