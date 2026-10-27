import inherits from 'inherits-browser';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';

import { isConnection, isLabel } from '../util/ModelUtil.js';

import { isAnchor, isNote } from './CommentUtil.js';

// before the rules of the diagram types
const HIGH_PRIORITY = 1500;


/**
 * Rules for notes, the same in all diagram types: notes are drawn on the
 * diagram, connected to any element but other notes. Rules for other
 * elements are left to the diagram types.
 */
export default function CommentRules(eventBus, injector) {

  // used by the rules, which RuleProvider adds right away
  this._injector = injector;

  RuleProvider.call(this, eventBus);
}

inherits(CommentRules, RuleProvider);

CommentRules.$inject = [ 'eventBus', 'injector' ];

CommentRules.prototype.init = function() {

  const injector = this._injector;

  this.addRule('shape.create', HIGH_PRIORITY, function(context) {
    if (isNote(context.shape)) {
      return !!context.target && !context.target.parent;
    }
  });

  this.addRule('elements.move', HIGH_PRIORITY, function(context) {
    const shapes = context.shapes.filter(shape => !isLabel(shape));

    if (!shapes.some(isNote)) {
      return;
    }

    // notes stay on the diagram
    if (context.target && context.target.parent) {
      return false;
    }

    if (shapes.every(isNote)) {
      return true;
    }

    // the other shapes as the diagram type allows
    return injector.get('rules').allowed('elements.move', {
      ...context,
      shapes: context.shapes.filter(shape => !isNote(shape))
    });
  });

  this.addRule('shape.resize', HIGH_PRIORITY, function(context) {
    if (isNote(context.shape)) {
      return true;
    }
  });

  this.addRule('connection.create', HIGH_PRIORITY, function(context) {
    return canAnnotate(context.source, context.target);
  });

  this.addRule('connection.reconnect', HIGH_PRIORITY, function(context) {
    if (isAnchor(context.connection)) {
      return canAnnotate(context.source, context.target) || false;
    }

    // other connections do not end at notes
    if (isNote(context.source) || isNote(context.target)) {
      return false;
    }
  });
};

/**
 * @return {{ type: string }|false|undefined} whether the elements can be connected
 * by a line from a note, undefined if no note is involved
 */
export function canAnnotate(source, target) {
  if (!isNote(source) && !isNote(target)) {
    return;
  }

  if (!source || !target || source === target || isLabel(source) || isLabel(target)) {
    return false;
  }

  // a note annotates an element, not another note or a line
  if ((isNote(source) && isNote(target)) || isConnection(source) || isConnection(target)) {
    return false;
  }

  return { type: 'uml:Comment' };
}
