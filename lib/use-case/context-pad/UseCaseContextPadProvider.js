import { isConnection, isLabel } from '../../core/util/ModelUtil.js';

import { isActor, isSubject, isUseCase } from '../util/ElementUtil.js';

import { ICONS } from '../icons.js';


/**
 * Context pad entries for use case diagrams, modeled after bpmn-js:
 *
 *   * append a use case (association from actors, include from use cases)
 *   * append an actor to use cases (association), outside the system boundary
 *   * connect
 *   * change the type of relationships between use cases (replace menu)
 *   * delete
 */
export default function UseCaseContextPadProvider(
    contextPad, modeling, elementFactory,
    connect, create, autoPlace, replaceMenu,
    eventBus, canvas, elementRegistry) {

  this._modeling = modeling;
  this._eventBus = eventBus;
  this._canvas = canvas;
  this._elementRegistry = elementRegistry;
  this._elementFactory = elementFactory;
  this._connect = connect;
  this._create = create;
  this._autoPlace = autoPlace;
  this._replaceMenu = replaceMenu;

  contextPad.registerProvider(this);
}

UseCaseContextPadProvider.$inject = [
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'autoPlace',
  'replaceMenu',
  'eventBus',
  'canvas',
  'elementRegistry'
];

UseCaseContextPadProvider.prototype.getContextPadEntries = function(element) {
  const modeling = this._modeling,
        elementFactory = this._elementFactory,
        connect = this._connect,
        create = this._create,
        autoPlace = this._autoPlace,
        replaceMenu = this._replaceMenu;

  const entries = {};

  if (isLabel(element)) {
    return entries;
  }

  if (isActor(element) || isUseCase(element)) {
    const attrs = { type: 'uml:UseCase', name: 'Use case' };

    entries['append.use-case'] = {
      group: 'model',
      title: isActor(element) ? 'Append use case (association)' : 'Append use case (include)',
      imageUrl: ICONS.useCase,
      action: {
        dragstart: (event, element) => create.start(event, elementFactory.createShape(attrs), { source: element }),
        click: (event, element) => autoPlace.append(element, elementFactory.createShape(attrs))
      }
    };

    if (isUseCase(element)) {
      const actorAttrs = { type: 'uml:Actor', name: 'Actor' };

      entries['append.actor'] = {
        group: 'model',
        title: 'Append actor (association)',
        imageUrl: ICONS.actor,
        action: {
          dragstart: (event, element) => create.start(event, elementFactory.createShape(actorAttrs), { source: element }),
          click: (event, element) => this._appendActor(element, elementFactory.createShape(actorAttrs))
        }
      };
    }

    entries['connect'] = {
      group: 'connect',
      title: 'Connect',
      imageUrl: ICONS.connect,
      action: {
        click: (event, element) => connect.start(event, element),
        dragstart: (event, element) => connect.start(event, element)
      }
    };
  }

  if (replaceMenu.isAvailable(element)) {
    entries['replace'] = {
      group: 'edit',
      title: 'Change element',
      imageUrl: ICONS.replace,
      action: {
        click: (event, element) => replaceMenu.open(element)
      }
    };
  }

  if (isActor(element) || isUseCase(element) || isSubject(element) || isConnection(element)) {
    entries['delete'] = {
      group: 'edit',
      title: 'Delete',
      imageUrl: ICONS.remove,
      action: {
        click: (event, element) => modeling.removeElements([ element ])
      }
    };
  }

  return entries;
};

/**
 * Append an actor to a use case, like AutoPlace#append, but on the diagram:
 * left of the use case, or, if it is in a system boundary, outside of the
 * boundary on the side next to the use case; below other actors there.
 *
 * @param {Shape} useCase
 * @param {Shape} actor
 *
 * @return {Shape} the appended actor
 */
UseCaseContextPadProvider.prototype._appendActor = function(useCase, actor) {
  const eventBus = this._eventBus;

  eventBus.fire('autoPlace.start', { source: useCase, shape: actor });

  const position = getActorPosition(useCase, actor, this._elementRegistry);

  const newShape = this._modeling.appendShape(useCase, actor, position, this._canvas.getRootElement());

  eventBus.fire('autoPlace.end', { source: useCase, shape: newShape });

  return newShape;
};


// helpers //////////

const ACTOR_DISTANCE = 80;
const ACTOR_SPACING = 30;

// space for the name below actors
const LABEL_HEIGHT = 20;

/**
 * @return {Point} the center of an actor appended to the use case
 */
export function getActorPosition(useCase, actor, elementRegistry) {
  const subject = isSubject(useCase.parent) ? useCase.parent : null;

  const center = useCase.x + useCase.width / 2;

  let x;

  if (!subject) {
    x = useCase.x - ACTOR_DISTANCE - actor.width / 2;
  } else if (center - subject.x <= subject.x + subject.width - center) {
    x = subject.x - ACTOR_DISTANCE - actor.width / 2;
  } else {
    x = subject.x + subject.width + ACTOR_DISTANCE + actor.width / 2;
  }

  let y = useCase.y + useCase.height / 2;

  const others = elementRegistry.filter(isActor);

  const overlaps = () => others.some(other => {
    return Math.abs(other.x + other.width / 2 - x) < (other.width + actor.width) / 2 + ACTOR_SPACING &&
      Math.abs(other.y + other.height / 2 - y) < (other.height + actor.height) / 2 + LABEL_HEIGHT;
  });

  while (overlaps()) {
    y += actor.height + LABEL_HEIGHT + ACTOR_SPACING;
  }

  return { x: Math.round(x), y: Math.round(y) };
}
