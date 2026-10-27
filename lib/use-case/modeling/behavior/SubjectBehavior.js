import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { asTRBL } from 'diagram-js/lib/layout/LayoutUtil.js';

import { isActor, isSubject, isUseCase } from '../../util/ElementUtil.js';

// after Resize computed the new bounds, before ResizePreview shows them
const CLAMP_PRIORITY = 750;

const ACTOR_DISTANCE = 10;


/**
 * Keeps the system boundary (subject) and what it contains consistent
 * with the model:
 *
 *   * resizing stops at actors, which are never inside the subject
 *   * use cases lying inside the subject after resizing become its use cases
 */
export default function SubjectBehavior(eventBus, elementRegistry, modeling) {

  CommandInterceptor.call(this, eventBus);

  eventBus.on('resize.move', CLAMP_PRIORITY, function(event) {
    const context = event.context,
          shape = context.shape;

    if (!isSubject(shape) || !context.newBounds) {
      return;
    }

    const obstacles = elementRegistry.filter(element => isActor(element) || isActorLabel(element));

    context.newBounds = clampBounds(shape, context.newBounds, obstacles);
  });

  this.postExecuted('shape.resize', function(event) {
    const subject = event.context.shape;

    if (!isSubject(subject)) {
      return;
    }

    const useCases = subject.parent.children.filter(element => isUseCase(element) && isInside(element, subject));

    if (useCases.length) {
      modeling.moveElements(useCases, { x: 0, y: 0 }, subject);
    }
  });
}

inherits(SubjectBehavior, CommandInterceptor);

SubjectBehavior.$inject = [
  'eventBus',
  'elementRegistry',
  'modeling'
];


// helpers //////////

function isActorLabel(element) {
  return isActor(element.labelTarget);
}

/**
 * Moves the sides of the new bounds that were dragged across obstacles
 * back in front of them, choosing the side which loses the least area.
 *
 * @param {Bounds} oldBounds
 * @param {Bounds} newBounds
 * @param {Bounds[]} obstacles
 *
 * @return {Bounds}
 */
export function clampBounds(oldBounds, newBounds, obstacles) {
  const old = asTRBL(oldBounds);

  let trbl = asTRBL(newBounds);

  for (const obstacle of obstacles) {
    const o = asTRBL(obstacle);

    // already overlapping, e.g. in an imported diagram
    if (intersects(old, o) || !intersects(trbl, o)) {
      continue;
    }

    const candidates = [];

    if (o.left >= old.right) {
      candidates.push({ ...trbl, right: Math.min(trbl.right, o.left - ACTOR_DISTANCE) });
    }

    if (o.right <= old.left) {
      candidates.push({ ...trbl, left: Math.max(trbl.left, o.right + ACTOR_DISTANCE) });
    }

    if (o.top >= old.bottom) {
      candidates.push({ ...trbl, bottom: Math.min(trbl.bottom, o.top - ACTOR_DISTANCE) });
    }

    if (o.bottom <= old.top) {
      candidates.push({ ...trbl, top: Math.max(trbl.top, o.bottom + ACTOR_DISTANCE) });
    }

    if (candidates.length) {
      trbl = candidates.reduce((best, candidate) => area(candidate) > area(best) ? candidate : best);
    }
  }

  return {
    x: trbl.left,
    y: trbl.top,
    width: trbl.right - trbl.left,
    height: trbl.bottom - trbl.top
  };
}

function intersects(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function area(trbl) {
  return (trbl.right - trbl.left) * (trbl.bottom - trbl.top);
}

function isInside(element, container) {
  return element.x >= container.x &&
    element.y >= container.y &&
    element.x + element.width <= container.x + container.width &&
    element.y + element.height <= container.y + container.height;
}
